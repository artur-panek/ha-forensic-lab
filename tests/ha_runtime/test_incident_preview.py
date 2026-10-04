"""Preview busy windows and save their exact selection through HA's API."""

import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.fixture
def ha():
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
    from homeassistant.exceptions import Unauthorized

    from custom_components.ha_forensic_lab import websocket
    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.const import (
        DATA_CAPTURE,
        DATA_INCIDENT_STORE,
        DOMAIN,
    )
    from custom_components.ha_forensic_lab.incident_store import IncidentStore
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )

    events = tuple(
        ForensicEvent(
            event_id=f"event-{index}",
            kind=ForensicEventKind.STATE_CHANGED,
            timestamp=index / 10,
            context_id=None,
            parent_context_id=None,
            user_id=None,
            entity_id="sensor.test",
        )
        for index in range(1585)
    )
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        Unauthorized=Unauthorized,
        websocket=websocket,
        Capture=ForensicCapture,
        Store=IncidentStore,
        domain=DOMAIN,
        capture_key=DATA_CAPTURE,
        store_key=DATA_INCIDENT_STORE,
        events=events,
    )


def test_busy_preview_is_read_only_and_narrowed_save_survives_reload(ha, tmp_path):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        capture = ha.Capture(hass, initial_events=ha.events)
        hass.data[ha.domain] = {ha.capture_key: capture}
        connection = SimpleNamespace(
            user=SimpleNamespace(is_admin=True),
            send_result=Mock(), send_error=Mock(), async_handle_exception=Mock(),
        )
        preview_command = ha.websocket.websocket_incidents_preview
        message = {
            "id": 1, "type": "ha_forensic_lab/incidents/preview",
            "target_event_id": "event-1400",
        }
        preview_command(hass, connection, preview_command._ws_schema(message))
        assert connection.send_result.call_args.args[1] == {
            "event_count": 1585, "max_events": 500, "can_save": False,
            "window_start": -160, "window_end": 200,
        }
        # Preview works without a store and leaves capture unchanged.
        assert capture.events == ha.events
        store = ha.Store(hass)
        await store.async_load()
        assert store.incidents == ()
        hass.data[ha.domain][ha.store_key] = store

        narrow = message | {"before_seconds": 30, "after_seconds": 10}
        preview_command(hass, connection, preview_command._ws_schema(narrow))
        preview = connection.send_result.call_args.args[1]
        assert preview["event_count"] == 401
        assert preview["can_save"] is True
        create_command = ha.websocket.websocket_incidents_create
        create_message = narrow | {
            "id": 2, "type": "ha_forensic_lab/incidents/create",
            "title": "Busy window",
        }
        create_command(hass, connection, create_command._ws_schema(create_message))
        await hass.async_block_till_done(wait_background_tasks=True)
        connection.send_error.assert_not_called()
        connection.async_handle_exception.assert_not_called()
        result = connection.send_result.call_args.args[1]
        assert result["event_count"] == 401
        assert result["window_start"] == preview["window_start"] == 110
        assert result["window_end"] == preview["window_end"] == 150
        restored = ha.Store(hass)
        await restored.async_load()
        assert restored.incidents == store.incidents
        assert restored.incidents[0].events == ha.events[1100:1501]

        # A caller cannot use a previous valid preview to bypass the save bound.
        oversized = create_message | {"id": 3, "before_seconds": 300}
        create_command(hass, connection, create_command._ws_schema(oversized))
        await hass.async_block_till_done(wait_background_tasks=True)
        assert connection.send_error.call_args.args[1] == "invalid_format"
        assert len(store.incidents) == 1

    asyncio.run(run())


def test_preview_rejects_evicted_target_and_non_admin(ha, tmp_path):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        hass.data[ha.domain] = {
            ha.capture_key: ha.Capture(hass, initial_events=ha.events[-10:])
        }
        command = ha.websocket.websocket_incidents_preview
        message = command._ws_schema({
            "id": 1, "type": "ha_forensic_lab/incidents/preview",
            "target_event_id": "event-1400",
        })
        connection = SimpleNamespace(
            user=SimpleNamespace(is_admin=True),
            send_result=Mock(), send_error=Mock(),
        )
        command(hass, connection, message)
        assert connection.send_error.call_args.args[1] == "not_found"
        connection.send_result.assert_not_called()
        connection.user.is_admin = False
        with pytest.raises(ha.Unauthorized):
            command(hass, connection, message)

    asyncio.run(run())
