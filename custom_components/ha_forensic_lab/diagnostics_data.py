"""Privacy-safe runtime diagnostics payload construction."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Protocol

from .const import (
    CONF_CAPTURE_BUFFER_SIZE,
    CONF_CAPTURE_EVENT_KINDS,
    CONF_EXCLUDED_DOMAINS,
    CONF_EXCLUDED_ENTITIES,
    CONF_PERSIST_INTERVAL_SECONDS,
    DEFAULT_CAPTURE_BUFFER_SIZE,
    DEFAULT_PERSIST_INTERVAL_SECONDS,
)
from .models import ForensicEventKind


class CaptureDiagnosticsSource(Protocol):
    """Minimal capture shape needed for aggregate diagnostics."""

    @property
    def events(self) -> tuple[Any, ...]:
        """Return retained events."""

    @property
    def max_events(self) -> int:
        """Return rolling capacity."""

    @property
    def diagnostics(self) -> Mapping[str, Any]:
        """Return aggregate capture counters."""


class StoreDiagnosticsSource(Protocol):
    """Minimal rolling-store shape needed for aggregate diagnostics."""

    @property
    def diagnostics(self) -> Mapping[str, Any]:
        """Return aggregate persistence counters."""


class IncidentStoreDiagnosticsSource(Protocol):
    """Minimal saved-incident shape needed for aggregate diagnostics."""

    @property
    def incidents(self) -> tuple[Any, ...]:
        """Return saved incidents."""


def build_runtime_diagnostics(
    options: Mapping[str, Any],
    *,
    capture: CaptureDiagnosticsSource | None,
    store: StoreDiagnosticsSource | None,
    incident_store: IncidentStoreDiagnosticsSource | None,
) -> dict[str, Any]:
    """Build diagnostics without exposing forensic evidence or identifiers."""
    default_kinds = [kind.value for kind in ForensicEventKind]
    enabled_kinds = list(options.get(CONF_CAPTURE_EVENT_KINDS, default_kinds))

    rolling_size = len(capture.events) if capture is not None else 0
    rolling_capacity = (
        capture.max_events
        if capture is not None
        else int(options.get(CONF_CAPTURE_BUFFER_SIZE, DEFAULT_CAPTURE_BUFFER_SIZE))
    )

    incidents = incident_store.incidents if incident_store is not None else ()
    frozen_events = sum(
        int(getattr(incident, "event_count", 0)) for incident in incidents
    )
    incidents_with_trace = sum(
        getattr(incident, "trace_evidence", None) is not None
        for incident in incidents
    )

    return {
        "schema_version": 1,
        "config": {
            "capture_buffer_size": int(
                options.get(
                    CONF_CAPTURE_BUFFER_SIZE,
                    DEFAULT_CAPTURE_BUFFER_SIZE,
                )
            ),
            "persist_interval_seconds": int(
                options.get(
                    CONF_PERSIST_INTERVAL_SECONDS,
                    DEFAULT_PERSIST_INTERVAL_SECONDS,
                )
            ),
            "enabled_event_kinds": enabled_kinds,
            "excluded_entity_count": len(
                options.get(CONF_EXCLUDED_ENTITIES, [])
            ),
            "excluded_domain_count": len(
                options.get(CONF_EXCLUDED_DOMAINS, [])
            ),
        },
        "rolling_buffer": {
            "events": rolling_size,
            "capacity": rolling_capacity,
            "utilization_percent": round(
                (rolling_size / rolling_capacity) * 100,
                3,
            )
            if rolling_capacity
            else 0.0,
        },
        "capture": dict(capture.diagnostics) if capture is not None else None,
        "persistence": dict(store.diagnostics) if store is not None else None,
        "saved_incidents": {
            "count": len(incidents),
            "frozen_events": frozen_events,
            "with_trace_evidence": incidents_with_trace,
        },
    }
