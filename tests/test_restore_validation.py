"""Reject corrupt timestamps without losing valid neighboring records."""

import pytest

from tests.support import load_module

models = load_module("models")
incidents = load_module("incidents")
event_codec = load_module("storage_codec")
incident_codec = load_module("incident_codec")


def _event():
    return models.ForensicEvent(
        event_id="target",
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=10.0,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        entity_id="light.test",
        old_state="off",
        new_state="on",
    )


def _incident():
    return incidents.create_incident(
        (_event(),), "target", incident_id="valid", created_at=20.0
    )


@pytest.mark.parametrize("timestamp", [10**400, -(10**400)])
def test_event_restore_skips_overflowing_timestamp(timestamp):
    valid = event_codec.serialize_events((_event(),))["events"][0]
    invalid = {**valid, "event_id": "invalid", "timestamp": timestamp}

    restored = event_codec.deserialize_events({"events": [invalid, valid]})

    assert restored == (_event(),)


@pytest.mark.parametrize("field", ["created_at", "window_start", "window_end"])
@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf"), 10**400])
def test_incident_restore_skips_non_finite_timestamps(field, value):
    original = _incident()
    valid = incident_codec.serialize_incidents((original,))["incidents"][0]
    invalid = {**valid, "incident_id": "invalid", field: value}

    restored = incident_codec.deserialize_incidents({"incidents": [invalid, valid]})

    assert restored == (original,)


def test_incident_restore_rejects_reversed_window():
    original = _incident()
    valid = incident_codec.serialize_incidents((original,))["incidents"][0]
    invalid = {**valid, "incident_id": "invalid", "window_start": 80.0}

    restored = incident_codec.deserialize_incidents({"incidents": [invalid, valid]})

    assert restored == (original,)


def test_incident_restore_preserves_zero_width_window():
    original = incidents.create_incident(
        (_event(),), "target", before_seconds=0, after_seconds=0, created_at=20.0
    )

    restored = incident_codec.deserialize_incidents(
        incident_codec.serialize_incidents((original,))
    )

    assert restored == (original,)
