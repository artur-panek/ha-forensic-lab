"""Tests for saved forensic incident creation."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
PACKAGE = "ha_forensic_lab_incident_test"


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
incidents = _load_module(f"{PACKAGE}.incidents", INTEGRATION / "incidents.py")


def _event(event_id: str, timestamp: float):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=timestamp,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        entity_id="light.hallway",
    )


def test_create_incident_freezes_requested_window() -> None:
    events = (
        _event("e1", 100.0),
        _event("e2", 200.0),
        _event("e3", 250.0),
        _event("e4", 400.0),
    )

    incident = incidents.create_incident(
        events,
        "e2",
        before_seconds=110,
        after_seconds=60,
        incident_id="incident-1",
        created_at=999.0,
    )

    assert incident.incident_id == "incident-1"
    assert incident.target_event_id == "e2"
    assert incident.window_start == 90.0
    assert incident.window_end == 260.0
    assert [event.event_id for event in incident.events] == ["e1", "e2", "e3"]
    assert incident.event_count == 3


def test_create_incident_preserves_custom_title() -> None:
    incident = incidents.create_incident(
        (_event("e1", 100.0),),
        "e1",
        title="  Hallway mystery  ",
    )

    assert incident.title == "Hallway mystery"


def test_create_incident_rejects_oversized_window_result() -> None:
    events = tuple(_event(f"e{index}", float(index)) for index in range(5))

    try:
        incidents.create_incident(
            events,
            "e2",
            before_seconds=10,
            after_seconds=10,
            max_events=2,
        )
    except incidents.IncidentTooLarge as error:
        assert "limit is 2" in str(error)
    else:
        raise AssertionError("Expected IncidentTooLarge")


def test_create_incident_rejects_unknown_target() -> None:
    try:
        incidents.create_incident((_event("known", 1.0),), "missing")
    except KeyError as error:
        assert error.args == ("missing",)
    else:
        raise AssertionError("Expected KeyError")


def test_create_incident_rejects_title_over_limit() -> None:
    try:
        incidents.create_incident(
            (_event("e1", 1.0),),
            "e1",
            title="x" * (incidents.MAX_INCIDENT_TITLE_LENGTH + 1),
        )
    except ValueError as error:
        assert "title exceeds" in str(error)
    else:
        raise AssertionError("Expected ValueError")
