"""Tests for safe-by-default incident sanitization."""

from __future__ import annotations

import json

from tests.support import load_module

models = load_module("models")
incidents = load_module("incidents")
sanitizer = load_module("sanitizer")


def _incident():
    state_event = models.ForensicEvent(
        event_id="secret-session:00000001",
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=101.0,
        context_id="ctx-secret",
        parent_context_id="ctx-parent-secret",
        user_id="user-secret",
        entity_id="light.secret_room",
        domain="light",
        old_state="off",
        new_state="codeword-blue",
    )
    service_event = models.ForensicEvent(
        event_id="secret-session:00000002",
        kind=models.ForensicEventKind.CALL_SERVICE,
        timestamp=102.0,
        context_id="ctx-secret",
        parent_context_id="ctx-parent-secret",
        user_id="user-secret",
        domain="light",
        service="turn_on",
        target_entity_ids=("light.secret_room",),
    )
    automation_event = models.ForensicEvent(
        event_id="secret-session:00000003",
        kind=models.ForensicEventKind.AUTOMATION_TRIGGERED,
        timestamp=103.0,
        context_id="ctx-child-secret",
        parent_context_id="ctx-secret",
        user_id="user-secret",
        entity_id="automation.private_hallway_logic",
        domain="automation",
        name="Secret automation name",
        source="secret trigger description",
    )

    return incidents.Incident(
        incident_id="incident-secret",
        title="Private incident title",
        created_at=999.0,
        target_event_id=state_event.event_id,
        window_start=100.0,
        window_end=160.0,
        events=(state_event, service_event, automation_event),
    )


def test_safe_sanitizer_removes_sensitive_identifiers_and_text() -> None:
    result = sanitizer.sanitize_incident(_incident())
    serialized = json.dumps(result, sort_keys=True)

    for secret in (
        "secret-session",
        "ctx-secret",
        "ctx-parent-secret",
        "ctx-child-secret",
        "user-secret",
        "secret_room",
        "private_hallway_logic",
        "Secret automation name",
        "secret trigger description",
        "codeword-blue",
        "Private incident title",
    ):
        assert secret not in serialized

    assert result["incident"]["title"] == "HA Forensic Lab incident"
    assert result["incident"]["event_count"] == 3
    assert result["incident"]["events"][0]["relative_seconds"] == 1.0
    assert result["incident"]["events"][0]["user_id"] is None
    assert result["incident"]["events"][0]["old_state"] == "off"
    assert result["incident"]["events"][0]["new_state"] == sanitizer.REDACTED
    assert result["incident"]["events"][2]["name"] == sanitizer.REDACTED
    assert result["incident"]["events"][2]["source"] == sanitizer.REDACTED


def test_aliases_are_stable_inside_one_export() -> None:
    result = sanitizer.sanitize_incident(_incident())
    state_event, service_event, automation_event = result["incident"]["events"]

    assert state_event["entity_id"] == "light.entity_001"
    assert service_event["target_entity_ids"] == ["light.entity_001"]
    assert automation_event["entity_id"] == "automation.entity_002"

    assert state_event["context_id"] == service_event["context_id"]
    assert state_event["parent_context_id"] == service_event["parent_context_id"]
    assert automation_event["parent_context_id"] == state_event["context_id"]

    assert result["incident"]["target_event_id"] == state_event["event_id"]


def test_safe_export_contains_no_absolute_event_timestamps() -> None:
    result = sanitizer.sanitize_incident(_incident())

    for event in result["incident"]["events"]:
        assert "timestamp" not in event
        assert "relative_seconds" in event

    assert "created_at" not in result["incident"]
    assert "window_start" not in result["incident"]
    assert "window_end" not in result["incident"]
