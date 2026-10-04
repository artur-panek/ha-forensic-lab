"""Tests for capture filtering and restored-snapshot policy."""

from __future__ import annotations

import pytest

from tests.support import load_module

const = load_module("const")
models = load_module("models")
policy_module = load_module("capture_policy")


def _event(
    event_id: str,
    *,
    kind: str = "state_changed",
    entity_id: str | None = None,
    domain: str | None = None,
    targets: tuple[str, ...] = (),
    old_state: str | None = None,
    new_state: str | None = None,
):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind(kind),
        timestamp=1.0,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        entity_id=entity_id,
        domain=domain,
        target_entity_ids=targets,
        old_state=old_state,
        new_state=new_state,
    )


def test_disabled_event_kind_is_dropped() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_CAPTURE_EVENT_KINDS: ["state_changed"],
        }
    )

    assert policy.apply(_event("service", kind="call_service", domain="light")) is None
    assert policy.apply(_event("state", entity_id="light.hallway", domain="light"))


def test_excluded_entity_is_dropped_before_retention() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_EXCLUDED_ENTITIES: ["light.secret_room"],
        }
    )

    assert (
        policy.apply(
            _event(
                "secret",
                entity_id="light.secret_room",
                domain="light",
            )
        )
        is None
    )


def test_excluded_domain_is_casefolded_and_dropped() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_EXCLUDED_DOMAINS: [" Camera "],
        }
    )

    assert (
        policy.apply(
            _event(
                "camera",
                entity_id="camera.front_door",
                domain="camera",
            )
        )
        is None
    )


def test_service_targets_are_filtered_without_dropping_allowed_targets() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_EXCLUDED_ENTITIES: ["light.secret_room"],
            const.CONF_EXCLUDED_DOMAINS: ["camera"],
        }
    )
    event = _event(
        "service",
        kind="call_service",
        domain="homeassistant",
        targets=(
            "light.hallway",
            "light.secret_room",
            "camera.front_door",
        ),
    )

    result = policy.apply(event)

    assert result is not None
    assert result.target_entity_ids == ("light.hallway",)


def test_service_with_only_excluded_targets_is_dropped() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_EXCLUDED_DOMAINS: ["camera"],
        }
    )

    result = policy.apply(
        _event(
            "service",
            kind="call_service",
            domain="homeassistant",
            targets=("camera.front_door",),
        )
    )

    assert result is None


def test_restored_snapshot_is_re_filtered_after_options_change() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_EXCLUDED_DOMAINS: ["camera"],
        }
    )
    events = (
        _event("light", entity_id="light.hallway", domain="light"),
        _event("camera", entity_id="camera.front_door", domain="camera"),
    )

    filtered = policy.filter_snapshot(events)

    assert [event.event_id for event in filtered] == ["light"]


def test_empty_kind_selection_disables_capture_without_falling_back() -> None:
    policy = policy_module.CapturePolicy.from_options(
        {
            const.CONF_CAPTURE_EVENT_KINDS: [],
        }
    )

    assert policy.enabled_kinds == frozenset()
    assert (
        policy.apply(_event("state", entity_id="light.hallway", domain="light"))
        is None
    )


@pytest.mark.parametrize(
    ("old", "new", "include_unchanged", "retained"),
    [
        ("playing", "playing", False, False),
        ("50", "50", False, False),
        ("unknown", "unknown", False, False),
        ("playing", "playing", True, True),
        ("50", "51", False, True),
        ("unavailable", "on", False, True),
        (None, "on", False, True),
        ("on", None, False, True),
    ],
)
def test_unchanged_state_policy_preserves_transitions_and_lifecycle(
    old, new, include_unchanged, retained
):
    policy = policy_module.CapturePolicy.from_options(
        {const.CONF_CAPTURE_UNCHANGED_STATES: include_unchanged}
    )
    event = _event("state", old_state=old, new_state=new)
    decision = policy.evaluate(event)

    if retained:
        assert decision.event is event
        assert decision.drop_reason is None
    else:
        assert decision.event is None
        assert decision.drop_reason.value == "unchanged_state"


def test_default_policy_removes_unchanged_updates_from_restored_buffer():
    unchanged = _event("unchanged", old_state="50", new_state="50")
    changed = _event("changed", old_state="50", new_state="51")
    policy = policy_module.CapturePolicy.from_options({})

    assert policy.filter_snapshot((unchanged, changed)) == (changed,)
