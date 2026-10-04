"""Privacy and scope policy for runtime forensic capture."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, replace
from typing import Any

from .const import (
    CONF_CAPTURE_EVENT_KINDS,
    CONF_EXCLUDED_DOMAINS,
    CONF_EXCLUDED_ENTITIES,
)
from .models import ForensicEvent, ForensicEventKind

_DEFAULT_KINDS = frozenset(ForensicEventKind)
_VALID_KIND_VALUES = frozenset(kind.value for kind in ForensicEventKind)


@dataclass(frozen=True, slots=True)
class CapturePolicy:
    """Decide which normalized events may enter retention and persistence."""

    enabled_kinds: frozenset[ForensicEventKind] = _DEFAULT_KINDS
    excluded_entities: frozenset[str] = frozenset()
    excluded_domains: frozenset[str] = frozenset()

    @classmethod
    def from_options(cls, options: Mapping[str, Any]) -> CapturePolicy:
        """Build a policy from Home Assistant config-entry options."""
        raw_kinds = options.get(
            CONF_CAPTURE_EVENT_KINDS,
            [kind.value for kind in ForensicEventKind],
        )
        enabled_kinds = frozenset(
            ForensicEventKind(value)
            for value in raw_kinds
            if value in _VALID_KIND_VALUES
        )

        excluded_entities = frozenset(
            normalized
            for value in options.get(CONF_EXCLUDED_ENTITIES, [])
            if (normalized := _normalize_filter_value(value))
        )
        excluded_domains = frozenset(
            normalized
            for value in options.get(CONF_EXCLUDED_DOMAINS, [])
            if (normalized := _normalize_filter_value(value))
        )

        return cls(
            enabled_kinds=enabled_kinds,
            excluded_entities=excluded_entities,
            excluded_domains=excluded_domains,
        )

    def apply(self, event: ForensicEvent) -> ForensicEvent | None:
        """Return a retainable event or None when policy excludes it."""
        if event.kind not in self.enabled_kinds:
            return None

        if self._entity_is_excluded(event.entity_id):
            return None

        if event.domain is not None and event.domain in self.excluded_domains:
            return None

        if event.kind is not ForensicEventKind.CALL_SERVICE:
            return event

        filtered_targets = tuple(
            entity_id
            for entity_id in event.target_entity_ids
            if not self._entity_is_excluded(entity_id)
        )

        if event.target_entity_ids and not filtered_targets:
            return None

        if filtered_targets != event.target_entity_ids:
            return replace(event, target_entity_ids=filtered_targets)

        return event

    def filter_snapshot(
        self,
        events: tuple[ForensicEvent, ...],
    ) -> tuple[ForensicEvent, ...]:
        """Apply current policy to an already persisted rolling snapshot."""
        filtered: list[ForensicEvent] = []
        for event in events:
            retained = self.apply(event)
            if retained is not None:
                filtered.append(retained)
        return tuple(filtered)

    def _entity_is_excluded(self, entity_id: str | None) -> bool:
        if entity_id is None:
            return False

        normalized = entity_id.casefold()
        if normalized in self.excluded_entities:
            return True

        domain, separator, _object_id = normalized.partition(".")
        return bool(separator and domain in self.excluded_domains)


def _normalize_filter_value(value: object) -> str:
    return str(value).strip().casefold()
