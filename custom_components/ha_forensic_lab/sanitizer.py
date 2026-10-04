"""Safe-by-default sanitizer for exported forensic incidents."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .incidents import Incident
from .models import ForensicEvent
from .trace_evidence import TraceEvidence, TraceReference, TraceStepEvidence

SANITIZER_PROFILE = "safe"
SANITIZER_VERSION = 1
REDACTED = "[redacted]"

_SAFE_STATES = frozenset(
    {
        "on",
        "off",
        "open",
        "closed",
        "locked",
        "unlocked",
        "idle",
        "playing",
        "paused",
        "standby",
        "unavailable",
        "unknown",
    }
)


@dataclass(slots=True)
class _AliasMap:
    prefix: str
    _aliases: dict[str, str] = field(default_factory=dict)

    def alias(self, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in self._aliases:
            self._aliases[value] = f"{self.prefix}_{len(self._aliases) + 1:03d}"
        return self._aliases[value]


@dataclass(slots=True)
class SanitizationContext:
    """Stable pseudonym mappings for one exported incident."""

    events: _AliasMap = field(default_factory=lambda: _AliasMap("evt"))
    contexts: _AliasMap = field(default_factory=lambda: _AliasMap("ctx"))
    entities: _AliasMap = field(default_factory=lambda: _AliasMap("entity"))
    runs: _AliasMap = field(default_factory=lambda: _AliasMap("run"))

    def entity_id(self, value: str | None) -> str | None:
        """Pseudonymize an entity while preserving its domain."""
        if value is None:
            return None

        domain, separator, _object_id = value.partition(".")
        alias = self.entities.alias(value)
        if separator and domain:
            return f"{domain}.{alias}"
        return alias


def sanitize_incident(incident: Incident) -> dict[str, Any]:
    """Return a safe export representation of a saved incident."""
    context = SanitizationContext()
    sanitized_events = [
        _sanitize_event(event, incident.window_start, context)
        for event in incident.events
    ]

    target_event_id = context.events.alias(incident.target_event_id)

    return {
        "schema_version": 1,
        "sanitizer": {
            "profile": SANITIZER_PROFILE,
            "version": SANITIZER_VERSION,
            "policy": {
                "absolute_timestamps": "removed",
                "entity_ids": "stable_pseudonyms_with_domain",
                "event_ids": "stable_pseudonyms",
                "context_ids": "stable_pseudonyms",
                "user_ids": "removed",
                "free_text": "redacted",
                "state_values": "allowlist_or_redacted",
                "trace_references": "stable_pseudonyms",
            },
        },
        "incident": {
            "title": "HA Forensic Lab incident",
            "target_event_id": target_event_id,
            "window_duration_seconds": round(
                incident.window_end - incident.window_start,
                6,
            ),
            "event_count": len(sanitized_events),
            "events": sanitized_events,
            "trace_evidence": _sanitize_trace_evidence(
                incident.trace_evidence,
                context,
            ),
        },
    }


def _sanitize_event(
    event: ForensicEvent,
    window_start: float,
    context: SanitizationContext,
) -> dict[str, Any]:
    return {
        "event_id": context.events.alias(event.event_id),
        "kind": event.kind.value,
        "relative_seconds": round(event.timestamp - window_start, 6),
        "context_id": context.contexts.alias(event.context_id),
        "parent_context_id": context.contexts.alias(event.parent_context_id),
        "user_id": None,
        "entity_id": context.entity_id(event.entity_id),
        "domain": event.domain,
        "service": event.service,
        "name": REDACTED if event.name is not None else None,
        "source": REDACTED if event.source is not None else None,
        "target_entity_ids": [
            context.entity_id(entity_id) for entity_id in event.target_entity_ids
        ],
        "old_state": _sanitize_state(event.old_state),
        "new_state": _sanitize_state(event.new_state),
    }


def _sanitize_trace_evidence(
    evidence: TraceEvidence | None,
    context: SanitizationContext,
) -> dict[str, Any] | None:
    if evidence is None:
        return None

    return {
        "reference": _sanitize_trace_reference(evidence.reference, context),
        "state": evidence.state,
        "script_execution": evidence.script_execution,
        "last_step": evidence.last_step,
        "steps": [
            _sanitize_trace_step(step, context)
            for step in evidence.steps
        ],
        "truncated": evidence.truncated,
    }


def _sanitize_trace_reference(
    reference: TraceReference,
    context: SanitizationContext,
) -> dict[str, Any]:
    return {
        "entity_id": context.entity_id(
            f"{reference.domain}.{reference.item_id}"
        ),
        "run_id": context.runs.alias(reference.run_id),
        "context_id": context.contexts.alias(reference.context_id),
    }


def _sanitize_trace_step(
    step: TraceStepEvidence,
    context: SanitizationContext,
) -> dict[str, Any]:
    result: dict[str, Any] = {"path": step.path}

    if step.child is not None:
        result["child"] = _sanitize_trace_reference(step.child, context)
    if step.result is not None:
        result["result"] = step.result
    if step.choice is not None:
        result["choice"] = step.choice

    return result


def _sanitize_state(value: str | None) -> str | None:
    if value is None:
        return None

    lowered = value.casefold()
    if lowered in _SAFE_STATES:
        return lowered

    return REDACTED
