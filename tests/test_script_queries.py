"""Entity filters include direct script calls and explicit service targets."""

from types import SimpleNamespace

import pytest

from tests.support import load_module

models = load_module("models")
query = load_module("query")
codec = load_module("storage_codec")


def _call(service, *, domain="script", targets=()):
    event = SimpleNamespace(
        event_type="call_service",
        data={
            "domain": domain,
            "service": service,
            "service_data": {"entity_id": list(targets)},
        },
        context=SimpleNamespace(id="ctx", parent_id=None, user_id=None),
        time_fired_timestamp=1.0,
    )
    return models.normalize_event(event, 1, "session")


@pytest.mark.parametrize("restore", [False, True])
def test_entity_filter_includes_direct_script_call(restore):
    event = _call("hallway_lights")
    events = (event,)
    if restore:
        events = codec.deserialize_events(codec.serialize_events(events))

    assert query.query_events(events, entity_id="script.hallway_lights") == events
    assert query.query_events(events, entity_id="script.other") == ()


@pytest.mark.parametrize("service", ["turn_on", "turn_off", "toggle", "reload"])
def test_generic_script_service_does_not_invent_an_entity(service):
    event = _call(service)

    assert query.query_events((event,), entity_id=f"script.{service}") == ()


@pytest.mark.parametrize("service", ["turn_on", "turn_off", "toggle"])
def test_generic_script_service_matches_explicit_targets(service):
    event = _call(service, targets=("script.hallway_lights", "script.other"))

    assert query.query_events(
        (event,), entity_id="script.hallway_lights"
    ) == (event,)
    assert query.query_events((event,), entity_id="script.missing") == ()


@pytest.mark.parametrize("service", [None, ""])
def test_missing_script_service_does_not_invent_an_entity(service):
    event = _call(service)

    assert query.query_events((event,), entity_id=f"script.{service}") == ()


def test_other_domain_service_is_not_a_script_call():
    event = _call("hallway_lights", domain="light")

    assert query.query_events((event,), entity_id="script.hallway_lights") == ()
