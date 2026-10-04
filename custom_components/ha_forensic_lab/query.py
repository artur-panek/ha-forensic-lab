"""Read/query helpers for captured forensic events."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .models import ForensicEvent


def query_events(
    events: Iterable[ForensicEvent],
    *,
    limit: int = 100,
    entity_id: str | None = None,
    context_id: str | None = None,
    kind: str | None = None,
    since: float | None = None,
) -> tuple[ForensicEvent, ...]:
    """Return newest matching events first."""
    if limit < 1:
        raise ValueError("limit must be at least 1")

    matches: list[ForensicEvent] = []
    event_list = tuple(events)

    for event in reversed(event_list):
        if entity_id is not None and not _matches_entity(event, entity_id):
            continue
        if context_id is not None and context_id not in (
            event.context_id,
            event.parent_context_id,
        ):
            continue
        if kind is not None and event.kind.value != kind:
            continue
        if since is not None and event.timestamp < since:
            continue

        matches.append(event)
        if len(matches) >= limit:
            break

    return tuple(matches)


def event_to_dict(event: ForensicEvent) -> dict[str, Any]:
    """Serialize a normalized event for storage and WebSocket responses."""
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


def _matches_entity(event: ForensicEvent, entity_id: str) -> bool:
    return event.entity_id == entity_id or entity_id in event.target_entity_ids
