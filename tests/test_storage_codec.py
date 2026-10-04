"""Tests for the pure rolling-storage codec."""

from __future__ import annotations

from tests.support import load_module

models = load_module("models")
codec = load_module("storage_codec")


def _event(event_id: str):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=123.5,
        context_id="ctx",
        parent_context_id="parent",
        user_id="user",
        entity_id="light.hallway",
        domain="light",
        old_state="off",
        new_state="on",
    )


def test_storage_round_trip_preserves_normalized_event() -> None:
    original = (_event("session-a:00000001"),)

    stored = codec.serialize_events(original)
    restored = codec.deserialize_events(stored)

    assert restored == original


def test_deserializer_skips_malformed_entries() -> None:
    valid = codec.serialize_events((_event("session-a:00000001"),))["events"][0]
    stored = {
        "events": [
            {"event_id": "", "kind": "state_changed", "timestamp": 1},
            {"event_id": "bad-kind", "kind": "future_kind", "timestamp": 2},
            {
                "event_id": "bad-targets",
                "kind": "call_service",
                "timestamp": 3,
                "target_entity_ids": "light.hallway",
            },
            valid,
        ]
    }

    restored = codec.deserialize_events(stored)

    assert [event.event_id for event in restored] == ["session-a:00000001"]


def test_deserializer_rejects_non_event_container() -> None:
    assert codec.deserialize_events(None) == ()
    assert codec.deserialize_events({"events": "not-a-list"}) == ()
