"""Saved incident model and bounded-window creation rules."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from time import time
from uuid import uuid4

from .models import ForensicEvent
from .trace_evidence import TraceEvidence

DEFAULT_INCIDENT_BEFORE_SECONDS = 300.0
DEFAULT_INCIDENT_AFTER_SECONDS = 60.0
MAX_INCIDENT_WINDOW_SECONDS = 3600.0
MAX_INCIDENT_EVENTS = 500
MAX_INCIDENT_TITLE_LENGTH = 120


class IncidentTooLarge(ValueError):
    """Raised when a requested incident contains too many events."""


@dataclass(frozen=True, slots=True)
class Incident:
    """A durable frozen slice of normalized forensic evidence."""

    incident_id: str
    title: str
    created_at: float
    target_event_id: str
    window_start: float
    window_end: float
    events: tuple[ForensicEvent, ...]
    trace_evidence: TraceEvidence | None = None

    @property
    def event_count(self) -> int:
        """Return the number of frozen events."""
        return len(self.events)


def create_incident(
    events: Iterable[ForensicEvent],
    target_event_id: str,
    *,
    before_seconds: float = DEFAULT_INCIDENT_BEFORE_SECONDS,
    after_seconds: float = DEFAULT_INCIDENT_AFTER_SECONDS,
    title: str | None = None,
    max_events: int = MAX_INCIDENT_EVENTS,
    incident_id: str | None = None,
    created_at: float | None = None,
    trace_evidence: TraceEvidence | None = None,
) -> Incident:
    """Freeze a bounded time window around one captured event."""
    if before_seconds < 0 or after_seconds < 0:
        raise ValueError("incident window values must be non-negative")
    if before_seconds > MAX_INCIDENT_WINDOW_SECONDS:
        raise ValueError("before_seconds exceeds the incident window limit")
    if after_seconds > MAX_INCIDENT_WINDOW_SECONDS:
        raise ValueError("after_seconds exceeds the incident window limit")
    if max_events < 1:
        raise ValueError("max_events must be at least 1")

    event_list = tuple(events)
    try:
        target = next(
            event for event in event_list if event.event_id == target_event_id
        )
    except StopIteration:
        raise KeyError(target_event_id) from None

    window_start = target.timestamp - before_seconds
    window_end = target.timestamp + after_seconds
    selected = tuple(
        event
        for event in event_list
        if window_start <= event.timestamp <= window_end
    )

    if len(selected) > max_events:
        raise IncidentTooLarge(
            f"incident contains {len(selected)} events; limit is {max_events}"
        )

    normalized_title = _normalize_title(title, target.timestamp)

    return Incident(
        incident_id=incident_id or uuid4().hex,
        title=normalized_title,
        created_at=time() if created_at is None else created_at,
        target_event_id=target_event_id,
        window_start=window_start,
        window_end=window_end,
        events=selected,
        trace_evidence=trace_evidence,
    )


def _normalize_title(title: str | None, target_timestamp: float) -> str:
    if title is not None:
        stripped = title.strip()
        if stripped:
            if len(stripped) > MAX_INCIDENT_TITLE_LENGTH:
                raise ValueError(
                    f"incident title exceeds {MAX_INCIDENT_TITLE_LENGTH} characters"
                )
            return stripped

    timestamp = datetime.fromtimestamp(target_timestamp, tz=UTC).isoformat(
        timespec="seconds"
    )
    return f"Incident at {timestamp}"
