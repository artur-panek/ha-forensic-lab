"""Capture real HA attribute updates without booting a full installation."""

import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.mark.parametrize("include_unchanged", [False, True])
def test_attribute_update_burst_and_ring_rotation(tmp_path, include_unchanged):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant

    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.capture_policy import CapturePolicy

    async def run():
        hass = HomeAssistant(str(tmp_path))
        on_change = Mock()
        capture = ForensicCapture(
            hass,
            max_events=4,
            on_change=on_change,
            policy=CapturePolicy(capture_unchanged_states=include_unchanged),
        )
        capture.start()
        try:
            hass.states.async_set("media_player.test", "playing", {"position": 0})
            for position in range(1, 501):
                hass.states.async_set(
                    "media_player.test", "playing", {"position": position}
                )
            hass.states.async_set("media_player.test", "paused", {"position": 500})
            await hass.async_block_till_done()
        finally:
            capture.stop()

        metrics = capture.diagnostics
        assert metrics["observed_events"] == 502
        assert capture.events[-1].new_state == "paused"
        if include_unchanged:
            assert len(capture.events) == 4
            assert metrics["evicted_events"] == 498
            assert metrics["dropped_unchanged_state"] == 0
            assert on_change.call_count == 502
        else:
            assert len(capture.events) == 2
            assert capture.events[0].old_state is None
            assert metrics["evicted_events"] == 0
            assert metrics["dropped_unchanged_state"] == 500
            assert on_change.call_count == 2

    asyncio.run(run())


def test_timeline_span_uses_all_retained_events_not_the_filtered_page(tmp_path):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant

    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.const import DATA_CAPTURE, DOMAIN
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )
    from custom_components.ha_forensic_lab.websocket import websocket_timeline

    async def run():
        hass = HomeAssistant(str(tmp_path))
        events = tuple(
            ForensicEvent(
                event_id=f"event-{index}",
                kind=ForensicEventKind.STATE_CHANGED,
                timestamp=timestamp,
                context_id=None,
                parent_context_id=None,
                user_id=None,
                entity_id=f"light.test_{index}",
            )
            for index, timestamp in enumerate((100, 125, 120))
        )
        hass.data[DOMAIN] = {
            DATA_CAPTURE: ForensicCapture(hass, initial_events=events)
        }
        connection = SimpleNamespace(
            user=SimpleNamespace(is_admin=True), send_result=Mock()
        )
        websocket_timeline(
            hass,
            connection,
            {"id": 1, "limit": 1, "entity_id": "light.test_2"},
        )
        result = connection.send_result.call_args.args[1]
        assert len(result["events"]) == 1
        assert result["buffer_size"] == 3
        assert result["retained_span_seconds"] == 25

    asyncio.run(run())
