"""Pure serialization helpers for durable saved incidents."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from .incidents import Incident
from .storage_codec import deserialize_events, serialize_events
from .trace_evidence import normalize_trace_evidence, trace_evidence_to_dict


def serialize_incidents(incidents: Iterable[Incident]) -> dict[str, Any]:
    """Serialize saved incidents into a Home Assistant Store body."""
    return {
        "incidents": [_incident_to_dict(incident) for incident in incidents],
    }


def deserialize_incidents(data: object) -> tuple[Incident, ...]:
    """Deserialize valid incidents while skipping malformed records."""
    if not isinstance(data, Mapping):
        return ()

    raw_incidents = data.get("incidents")
    if not isinstance(raw_incidents, list):
        return ()

    incidents: list[Incident] = []
    for raw_incident in raw_incidents:
        try:
            incidents.append(_incident_from_dict(raw_incident))
        except (KeyError, TypeError, ValueError):
            continue

    return tuple(incidents)


def _incident_to_dict(incident: Incident) -> dict[str, Any]:
    return {
        "incident_id": incident.incident_id,
        "title": incident.title,
        "created_at": incident.created_at,
        "target_event_id": incident.target_event_id,
        "window_start": incident.window_start,
        "window_end": incident.window_end,
        "events": serialize_events(incident.events)["events"],
        "trace_evidence": trace_evidence_to_dict(incident.trace_evidence),
    }


def _incident_from_dict(raw: object) -> Incident:
    if not isinstance(raw, Mapping):
        raise TypeError("stored incident must be a mapping")

    events = deserialize_events({"events": raw["events"]})
    target_event_id = _required_string(raw, "target_event_id")
    if not any(event.event_id == target_event_id for event in events):
        raise ValueError("stored incident target event is missing")

    return Incident(
        incident_id=_required_string(raw, "incident_id"),
        title=_required_string(raw, "title"),
        created_at=float(raw["created_at"]),
        target_event_id=target_event_id,
        window_start=float(raw["window_start"]),
        window_end=float(raw["window_end"]),
        events=events,
        trace_evidence=normalize_trace_evidence(raw.get("trace_evidence")),
    )


def _required_string(raw: Mapping[str, Any], key: str) -> str:
    value = raw[key]
    if not isinstance(value, str) or not value:
        raise TypeError(f"{key} must be a non-empty string")
    return value
