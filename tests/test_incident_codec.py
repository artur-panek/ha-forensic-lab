"""Tests for durable incident serialization."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
PACKAGE = "ha_forensic_lab_incident_codec_test"


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
storage_codec = _load_module(
    f"{PACKAGE}.storage_codec",
    INTEGRATION / "storage_codec.py",
)
incidents = _load_module(f"{PACKAGE}.incidents", INTEGRATION / "incidents.py")
codec = _load_module(
    f"{PACKAGE}.incident_codec",
    INTEGRATION / "incident_codec.py",
)


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
