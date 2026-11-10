"""Service-call events retain targets before HA's schema normalization."""

import asyncio

import pytest


@pytest.mark.parametrize(
    "targets",
    [
        "light.hall, light.private",
        " light.hall ",
        "LIGHT.HALL, LIGHT.PRIVATE",
        ["LIGHT.HALL", "LIGHT.PRIVATE"],
        ["light.hall"],
    ],
)
def test_service_targets_are_queryable_and_respect_exclusions(tmp_path, targets):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers import config_validation as cv

    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.capture_policy import CapturePolicy
    from custom_components.ha_forensic_lab.query import query_events

    async def run():
        hass = HomeAssistant(str(tmp_path))
        calls = []

        async def handle(call):
            calls.append(call.data["entity_id"])

        hass.services.async_register(
            "light", "turn_on", handle,
            schema=lambda data: {"entity_id": cv.entity_ids(data["entity_id"])},
        )
        capture = ForensicCapture(
            hass,
            policy=CapturePolicy(excluded_entities=frozenset({"light.private"})),
        )
        capture.start()
        try:
            await hass.services.async_call(
                "light", "turn_on", {"entity_id": targets}, blocking=True,
            )
            await hass.async_block_till_done()
        finally:
            capture.stop()

        assert calls == [cv.entity_ids(targets)]
        assert len(capture.events) == 1
        assert capture.events[0].target_entity_ids == ("light.hall",)
        assert query_events(capture.events, entity_id="light.hall") == capture.events
        assert query_events(capture.events, entity_id="light.private") == ()

    asyncio.run(run())
