"""Tests for the pure rolling-storage codec."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
PACKAGE = "ha_forensic_lab_storage_test"


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

models = _load_module(f"{PACKAGE}.models", INTEGRATION / "models.py")
codec = _load_module(f"{PACKAGE}.storage_codec", INTEGRATION / "storage_codec.py")


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
