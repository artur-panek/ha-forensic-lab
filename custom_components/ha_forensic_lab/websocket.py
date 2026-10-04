"""WebSocket API for HA Forensic Lab."""

from __future__ import annotations

from typing import Any

import probatio
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .capture import ForensicCapture
from .causality import EvidenceEdge, ForensicExplanation, explain_event
from .const import DATA_CAPTURE, DOMAIN
from .models import ForensicEventKind
from .query import event_to_dict, query_events

DEFAULT_TIMELINE_LIMIT = 100
MAX_TIMELINE_LIMIT = 500
DEFAULT_EXPLAIN_LIMIT = 50
MAX_EXPLAIN_LIMIT = 100
_EVENT_KINDS = tuple(kind.value for kind in ForensicEventKind)


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register HA Forensic Lab WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_timeline)
    websocket_api.async_register_command(hass, websocket_explain)


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
    capture = _capture_or_error(hass, connection, msg["id"])
    if capture is None:
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


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/explain",
        probatio.Required("event_id"): str,
        probatio.Optional("max_events", default=DEFAULT_EXPLAIN_LIMIT): probatio.All(
            int, probatio.Range(min=1, max=MAX_EXPLAIN_LIMIT)
        ),
    }
)
@callback
def websocket_explain(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return deterministic context-linked evidence for one event."""
    capture = _capture_or_error(hass, connection, msg["id"])
    if capture is None:
        return

    try:
        explanation = explain_event(
            capture.events,
            msg["event_id"],
            max_events=msg["max_events"],
        )
    except KeyError:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Forensic event not found in the current capture buffer",
        )
        return

    connection.send_result(msg["id"], _explanation_to_dict(explanation))


def _capture_or_error(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg_id: int,
) -> ForensicCapture | None:
    capture = hass.data.get(DOMAIN, {}).get(DATA_CAPTURE)
    if isinstance(capture, ForensicCapture):
        return capture

    connection.send_error(
        msg_id,
        websocket_api.ERR_NOT_FOUND,
        "HA Forensic Lab capture is not running",
    )
    return None


def _explanation_to_dict(explanation: ForensicExplanation) -> dict[str, Any]:
    return {
        "target_event_id": explanation.target_event_id,
        "complete": explanation.complete,
        "events": [event_to_dict(event) for event in explanation.events],
        "edges": [_edge_to_dict(edge) for edge in explanation.edges],
        "gaps": list(explanation.gaps),
    }


def _edge_to_dict(edge: EvidenceEdge) -> dict[str, Any]:
    return {
        "source_event_id": edge.source_event_id,
        "target_event_id": edge.target_event_id,
        "evidence_class": edge.evidence_class.value,
        "evidence_type": edge.evidence_type.value,
        "source_context_id": edge.source_context_id,
        "target_context_id": edge.target_context_id,
    }
