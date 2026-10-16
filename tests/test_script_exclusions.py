"""Apply entity exclusions to scripts invoked by their service name."""

from dataclasses import replace

from tests.support import load_module

models = load_module("models")
policy_module = load_module("capture_policy")


def _script_call(service: str):
    return models.ForensicEvent(
        event_id=service,
        kind=models.ForensicEventKind.CALL_SERVICE,
        timestamp=1.0,
        context_id="ctx",
        parent_context_id=None,
        user_id=None,
        domain="script",
        service=service,
    )


def test_direct_script_call_obeys_entity_exclusion():
    policy = policy_module.CapturePolicy(
        excluded_entities=frozenset({"script.private_routine"})
    )

    decision = policy.evaluate(_script_call("private_routine"))

    assert decision.event is None
    assert decision.drop_reason.value == "excluded_entity"
    allowed = _script_call("hallway_lights")
    assert policy.apply(allowed) is allowed


def test_restored_direct_script_call_is_filtered():
    policy = policy_module.CapturePolicy(
        excluded_entities=frozenset({"script.private_routine"})
    )
    excluded = _script_call("private_routine")
    allowed = _script_call("hallway_lights")

    assert policy.filter_snapshot((excluded, allowed)) == (allowed,)


def test_generic_script_service_keeps_allowed_targets():
    policy = policy_module.CapturePolicy(
        excluded_entities=frozenset({"script.private_routine"})
    )
    event = replace(
        _script_call("turn_on"),
        target_entity_ids=("script.private_routine", "script.hallway_lights"),
    )

    decision = policy.evaluate(event)

    assert decision.event.target_entity_ids == ("script.hallway_lights",)
    assert decision.filtered_targets == 1
