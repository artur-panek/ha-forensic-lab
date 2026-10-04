"""Tests for saved forensic incident creation."""

from __future__ import annotations

import pytest

from tests.support import load_module

models = load_module("models")
incidents = load_module("incidents")


def _event(event_id: str, timestamp: float):
    return models.ForensicEvent(
        event_id=event_id,
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=timestamp,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        entity_id="light.hallway",
    )


def test_create_incident_freezes_requested_window() -> None:
    events = (
        _event("e1", 100.0),
        _event("e2", 200.0),
        _event("e3", 250.0),
        _event("e4", 400.0),
    )

    incident = incidents.create_incident(
        events,
        "e2",
        before_seconds=110,
        after_seconds=60,
        incident_id="incident-1",
        created_at=999.0,
    )

    assert incident.incident_id == "incident-1"
    assert incident.target_event_id == "e2"
    assert incident.window_start == 90.0
    assert incident.window_end == 260.0
    assert [event.event_id for event in incident.events] == ["e1", "e2", "e3"]
    assert incident.event_count == 3


def test_create_incident_preserves_custom_title() -> None:
    incident = incidents.create_incident(
        (_event("e1", 100.0),),
        "e1",
        title="  Hallway mystery  ",
    )

    assert incident.title == "Hallway mystery"


def test_create_incident_rejects_oversized_window_result() -> None:
    events = tuple(_event(f"e{index}", float(index)) for index in range(5))

    try:
        incidents.create_incident(
            events,
            "e2",
            before_seconds=10,
            after_seconds=10,
            max_events=2,
        )
    except incidents.IncidentTooLarge as error:
        assert "limit is 2" in str(error)
    else:
        raise AssertionError("Expected IncidentTooLarge")


def test_create_incident_rejects_unknown_target() -> None:
    try:
        incidents.create_incident((_event("known", 1.0),), "missing")
    except KeyError as error:
        assert error.args == ("missing",)
    else:
        raise AssertionError("Expected KeyError")


def test_create_incident_rejects_title_over_limit() -> None:
    try:
        incidents.create_incident(
            (_event("e1", 1.0),),
            "e1",
            title="x" * (incidents.MAX_INCIDENT_TITLE_LENGTH + 1),
        )
    except ValueError as error:
        assert "title exceeds" in str(error)
    else:
        raise AssertionError("Expected ValueError")


def test_busy_window_can_be_previewed_then_narrowed_without_truncation():
    events = tuple(_event(f"e{index}", index / 10) for index in range(1585))
    preview = incidents.select_incident_window(events, "e1400")
    assert len(preview.events) == 1585
    with pytest.raises(incidents.IncidentTooLarge, match="1585 events"):
        incidents.create_incident(events, "e1400")

    preview = incidents.select_incident_window(
        events, "e1400", before_seconds=30, after_seconds=10
    )
    saved = incidents.create_incident(
        events, "e1400", before_seconds=30, after_seconds=10
    )
    assert saved.events == preview.events
    assert saved.event_count == 401
    assert (saved.window_start, saved.window_end) == (110, 150)
    assert (preview.window_start, preview.window_end) == (110, 150)


def test_zero_width_window_keeps_all_events_at_the_target_timestamp():
    events = tuple(_event(f"e{index}", 100) for index in range(501))
    preview = incidents.select_incident_window(
        events, "e1", before_seconds=0, after_seconds=0
    )
    assert preview.events == events
    with pytest.raises(incidents.IncidentTooLarge):
        incidents.create_incident(
            events, "e1", before_seconds=0, after_seconds=0
        )


@pytest.mark.parametrize("side", ["before_seconds", "after_seconds"])
@pytest.mark.parametrize("value", [-1, 3601, float("nan"), float("inf")])
def test_preview_and_create_reject_invalid_window_values(side, value):
    for operation in (incidents.select_incident_window, incidents.create_incident):
        with pytest.raises(ValueError):
            operation((_event("e1", 100),), "e1", **{side: value})
