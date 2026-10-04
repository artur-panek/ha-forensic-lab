"""Tests for durable incident serialization."""

from __future__ import annotations

from tests.support import load_module

models = load_module("models")
incidents = load_module("incidents")
codec = load_module("incident_codec")


def _incident():
    event = models.ForensicEvent(
        event_id="session-a:00000001",
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=10.0,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        entity_id="light.hallway",
        old_state="off",
        new_state="on",
    )
    return incidents.Incident(
        incident_id="incident-1",
        title="Hallway mystery",
        created_at=20.0,
        target_event_id=event.event_id,
        window_start=0.0,
        window_end=70.0,
        events=(event,),
    )


def test_incident_round_trip_preserves_frozen_evidence() -> None:
    original = (_incident(),)

    stored = codec.serialize_incidents(original)
    restored = codec.deserialize_incidents(stored)

    assert restored == original


def test_incident_deserializer_skips_missing_target() -> None:
    valid = codec.serialize_incidents((_incident(),))["incidents"][0]
    invalid = dict(valid)
    invalid["target_event_id"] = "missing"

    restored = codec.deserialize_incidents({"incidents": [invalid, valid]})

    assert [incident.incident_id for incident in restored] == ["incident-1"]


def test_incident_deserializer_rejects_non_list_container() -> None:
    assert codec.deserialize_incidents(None) == ()
    assert codec.deserialize_incidents({"incidents": "bad"}) == ()
