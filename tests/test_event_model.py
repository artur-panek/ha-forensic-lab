"""Tests for the pure forensic event normalization model."""

from __future__ import annotations

import importlib.util
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any

ROOT = Path(__file__).parents[1]
MODEL_PATH = ROOT / "custom_components" / "ha_forensic_lab" / "models.py"


def _load_models() -> ModuleType:
    spec = importlib.util.spec_from_file_location("ha_forensic_lab_models", MODEL_PATH)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


models = _load_models()


@dataclass
class FakeContext:
    id: str = "01CTX"
    parent_id: str | None = "01PARENT"
    user_id: str | None = "user-1"


@dataclass
class FakeState:
    state: str


@dataclass
class FakeEvent:
    event_type: str
    data: dict[str, Any]
    time_fired_timestamp: float = 123.25
    context: FakeContext = field(default_factory=FakeContext)


def test_state_changed_keeps_minimal_forensic_metadata() -> None:
    event = FakeEvent(
        "state_changed",
        {
            "entity_id": "light.hallway",
            "old_state": FakeState("off"),
            "new_state": FakeState("on"),
        },
    )

    result = models.normalize_event(event, 7)

    assert result is not None
    assert result.kind == models.ForensicEventKind.STATE_CHANGED
    assert result.event_id == "123.250000:00000007"
    assert result.entity_id == "light.hallway"
    assert result.domain == "light"
    assert result.old_state == "off"
    assert result.new_state == "on"
    assert result.context_id == "01CTX"
    assert result.parent_context_id == "01PARENT"
    assert result.user_id == "user-1"


def test_service_call_extracts_targets_without_copying_payload() -> None:
    event = FakeEvent(
        "call_service",
        {
            "domain": "light",
            "service": "turn_on",
            "service_data": {
                "entity_id": ["light.kitchen", "light.hallway"],
                "brightness": 255,
                "message": "do not retain me",
            },
        },
    )

    result = models.normalize_event(event, 8)

    assert result is not None
    assert result.kind == models.ForensicEventKind.CALL_SERVICE
    assert result.domain == "light"
    assert result.service == "turn_on"
    assert result.target_entity_ids == ("light.kitchen", "light.hallway")
    assert not hasattr(result, "service_data")


def test_automation_keeps_source_and_identity() -> None:
    event = FakeEvent(
        "automation_triggered",
        {
            "entity_id": "automation.hallway_lights",
            "name": "Hallway lights",
            "source": "state of binary_sensor.hall_motion",
        },
    )

    result = models.normalize_event(event, 9)

    assert result is not None
    assert result.kind == models.ForensicEventKind.AUTOMATION_TRIGGERED
    assert result.entity_id == "automation.hallway_lights"
    assert result.domain == "automation"
    assert result.name == "Hallway lights"
    assert result.source == "state of binary_sensor.hall_motion"


def test_script_started_keeps_identity() -> None:
    event = FakeEvent(
        "script_started",
        {
            "entity_id": "script.movie_mode",
            "name": "Movie mode",
        },
    )

    result = models.normalize_event(event, 10)

    assert result is not None
    assert result.kind == models.ForensicEventKind.SCRIPT_STARTED
    assert result.entity_id == "script.movie_mode"
    assert result.name == "Movie mode"


def test_unsupported_events_are_ignored() -> None:
    event = FakeEvent("some_future_event", {"secret": "value"})

    assert models.normalize_event(event, 11) is None
