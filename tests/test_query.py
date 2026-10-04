"""Tests for forensic timeline query helpers."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"


def _load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


models = _load_module("ha_forensic_lab_test_models", INTEGRATION / "models.py")
query = _load_module("ha_forensic_lab_test_query", INTEGRATION / "query.py")


def _event(
    sequence: int,
    *,
    kind: str = "state_changed",
    entity_id: str | None = None,
    context_id: str | None = None,
    parent_context_id: str | None = None,
    targets: tuple[str, ...] = (),
    timestamp: float | None = None,
):
    return models.ForensicEvent(
        event_id=f"event-{sequence}",
        kind=models.ForensicEventKind(kind),
        timestamp=float(sequence if timestamp is None else timestamp),
        context_id=context_id,
        parent_context_id=parent_context_id,
        user_id=None,
        entity_id=entity_id,
        target_entity_ids=targets,
    )


def test_query_returns_newest_first_and_honors_limit() -> None:
    events = tuple(_event(index) for index in range(1, 6))

    result = query.query_events(events, limit=3)

    assert [event.event_id for event in result] == ["event-5", "event-4", "event-3"]


def test_entity_filter_matches_primary_and_service_targets() -> None:
    events = (
        _event(1, entity_id="light.kitchen"),
        _event(
            2,
            kind="call_service",
            targets=("light.kitchen", "light.hallway"),
        ),
        _event(3, entity_id="sensor.outdoor"),
    )

    result = query.query_events(events, entity_id="light.kitchen")

    assert [event.event_id for event in result] == ["event-2", "event-1"]


def test_context_filter_matches_context_and_parent_context() -> None:
    events = (
        _event(1, context_id="root"),
        _event(2, context_id="child", parent_context_id="root"),
        _event(3, context_id="other"),
    )

    result = query.query_events(events, context_id="root")

    assert [event.event_id for event in result] == ["event-2", "event-1"]


def test_kind_and_since_filters_can_be_combined() -> None:
    events = (
        _event(1, timestamp=10),
        _event(2, kind="automation_triggered", timestamp=20),
        _event(3, kind="automation_triggered", timestamp=30),
    )

    result = query.query_events(
        events,
        kind="automation_triggered",
        since=25,
    )

    assert [event.event_id for event in result] == ["event-3"]


def test_serialization_is_frontend_safe() -> None:
    event = models.ForensicEvent(
        event_id="event-1",
        kind=models.ForensicEventKind.CALL_SERVICE,
        timestamp=1.0,
        context_id="ctx",
        parent_context_id=None,
        user_id="user",
        domain="light",
        service="turn_on",
        target_entity_ids=("light.kitchen",),
    )

    result = query.event_to_dict(event)

    assert result["kind"] == "call_service"
    assert result["target_entity_ids"] == ["light.kitchen"]
