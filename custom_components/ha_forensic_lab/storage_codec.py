"""Pure serialization helpers for rolling forensic event storage."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from .models import ForensicEvent, ForensicEventKind


def serialize_events(events: Iterable[ForensicEvent]) -> dict[str, Any]:
    """Serialize normalized events into the versioned Home Assistant Store body."""
    return {
        "events": [_event_to_dict(event) for event in events],
    }


def deserialize_events(data: object) -> tuple[ForensicEvent, ...]:
    """Deserialize valid normalized events while skipping malformed entries."""
    if not isinstance(data, Mapping):
        return ()

    raw_events = data.get("events")
    if not isinstance(raw_events, list):
        return ()

    events: list[ForensicEvent] = []
    for raw_event in raw_events:
        try:
            events.append(_event_from_dict(raw_event))
        except (KeyError, TypeError, ValueError):
            continue

    return tuple(events)


def _event_to_dict(event: ForensicEvent) -> dict[str, Any]:
    return {
        "event_id": event.event_id,
        "kind": event.kind.value,
        "timestamp": event.timestamp,
        "context_id": event.context_id,
        "parent_context_id": event.parent_context_id,
        "user_id": event.user_id,
        "entity_id": event.entity_id,
        "domain": event.domain,
        "service": event.service,
        "name": event.name,
        "source": event.source,
        "target_entity_ids": list(event.target_entity_ids),
        "old_state": event.old_state,
        "new_state": event.new_state,
    }


def _event_from_dict(raw: object) -> ForensicEvent:
    if not isinstance(raw, Mapping):
        raise TypeError("stored event must be a mapping")

    event_id = _required_string(raw, "event_id")
    kind = ForensicEventKind(_required_string(raw, "kind"))
    timestamp = float(raw["timestamp"])

    target_entity_ids = raw.get("target_entity_ids", [])
    if not isinstance(target_entity_ids, list) or not all(
        isinstance(entity_id, str) for entity_id in target_entity_ids
    ):
        raise TypeError("target_entity_ids must be a list of strings")

    return ForensicEvent(
        event_id=event_id,
        kind=kind,
        timestamp=timestamp,
        context_id=_optional_string(raw.get("context_id")),
        parent_context_id=_optional_string(raw.get("parent_context_id")),
        user_id=_optional_string(raw.get("user_id")),
        entity_id=_optional_string(raw.get("entity_id")),
        domain=_optional_string(raw.get("domain")),
        service=_optional_string(raw.get("service")),
        name=_optional_string(raw.get("name")),
        source=_optional_string(raw.get("source")),
        target_entity_ids=tuple(target_entity_ids),
        old_state=_optional_string(raw.get("old_state")),
        new_state=_optional_string(raw.get("new_state")),
    )


def _required_string(raw: Mapping[str, Any], key: str) -> str:
    value = raw[key]
    if not isinstance(value, str) or not value:
        raise TypeError(f"{key} must be a non-empty string")
    return value


def _optional_string(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError("stored optional value must be a string or null")
    return value
