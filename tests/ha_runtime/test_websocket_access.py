"""Check the admin gate on the handlers registered by the integration."""

import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

REQUESTS = {
    "websocket_timeline": {"type": "ha_forensic_lab/timeline", "limit": 100},
    "websocket_explain": {"type": "ha_forensic_lab/explain", "event_id": "event"},
    "websocket_incidents_list": {"type": "ha_forensic_lab/incidents/list"},
    "websocket_incidents_get": {
        "type": "ha_forensic_lab/incidents/get", "incident_id": "incident",
    },
    "websocket_incidents_review": {
        "type": "ha_forensic_lab/incidents/review", "incident_id": "incident",
    },
    "websocket_incidents_preview": {
        "type": "ha_forensic_lab/incidents/preview", "target_event_id": "event",
    },
    "websocket_incidents_create": {
        "type": "ha_forensic_lab/incidents/create", "target_event_id": "event",
    },
    "websocket_incidents_delete": {
        "type": "ha_forensic_lab/incidents/delete", "incident_id": "incident",
    },
    "websocket_incidents_export": {
        "type": "ha_forensic_lab/incidents/export", "incident_id": "incident",
    },
    "websocket_diagnostics": {"type": "ha_forensic_lab/diagnostics"},
}


@pytest.fixture
def registered(monkeypatch):
    pytest.importorskip("homeassistant")
    from homeassistant.exceptions import Unauthorized

    from custom_components.ha_forensic_lab import websocket

    handlers = {}

    def register(_hass, handler):
        handlers[handler.__name__] = handler

    monkeypatch.setattr(websocket.websocket_api, "async_register_command", register)
    websocket.async_register_websocket_api(object())
    assert set(handlers) == set(REQUESTS)
    return handlers, Unauthorized


@pytest.mark.parametrize("handler_name", REQUESTS)
@pytest.mark.parametrize("has_user", [False, True], ids=["no-user", "non-admin"])
def test_non_admin_commands_stop_before_reading_or_writing(
    registered, handler_name, has_user
):
    handlers, unauthorized = registered
    connection = SimpleNamespace(
        user=SimpleNamespace(is_admin=False) if has_user else None,
        send_result=Mock(),
        send_error=Mock(),
    )
    handler = handlers[handler_name]
    message = {"id": 1, **REQUESTS[handler_name]}
    if handler._ws_schema:
        message = handler._ws_schema(message)

    # No HA state is supplied: the wrapper must reject before calling the handler.
    with pytest.raises(unauthorized):
        handler(object(), connection, message)

    connection.send_result.assert_not_called()
    connection.send_error.assert_not_called()


def test_admin_can_read_captured_timeline(registered, tmp_path):
    from homeassistant.core import HomeAssistant

    from custom_components.ha_forensic_lab.capture import ForensicCapture
    from custom_components.ha_forensic_lab.const import DATA_CAPTURE, DOMAIN
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )

    async def run():
        hass = HomeAssistant(str(tmp_path))
        event = ForensicEvent(
            event_id="event", kind=ForensicEventKind.STATE_CHANGED, timestamp=1.0,
            context_id="context", parent_context_id=None, user_id=None,
            entity_id="light.test", old_state="off", new_state="on",
        )
        hass.data[DOMAIN] = {
            DATA_CAPTURE: ForensicCapture(hass, initial_events=(event,))
        }
        connection = SimpleNamespace(
            user=SimpleNamespace(is_admin=True), send_result=Mock(), send_error=Mock(),
        )
        handler = registered[0]["websocket_timeline"]
        message = handler._ws_schema({"id": 1, **REQUESTS["websocket_timeline"]})
        handler(hass, connection, message)

        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once()
        message_id, result = connection.send_result.call_args.args
        assert message_id == 1
        assert [item["event_id"] for item in result["events"]] == ["event"]

    asyncio.run(run())
