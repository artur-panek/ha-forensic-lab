"""Tests for reviewing durable saved incidents."""

from __future__ import annotations

from tests.support import load_module

models = load_module("models")
trace_evidence = load_module("trace_evidence")
incidents = load_module("incidents")
review = load_module("incident_review")


def _event(
    event_id: str,
    timestamp: float,
    *,
    kind: str = "state_changed",
    context_id: str,
    parent_context_id: str | None = None,
):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind(kind),
        timestamp=timestamp,
        context_id=context_id,
        parent_context_id=parent_context_id,
        user_id=None,
        entity_id=(
            "automation.hallway"
            if kind == "automation_triggered"
            else "light.hallway"
        ),
    )


def test_saved_incident_review_reconstructs_without_live_buffer() -> None:
    frozen_events = (
        _event("trigger", 1.0, context_id="ctx-trigger"),
        _event(
            "automation",
            2.0,
            kind="automation_triggered",
            context_id="ctx-run",
            parent_context_id="ctx-trigger",
        ),
        _event(
            "target",
            3.0,
            context_id="ctx-run",
            parent_context_id="ctx-trigger",
        ),
    )
    trace = trace_evidence.normalize_trace_evidence(
        {
            "reference": {
                "context_id": "ctx-run",
                "domain": "automation",
                "item_id": "hallway",
                "run_id": "run-1",
            },
            "state": "stopped",
            "script_execution": "finished",
            "last_step": "action/0",
            "steps": [{"path": "action/0"}],
            "truncated": False,
        }
    )
    assert trace is not None

    incident = incidents.Incident(
        incident_id="saved-1",
        title="Saved",
        created_at=10.0,
        target_event_id="target",
        window_start=0.0,
        window_end=4.0,
        events=frozen_events,
        trace_evidence=trace,
    )

    result = review.review_incident(incident)

    assert result.incident_id == "saved-1"
    assert result.trace_evidence == trace
    assert [event.event_id for event in result.explanation.events] == [
        "trigger",
        "automation",
        "target",
    ]
    assert result.explanation.complete is True


def test_saved_review_preserves_evidence_gap() -> None:
    incident = incidents.Incident(
        incident_id="saved-gap",
        title="Saved",
        created_at=10.0,
        target_event_id="target",
        window_start=0.0,
        window_end=4.0,
        events=(
            _event(
                "target",
                3.0,
                context_id="ctx-child",
                parent_context_id="ctx-missing",
            ),
        ),
    )

    result = review.review_incident(incident)

    assert result.explanation.complete is False
    assert result.explanation.gaps == (
        "parent_context_not_in_buffer:ctx-missing",
    )


def test_saved_review_rejects_excessive_limit() -> None:
    incident = incidents.Incident(
        incident_id="saved-limit",
        title="Saved",
        created_at=10.0,
        target_event_id="target",
        window_start=0.0,
        window_end=4.0,
        events=(_event("target", 3.0, context_id="ctx"),),
    )

    try:
        review.review_incident(
            incident,
            max_events=review.MAX_INCIDENT_REVIEW_LIMIT + 1,
        )
    except ValueError as error:
        assert "max_events" in str(error)
    else:
        raise AssertionError("Expected ValueError")
