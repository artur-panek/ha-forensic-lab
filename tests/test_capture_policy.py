"""Tests for capture filtering and restored-snapshot policy."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
PACKAGE = "ha_forensic_lab_capture_policy_test"


def _load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


package = ModuleType(PACKAGE)
package.__path__ = [str(INTEGRATION)]
sys.modules[PACKAGE] = package

const = _load_module(f"{PACKAGE}.const", INTEGRATION / "const.py")
models = _load_module(f"{PACKAGE}.models", INTEGRATION / "models.py")
policy_module = _load_module(
    f"{PACKAGE}.capture_policy",
    INTEGRATION / "capture_policy.py",
)


def _event(
    event_id: str,
    *,
    kind: str = "state_changed",
    entity_id: str | None = None,
    domain: str | None = None,
    targets: tuple[str, ...] = (),
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
