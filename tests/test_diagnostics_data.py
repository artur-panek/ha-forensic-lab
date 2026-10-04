"""Tests for privacy-safe aggregate diagnostics payloads."""

from __future__ import annotations

import json
from dataclasses import dataclass

from tests.support import load_module

const = load_module("const")
diagnostics = load_module("diagnostics_data")
models = load_module("models")


@dataclass
class FakeCapture:
    events: tuple[models.ForensicEvent, ...]
    max_events: int
    diagnostics: dict[str, int | float]


@dataclass
class FakeStore:
    diagnostics: dict[str, int | float | bool]


@dataclass
class FakeIncident:
    event_count: int
    trace_evidence: object | None = None
    incident_id: str = "secret-incident-id"


@dataclass
class FakeIncidentStore:
    incidents: tuple[FakeIncident, ...]


def test_diagnostics_contains_aggregates_but_not_private_filter_values() -> None:
    options = {
        const.CONF_CAPTURE_BUFFER_SIZE: 4096,
        const.CONF_PERSIST_INTERVAL_SECONDS: 15,
        const.CONF_CAPTURE_EVENT_KINDS: ["state_changed", "call_service"],
        const.CONF_EXCLUDED_ENTITIES: [
            "camera.private_bedroom",
            "person.secret_name",
        ],
        const.CONF_EXCLUDED_DOMAINS: ["device_tracker"],
    }
    capture = FakeCapture(
        events=tuple(
            models.ForensicEvent(
                event_id="secret-event-id",
                kind=models.ForensicEventKind.STATE_CHANGED,
                timestamp=1_800_000_000 + index,
                context_id=None,
                parent_context_id=None,
                user_id=None,
            )
            for index in range(12)
        ),
        max_events=4096,
        diagnostics={
            "observed_events": 30,
            "retained_events": 12,
            "handler_average_ms": 0.2,
        },
    )
    store = FakeStore(
        diagnostics={
            "completed_writes": 3,
            "failed_writes": 0,
            "pending_save": False,
        }
    )
    incident_store = FakeIncidentStore(
        incidents=(
            FakeIncident(event_count=10, trace_evidence=object()),
            FakeIncident(event_count=4),
        )
    )

    result = diagnostics.build_runtime_diagnostics(
        options,
        capture=capture,
        store=store,
        incident_store=incident_store,
        integration_version="0.1.0-alpha.1",
    )
    serialized = json.dumps(result, sort_keys=True)

    assert result["integration"]["version"] == "0.1.0-alpha.1"
    assert result["config"]["capture_buffer_size"] == 4096
    assert result["config"]["excluded_entity_count"] == 2
    assert result["config"]["excluded_domain_count"] == 1
    assert result["rolling_buffer"]["events"] == 12
    assert result["rolling_buffer"]["retained_span_seconds"] == 11
    assert result["config"]["capture_unchanged_states"] is False
    assert result["saved_incidents"]["count"] == 2
    assert result["saved_incidents"]["frozen_events"] == 14
    assert result["saved_incidents"]["with_trace_evidence"] == 1

    for secret in (
        "camera.private_bedroom",
        "person.secret_name",
        "device_tracker",
        "secret-event-id",
        "secret-incident-id",
        "1800000000",
    ):
        assert secret not in serialized


def test_diagnostics_handles_unloaded_runtime() -> None:
    result = diagnostics.build_runtime_diagnostics(
        {},
        capture=None,
        store=None,
        incident_store=None,
        integration_version=None,
    )

    assert result["integration"]["version"] is None
    assert result["rolling_buffer"]["events"] == 0
    assert result["rolling_buffer"]["retained_span_seconds"] == 0
    assert result["capture"] is None
    assert result["persistence"] is None
    assert result["saved_incidents"]["count"] == 0
