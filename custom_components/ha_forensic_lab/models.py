"""Normalized forensic event model.

This module intentionally has no Home Assistant imports so the normalization
rules can be unit-tested without booting a Home Assistant instance.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol


class ForensicEventKind(StrEnum):
    """Runtime event types captured by HA Forensic Lab."""

    STATE_CHANGED = "state_changed"
    CALL_SERVICE = "call_service"
    AUTOMATION_TRIGGERED = "automation_triggered"
    SCRIPT_STARTED = "script_started"


class ContextLike(Protocol):
    """Minimal Home Assistant context shape required for normalization."""

    id: str
    parent_id: str | None
    user_id: str | None


class EventLike(Protocol):
    """Minimal Home Assistant event shape required for normalization."""

    event_type: str
    data: Mapping[str, Any]
    context: ContextLike
    time_fired_timestamp: float


@dataclass(frozen=True, slots=True)
class ForensicEvent:
    """A compact, evidence-oriented representation of one runtime event."""

    event_id: str
    kind: ForensicEventKind
    timestamp: float
    context_id: str | None
    parent_context_id: str | None
    user_id: str | None
    entity_id: str | None = None
    domain: str | None = None
    service: str | None = None
    name: str | None = None
    source: str | None = None
    target_entity_ids: tuple[str, ...] = ()
    old_state: str | None = None
    new_state: str | None = None


def normalize_event(
    event: EventLike,
    sequence: int,
    session_id: str,
) -> ForensicEvent | None:
    """Normalize a supported Home Assistant event.

    Arbitrary event/service payloads and state attributes are deliberately not
    copied. v0.1 starts with the smallest useful forensic index.
    """
    try:
        kind = ForensicEventKind(event.event_type)
    except ValueError:
        return None

    timestamp = float(event.time_fired_timestamp)
    entity_id = _string_or_none(event.data.get("entity_id"))
    domain = _domain_from_entity_id(entity_id)

    context = event.context
    common = {
        "event_id": _event_id(session_id, sequence),
        "kind": kind,
        "timestamp": timestamp,
        "context_id": _string_or_none(getattr(context, "id", None)),
        "parent_context_id": _string_or_none(getattr(context, "parent_id", None)),
        "user_id": _string_or_none(getattr(context, "user_id", None)),
    }

    if kind is ForensicEventKind.STATE_CHANGED:
        old_state = event.data.get("old_state")
        new_state = event.data.get("new_state")
        return ForensicEvent(
            **common,
            entity_id=entity_id,
            domain=domain,
            old_state=_state_value(old_state),
            new_state=_state_value(new_state),
        )

    if kind is ForensicEventKind.CALL_SERVICE:
        service_data = event.data.get("service_data")
        target_entity_ids = _extract_entity_ids(service_data)
        return ForensicEvent(
            **common,
            domain=_string_or_none(event.data.get("domain")),
            service=_string_or_none(event.data.get("service")),
            target_entity_ids=target_entity_ids,
        )

    if kind is ForensicEventKind.AUTOMATION_TRIGGERED:
        return ForensicEvent(
            **common,
            entity_id=entity_id,
            domain=domain,
            name=_string_or_none(event.data.get("name")),
            source=_string_or_none(event.data.get("source")),
        )

    return ForensicEvent(
        **common,
        entity_id=entity_id,
        domain=domain,
        name=_string_or_none(event.data.get("name")),
    )


def _event_id(session_id: str, sequence: int) -> str:
    """Build an event identifier unique to one capture session and sequence."""
    return f"{session_id}:{sequence:08d}"


def _domain_from_entity_id(entity_id: str | None) -> str | None:
    if entity_id is None or "." not in entity_id:
        return None
    return entity_id.split(".", 1)[0]


def _state_value(value: Any) -> str | None:
    if value is None:
        return None
    return _string_or_none(getattr(value, "state", None))


def _extract_entity_ids(service_data: Any) -> tuple[str, ...]:
    if not isinstance(service_data, Mapping):
        return ()

    value = service_data.get("entity_id")
    if isinstance(value, str):
        return (value,)

    if isinstance(value, (list, tuple, set, frozenset)):
        return tuple(
            entity_id
            for item in value
            if (entity_id := _string_or_none(item)) is not None
        )

    return ()


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text if text else None
