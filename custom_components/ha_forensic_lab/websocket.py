"""WebSocket API for HA Forensic Lab."""

from __future__ import annotations

from typing import Any

import probatio
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .capture import ForensicCapture
from .const import DATA_CAPTURE, DOMAIN
from .models import ForensicEventKind
from .query import event_to_dict, query_events

DEFAULT_TIMELINE_LIMIT = 100
MAX_TIMELINE_LIMIT = 500
_EVENT_KINDS = tuple(kind.value for kind in ForensicEventKind)


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register HA Forensic Lab WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_timeline)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/timeline",
        probatio.Optional("limit", default=DEFAULT_TIMELINE_LIMIT): probatio.All(
            int, probatio.Range(min=1, max=MAX_TIMELINE_LIMIT)
        ),
        probatio.Optional("entity_id"): str,
        probatio.Optional("context_id"): str,
        probatio.Optional("kind"): probatio.In(_EVENT_KINDS),
        probatio.Optional("since"): probatio.All(
            probatio.Coerce(float), probatio.Range(min=0)
        ),
    }
)
@callback
def websocket_timeline(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return a filtered snapshot of the in-memory forensic timeline."""
    capture = hass.data.get(DOMAIN, {}).get(DATA_CAPTURE)
    if not isinstance(capture, ForensicCapture):
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "HA Forensic Lab capture is not running",
        )
        return

    snapshot = capture.events
    events = query_events(
        snapshot,
        limit=msg["limit"],
        entity_id=msg.get("entity_id"),
        context_id=msg.get("context_id"),
        kind=msg.get("kind"),
        since=msg.get("since"),
    )

    connection.send_result(
        msg["id"],
        {
            "events": [event_to_dict(event) for event in events],
            "buffer_size": len(snapshot),
            "buffer_capacity": capture.max_events,
        },
    )
