"""Privacy and scope policy for runtime forensic capture."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, replace
from typing import Any

from .const import (
    CONF_CAPTURE_EVENT_KINDS,
    CONF_CAPTURE_UNCHANGED_STATES,
    CONF_EXCLUDED_DOMAINS,
    CONF_EXCLUDED_ENTITIES,
)
from .metrics import CaptureDropReason
from .models import ForensicEvent, ForensicEventKind

_DEFAULT_KINDS = frozenset(ForensicEventKind)
_VALID_KIND_VALUES = frozenset(kind.value for kind in ForensicEventKind)


@dataclass(frozen=True, slots=True)
class CaptureDecision:
    """Result of applying the current capture policy to one event."""

    event: ForensicEvent | None
    drop_reason: CaptureDropReason | None = None
    filtered_targets: int = 0


@dataclass(frozen=True, slots=True)
class CapturePolicy:
    """Decide which normalized events may enter retention and persistence."""

    enabled_kinds: frozenset[ForensicEventKind] = _DEFAULT_KINDS
    excluded_entities: frozenset[str] = frozenset()
    excluded_domains: frozenset[str] = frozenset()
    capture_unchanged_states: bool = False

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
            capture_unchanged_states=options.get(CONF_CAPTURE_UNCHANGED_STATES, False),
        )

    def evaluate(self, event: ForensicEvent) -> CaptureDecision:
        """Classify and optionally filter one normalized event."""
        if event.kind not in self.enabled_kinds:
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.DISABLED_KIND,
            )

        if self._entity_is_explicitly_excluded(event.entity_id):
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.EXCLUDED_ENTITY,
            )

        if self._entity_domain_is_excluded(event.entity_id):
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.EXCLUDED_DOMAIN,
            )

        if (
            event.domain is not None
            and event.domain.casefold() in self.excluded_domains
        ):
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.EXCLUDED_DOMAIN,
            )

        if (
            not self.capture_unchanged_states
            and event.kind is ForensicEventKind.STATE_CHANGED
            and event.old_state is not None
            and event.old_state == event.new_state
        ):
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.UNCHANGED_STATE,
            )

        if event.kind is not ForensicEventKind.CALL_SERVICE:
            return CaptureDecision(event=event)

        filtered_targets = tuple(
            entity_id
            for entity_id in event.target_entity_ids
            if not self._entity_is_excluded(entity_id)
        )
        filtered_count = len(event.target_entity_ids) - len(filtered_targets)

        if event.target_entity_ids and not filtered_targets:
            return CaptureDecision(
                event=None,
                drop_reason=CaptureDropReason.EXCLUDED_TARGETS,
                filtered_targets=filtered_count,
            )

        if filtered_targets != event.target_entity_ids:
            return CaptureDecision(
                event=replace(event, target_entity_ids=filtered_targets),
                filtered_targets=filtered_count,
            )

        return CaptureDecision(event=event)

    def apply(self, event: ForensicEvent) -> ForensicEvent | None:
        """Return a retainable event or None when policy excludes it."""
        return self.evaluate(event).event

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

    def _entity_is_explicitly_excluded(self, entity_id: str | None) -> bool:
        return bool(
            entity_id is not None
            and entity_id.casefold() in self.excluded_entities
        )

    def _entity_domain_is_excluded(self, entity_id: str | None) -> bool:
        if entity_id is None:
            return False
        domain, separator, _object_id = entity_id.casefold().partition(".")
        return bool(separator and domain in self.excluded_domains)

    def _entity_is_excluded(self, entity_id: str | None) -> bool:
        return self._entity_is_explicitly_excluded(
            entity_id
        ) or self._entity_domain_is_excluded(entity_id)


def _normalize_filter_value(value: object) -> str:
    return str(value).strip().casefold()
