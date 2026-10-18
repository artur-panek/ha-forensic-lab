"""Keep payload objects out of normalized text fields."""

import json
from types import SimpleNamespace

import pytest

from tests.support import load_module

models = load_module("models")
codec = load_module("storage_codec")


def _event(kind, data):
    return SimpleNamespace(
        event_type=kind,
        data=data,
        context=SimpleNamespace(id="context", parent_id=None, user_id=None),
        time_fired_timestamp=1.0,
    )


@pytest.mark.parametrize(
    ("kind", "field"),
    [
        ("automation_triggered", "entity_id"),
        ("automation_triggered", "name"),
        ("automation_triggered", "source"),
        ("script_started", "name"),
        ("call_service", "domain"),
        ("call_service", "service"),
    ],
)
def test_payload_objects_are_not_converted_to_text(kind, field):
    event = _event(kind, {field: {"token": "capture-secret"}})

    normalized = models.normalize_event(event, 1, "session")

    assert getattr(normalized, field) is None
    assert "capture-secret" not in json.dumps(codec.serialize_events((normalized,)))


@pytest.mark.parametrize(
    ("source", "destination"),
    [("id", "context_id"), ("parent_id", "parent_context_id"), ("user_id", "user_id")],
)
def test_context_fields_require_strings(source, destination):
    event = _event("script_started", {"entity_id": "script.test"})
    setattr(event.context, source, {"token": "context-secret"})

    normalized = models.normalize_event(event, 1, "session")

    assert getattr(normalized, destination) is None
    assert normalized.entity_id == "script.test"


def test_target_lists_keep_only_nonempty_strings():
    event = _event("call_service", {
        "domain": "light",
        "service": "turn_on",
        "service_data": {
            "entity_id": [
                "light.hallway", {"token": "target-secret"}, 7, True, "", None,
            ],
        },
    })

    normalized = models.normalize_event(event, 1, "session")

    assert normalized.target_entity_ids == ("light.hallway",)
    assert normalized.domain == "light"
    assert normalized.service == "turn_on"


def test_empty_scalar_target_is_absent():
    event = _event("call_service", {"service_data": {"entity_id": ""}})

    normalized = models.normalize_event(event, 1, "session")

    assert normalized.target_entity_ids == ()


def test_state_strings_are_preserved_without_converting_objects():
    event = _event("state_changed", {
        "entity_id": "sensor.test",
        "old_state": SimpleNamespace(state="12.5"),
        "new_state": SimpleNamespace(state={"token": "state-secret"}),
    })

    normalized = models.normalize_event(event, 1, "session")

    assert normalized.old_state == "12.5"
    assert normalized.new_state is None


def test_normalization_does_not_call_payload_string_conversion():
    class InvalidName:
        def __str__(self):
            raise AssertionError("Payload string conversion must not run")

    event = _event("script_started", {"name": InvalidName()})

    normalized = models.normalize_event(event, 1, "session")

    assert normalized.name is None


@pytest.mark.parametrize("kind", ["automation_triggered", "script_started"])
def test_valid_names_and_contexts_are_preserved(kind):
    event = _event(kind, {
        "entity_id": (
            "automation.test" if kind == "automation_triggered" else "script.test"
        ),
        "name": "Hallway lights",
        "source": "state of binary_sensor.motion",
    })
    event.context.parent_id = "parent"
    event.context.user_id = "user"

    normalized = models.normalize_event(event, 1, "session")

    assert normalized.name == "Hallway lights"
    assert normalized.entity_id == event.data["entity_id"]
    assert normalized.context_id == "context"
    assert normalized.parent_context_id == "parent"
    assert normalized.user_id == "user"
    if kind == "automation_triggered":
        assert normalized.source == "state of binary_sensor.motion"
