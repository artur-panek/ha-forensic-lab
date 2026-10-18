"""Capture empty state strings through Home Assistant's event bus."""

import asyncio

import pytest


@pytest.mark.parametrize("include_unchanged", [False, True])
def test_empty_states_keep_lifecycle_transitions(tmp_path, include_unchanged):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant

    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.capture_policy import CapturePolicy

    async def run():
        hass = HomeAssistant(str(tmp_path))
        capture = ForensicCapture(
            hass,
            policy=CapturePolicy(capture_unchanged_states=include_unchanged),
        )
        capture.start()
        try:
            hass.states.async_set("input_text.note", "", {"revision": 0})
            hass.states.async_set("input_text.note", "", {"revision": 1})
            hass.states.async_set("input_text.note", "note")
            hass.states.async_set("input_text.note", "")
            hass.states.async_remove("input_text.note")
            await hass.async_block_till_done()
        finally:
            capture.stop()

        expected = [(None, "")]
        if include_unchanged:
            expected.append(("", ""))
        expected.extend([("", "note"), ("note", ""), ("", None)])
        observed = [(event.old_state, event.new_state) for event in capture.events]
        assert observed == expected
        assert capture.diagnostics["dropped_unchanged_state"] == int(
            not include_unchanged
        )

    asyncio.run(run())
