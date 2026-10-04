"""Review deterministic evidence from a durable saved incident."""

from __future__ import annotations

from dataclasses import dataclass

from .causality import ForensicExplanation, explain_event
from .incidents import Incident
from .trace_evidence import TraceEvidence

DEFAULT_INCIDENT_REVIEW_LIMIT = 100
MAX_INCIDENT_REVIEW_LIMIT = 200


@dataclass(frozen=True, slots=True)
class IncidentReview:
    """Reconstructed evidence stored entirely inside one saved incident."""

    incident_id: str
    explanation: ForensicExplanation
    trace_evidence: TraceEvidence | None


def review_incident(
    incident: Incident,
    *,
    max_events: int = DEFAULT_INCIDENT_REVIEW_LIMIT,
) -> IncidentReview:
    """Reconstruct deterministic causality from frozen incident events."""
    if max_events < 1 or max_events > MAX_INCIDENT_REVIEW_LIMIT:
        raise ValueError(
            f"max_events must be between 1 and {MAX_INCIDENT_REVIEW_LIMIT}"
        )

    return IncidentReview(
        incident_id=incident.incident_id,
        explanation=explain_event(
            incident.events,
            incident.target_event_id,
            max_events=max_events,
        ),
        trace_evidence=incident.trace_evidence,
    )
