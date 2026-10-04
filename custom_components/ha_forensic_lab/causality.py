"""Deterministic context-chain reconstruction for HA Forensic Lab.

The engine intentionally distinguishes a confirmed Home Assistant context
relationship from a claim of direct event-to-event causation.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class EventKindLike(Protocol):
    """Minimal enum-like kind shape used by the causality layer."""

    @property
    def value(self) -> str:
        """Return the serialized event kind."""


class ForensicEventLike(Protocol):
    """Minimal forensic event shape required for context reconstruction."""

    event_id: str
    kind: EventKindLike
    timestamp: float
    context_id: str | None
    parent_context_id: str | None


class EvidenceClass(StrEnum):
    """Strength of an evidence relationship."""

    CONFIRMED = "confirmed"


class EvidenceType(StrEnum):
    """Deterministic evidence relationships supported by v0.1."""

    PARENT_CONTEXT = "parent_context"
    SAME_CONTEXT_SEQUENCE = "same_context_sequence"


@dataclass(frozen=True, slots=True)
class EvidenceEdge:
    """A confirmed relationship between two captured event anchors."""

    source_event_id: str
    target_event_id: str
    evidence_class: EvidenceClass
    evidence_type: EvidenceType
    source_context_id: str | None
    target_context_id: str | None


@dataclass(frozen=True, slots=True)
class ForensicExplanation:
    """Context-linked evidence around one target event."""

    target_event_id: str
    events: tuple[ForensicEventLike, ...]
    edges: tuple[EvidenceEdge, ...]
    gaps: tuple[str, ...]

    @property
    def complete(self) -> bool:
        """Return whether reconstruction ended without a known evidence gap."""
        return not self.gaps


def explain_event(
    events: Iterable[ForensicEventLike],
    target_event_id: str,
    *,
    max_events: int = 50,
    max_context_depth: int = 12,
) -> ForensicExplanation:
    """Reconstruct context-linked evidence ending at a target event.

    Parent-context relationships are explicit Home Assistant evidence.
    Same-context edges only state that two events belong to the same change
    context and are ordered in the captured stream; they do not claim that the
    earlier event directly caused the later event.
    """
    if max_events < 1:
        raise ValueError("max_events must be at least 1")
    if max_context_depth < 1:
        raise ValueError("max_context_depth must be at least 1")

    event_list = tuple(events)
    positions = {event.event_id: index for index, event in enumerate(event_list)}

    try:
        target_index = positions[target_event_id]
    except KeyError:
        raise KeyError(target_event_id) from None

    target = event_list[target_index]
    selected_ids: set[str] = {target.event_id}
    edge_keys: set[tuple[str, str, EvidenceType]] = set()
    edges: list[EvidenceEdge] = []
    gaps: list[str] = []

    if target.context_id is None:
        return ForensicExplanation(
            target_event_id=target.event_id,
            events=(target,),
            edges=(),
            gaps=("target_context_missing",),
        )

    by_context: dict[str, list[tuple[int, ForensicEventLike]]] = defaultdict(list)
    for index, event in enumerate(event_list[: target_index + 1]):
        if event.context_id is not None:
            by_context[event.context_id].append((index, event))

    current_context = target.context_id
    cutoff_index = target_index
    visited_contexts: set[str] = set()

    for _depth in range(max_context_depth):
        if current_context in visited_contexts:
            _append_gap(gaps, "context_cycle_detected")
            break
        visited_contexts.add(current_context)

        context_events = [
            (index, event)
            for index, event in by_context.get(current_context, ())
            if index <= cutoff_index
        ]
        if not context_events:
            _append_gap(gaps, f"context_not_in_buffer:{current_context}")
            break

        remaining = max_events - len(selected_ids)
        new_context_events = [
            item for item in context_events if item[1].event_id not in selected_ids
        ]

        if len(new_context_events) > remaining:
            if remaining > 0:
                keep_ids = {
                    event.event_id for _, event in new_context_events[-remaining:]
                }
                context_events = [
                    item
                    for item in context_events
                    if item[1].event_id in selected_ids
                    or item[1].event_id in keep_ids
                ]
            else:
                context_events = [
                    item
                    for item in context_events
                    if item[1].event_id in selected_ids
                ]
            _append_gap(gaps, "event_limit_reached")

        for _, event in context_events:
            selected_ids.add(event.event_id)

        _link_same_context_sequence(
            context_events,
            edges=edges,
            edge_keys=edge_keys,
            selected_ids=selected_ids,
        )

        if len(selected_ids) >= max_events and "event_limit_reached" in gaps:
            break

        parent_context = _parent_context_for_group(context_events)
        if parent_context is None:
            break

        child_anchor_index, child_anchor = context_events[0]
        parent_candidates = [
            (index, event)
            for index, event in by_context.get(parent_context, ())
            if index < child_anchor_index
        ]
        if not parent_candidates:
            _append_gap(gaps, f"parent_context_not_in_buffer:{parent_context}")
            break

        parent_index, parent_anchor = parent_candidates[-1]
        if (
            parent_anchor.event_id not in selected_ids
            and len(selected_ids) >= max_events
        ):
            _append_gap(gaps, "event_limit_reached")
            break

        selected_ids.add(parent_anchor.event_id)
        _append_edge(
            edges,
            edge_keys,
            EvidenceEdge(
                source_event_id=parent_anchor.event_id,
                target_event_id=child_anchor.event_id,
                evidence_class=EvidenceClass.CONFIRMED,
                evidence_type=EvidenceType.PARENT_CONTEXT,
                source_context_id=parent_context,
                target_context_id=current_context,
            ),
        )

        cutoff_index = parent_index
        current_context = parent_context
    else:
        _append_gap(gaps, "context_depth_limit_reached")

    selected_events = tuple(
        event
        for event in event_list[: target_index + 1]
        if event.event_id in selected_ids
    )
    selected_positions = {
        event.event_id: index for index, event in enumerate(selected_events)
    }
    selected_edges = tuple(
        sorted(
            (
                edge
                for edge in edges
                if edge.source_event_id in selected_positions
                and edge.target_event_id in selected_positions
            ),
            key=lambda edge: (
                selected_positions[edge.target_event_id],
                selected_positions[edge.source_event_id],
                edge.evidence_type.value,
            ),
        )
    )

    return ForensicExplanation(
        target_event_id=target.event_id,
        events=selected_events,
        edges=selected_edges,
        gaps=tuple(gaps),
    )


def _parent_context_for_group(
    context_events: list[tuple[int, ForensicEventLike]],
) -> str | None:
    """Return the most recent explicit parent context for a context group."""
    for _, event in reversed(context_events):
        if event.parent_context_id is not None:
            return event.parent_context_id
    return None


def _link_same_context_sequence(
    context_events: list[tuple[int, ForensicEventLike]],
    *,
    edges: list[EvidenceEdge],
    edge_keys: set[tuple[str, str, EvidenceType]],
    selected_ids: set[str],
) -> None:
    """Link consecutive captured events known to share one context."""
    selected_context_events = [
        event for _, event in context_events if event.event_id in selected_ids
    ]

    for source, target in zip(
        selected_context_events,
        selected_context_events[1:],
        strict=False,
    ):
        _append_edge(
            edges,
            edge_keys,
            EvidenceEdge(
                source_event_id=source.event_id,
                target_event_id=target.event_id,
                evidence_class=EvidenceClass.CONFIRMED,
                evidence_type=EvidenceType.SAME_CONTEXT_SEQUENCE,
                source_context_id=source.context_id,
                target_context_id=target.context_id,
            ),
        )


def _append_edge(
    edges: list[EvidenceEdge],
    edge_keys: set[tuple[str, str, EvidenceType]],
    edge: EvidenceEdge,
) -> None:
    key = (edge.source_event_id, edge.target_event_id, edge.evidence_type)
    if key in edge_keys:
        return
    edge_keys.add(key)
    edges.append(edge)


def _append_gap(gaps: list[str], gap: str) -> None:
    if gap not in gaps:
        gaps.append(gap)
