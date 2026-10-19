"""Distinguish an empty entity state from a missing State object."""

from types import SimpleNamespace

import pytest

from tests.support import load_module

models = load_module("models")
policy = load_module("capture_policy")
codec = load_module("storage_codec")
incidents = load_module("incidents")
incident_codec = load_module("incident_codec")
sanitizer = load_module("sanitizer")


def _event(old_state, new_state):
    event = SimpleNamespace(
        event_type="state_changed",
        data={
            "entity_id": "input_text.note",
            "old_state": (
                SimpleNamespace(state=old_state) if old_state is not None else None
            ),
            "new_state": (
                SimpleNamespace(state=new_state) if new_state is not None else None
            ),
        },
        context=SimpleNamespace(id="context", parent_id=None, user_id=None),
        time_fired_timestamp=10.0,
    )
    return models.normalize_event(event, 1, "session")


@pytest.mark.parametrize(
    ("old_state", "new_state"),
    [("note", ""), ("", "note"), (None, ""), ("", None)],
)
def test_empty_state_transitions_survive_capture_and_restore(old_state, new_state):
    event = _event(old_state, new_state)

    assert event.old_state == old_state
    assert event.new_state == new_state
    assert policy.CapturePolicy().apply(event) is event
    assert codec.deserialize_events(codec.serialize_events((event,))) == (event,)


@pytest.mark.parametrize("capture_unchanged", [False, True])
def test_empty_state_attribute_updates_follow_capture_policy(capture_unchanged):
    event = _event("", "")
    capture_policy = policy.CapturePolicy(capture_unchanged_states=capture_unchanged)

    decision = capture_policy.evaluate(event)

    if capture_unchanged:
        assert decision.event is event
        assert event.old_state == event.new_state == ""
    else:
        assert decision.event is None
        assert decision.drop_reason.value == "unchanged_state"


def test_saved_incident_keeps_empty_state_and_export_redacts_it():
    event = _event("private note", "")
    incident = incidents.create_incident((event,), event.event_id, created_at=20.0)

    (restored,) = incident_codec.deserialize_incidents(
        incident_codec.serialize_incidents((incident,))
    )

    assert restored.events[0].new_state == ""
    exported = sanitizer.sanitize_incident(restored)["incident"]["events"][0]
    assert exported["old_state"] == exported["new_state"] == sanitizer.REDACTED


@pytest.mark.parametrize("value", [7, False, {"token": "secret"}])
def test_non_string_states_are_still_ignored(value):
    assert _event("note", value).new_state is None
