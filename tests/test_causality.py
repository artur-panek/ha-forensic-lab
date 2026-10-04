"""Tests for deterministic context-chain reconstruction."""

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


models = _load_module("ha_forensic_lab_causality_models", INTEGRATION / "models.py")
causality = _load_module("ha_forensic_lab_causality", INTEGRATION / "causality.py")


def _event(
    event_id: str,
    sequence: int,
    *,
    kind: str = "state_changed",
    entity_id: str | None = None,
    context_id: str | None,
    parent_context_id: str | None = None,
):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind(kind),
        timestamp=float(sequence),
        context_id=context_id,
        parent_context_id=parent_context_id,
        user_id=None,
        entity_id=entity_id,
    )


def test_explain_reconstructs_parent_context_and_same_context_sequence() -> None:
    events = (
        _event(
            "motion",
            1,
            entity_id="binary_sensor.hall_motion",
            context_id="ctx-trigger",
        ),
        _event(
            "automation",
            2,
            kind="automation_triggered",
            entity_id="automation.hallway_lights",
            context_id="ctx-automation",
            parent_context_id="ctx-trigger",
        ),
        _event(
            "service",
            3,
            kind="call_service",
            context_id="ctx-automation",
            parent_context_id="ctx-trigger",
        ),
        _event(
            "light",
            4,
            entity_id="light.hallway",
            context_id="ctx-automation",
            parent_context_id="ctx-trigger",
        ),
    )

    result = causality.explain_event(events, "light")

    assert [event.event_id for event in result.events] == [
        "motion",
        "automation",
        "service",
        "light",
    ]
    assert [
        (
            edge.source_event_id,
            edge.target_event_id,
            edge.evidence_type.value,
        )
        for edge in result.edges
    ] == [
        ("motion", "automation", "parent_context"),
        ("automation", "service", "same_context_sequence"),
        ("service", "light", "same_context_sequence"),
    ]
    assert result.complete is True


def test_same_context_sequence_does_not_claim_direct_causation() -> None:
    events = (
        _event("service", 1, kind="call_service", context_id="ctx"),
        _event("light", 2, entity_id="light.hallway", context_id="ctx"),
    )

    result = causality.explain_event(events, "light")

    assert len(result.edges) == 1
    assert result.edges[0].evidence_class.value == "confirmed"
    assert result.edges[0].evidence_type.value == "same_context_sequence"


def test_missing_parent_context_is_reported_as_gap() -> None:
    events = (
        _event(
            "automation",
            1,
            kind="automation_triggered",
            context_id="ctx-child",
            parent_context_id="ctx-missing",
        ),
        _event(
            "light",
            2,
            entity_id="light.hallway",
            context_id="ctx-child",
            parent_context_id="ctx-missing",
        ),
    )

    result = causality.explain_event(events, "light")

    assert result.complete is False
    assert result.gaps == ("parent_context_not_in_buffer:ctx-missing",)


def test_missing_target_context_is_reported_without_guessing() -> None:
    events = (
        _event(
            "light",
            1,
            entity_id="light.hallway",
            context_id=None,
        ),
    )

    result = causality.explain_event(events, "light")

    assert [event.event_id for event in result.events] == ["light"]
    assert result.edges == ()
    assert result.gaps == ("target_context_missing",)


def test_unknown_target_raises_key_error() -> None:
    events = (
        _event("known", 1, context_id="ctx"),
    )

    try:
        causality.explain_event(events, "missing")
    except KeyError as error:
        assert error.args == ("missing",)
    else:
        raise AssertionError("Expected KeyError")


def test_event_limit_is_explicitly_reported() -> None:
    events = tuple(
        _event(f"event-{index}", index, context_id="ctx")
        for index in range(1, 6)
    )

    result = causality.explain_event(events, "event-5", max_events=2)

    assert [event.event_id for event in result.events] == ["event-4", "event-5"]
    assert result.gaps == ("event_limit_reached",)
    assert result.complete is False
