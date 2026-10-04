"""WebSocket API for HA Forensic Lab."""

from __future__ import annotations

from typing import Any

import probatio
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .capture import ForensicCapture
from .causality import EvidenceEdge, ForensicExplanation, explain_event
from .const import DATA_CAPTURE, DATA_INCIDENT_STORE, DATA_STORE, DOMAIN
from .diagnostics_data import build_runtime_diagnostics
from .export_bundle import ExportBundle, build_export_bundle
from .incident_review import (
    DEFAULT_INCIDENT_REVIEW_LIMIT,
    MAX_INCIDENT_REVIEW_LIMIT,
    IncidentReview,
    review_incident,
)
from .incident_store import IncidentLimitReached, IncidentStore
from .incidents import (
    DEFAULT_INCIDENT_AFTER_SECONDS,
    DEFAULT_INCIDENT_BEFORE_SECONDS,
    MAX_INCIDENT_WINDOW_SECONDS,
    Incident,
    create_incident,
)
from .models import ForensicEventKind
from .query import event_to_dict, query_events
from .store import RollingForensicStore
from .trace_evidence import normalize_trace_evidence, trace_evidence_to_dict

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
    websocket_api.async_register_command(hass, websocket_incidents_list)
    websocket_api.async_register_command(hass, websocket_incidents_get)
    websocket_api.async_register_command(hass, websocket_incidents_review)
    websocket_api.async_register_command(hass, websocket_incidents_create)
    websocket_api.async_register_command(hass, websocket_incidents_delete)
    websocket_api.async_register_command(hass, websocket_incidents_export)
    websocket_api.async_register_command(hass, websocket_diagnostics)


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


@websocket_api.require_admin
@websocket_api.websocket_command({"type": "ha_forensic_lab/incidents/list"})
@callback
def websocket_incidents_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List saved incidents newest first."""
    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    connection.send_result(
        msg["id"],
        [
            _incident_to_dict(incident, include_events=False)
            for incident in store.incidents
        ],
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/incidents/get",
        probatio.Required("incident_id"): str,
    }
)
@callback
def websocket_incidents_get(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return one saved incident with its frozen events."""
    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    incident = store.get(msg["incident_id"])
    if incident is None:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Saved forensic incident not found",
        )
        return

    connection.send_result(
        msg["id"],
        _incident_to_dict(incident, include_events=True),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/incidents/review",
        probatio.Required("incident_id"): str,
        probatio.Optional(
            "max_events",
            default=DEFAULT_INCIDENT_REVIEW_LIMIT,
        ): probatio.All(
            int,
            probatio.Range(min=1, max=MAX_INCIDENT_REVIEW_LIMIT),
        ),
    }
)
@callback
def websocket_incidents_review(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reconstruct causality from one durable saved incident."""
    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    incident = store.get(msg["incident_id"])
    if incident is None:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Saved forensic incident not found",
        )
        return

    review = review_incident(
        incident,
        max_events=msg["max_events"],
    )
    connection.send_result(
        msg["id"],
        _incident_review_to_dict(incident, review),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/incidents/create",
        probatio.Required("target_event_id"): str,
        probatio.Optional(
            "before_seconds", default=DEFAULT_INCIDENT_BEFORE_SECONDS
        ): probatio.All(
            probatio.Coerce(float),
            probatio.Range(min=0, max=MAX_INCIDENT_WINDOW_SECONDS),
        ),
        probatio.Optional(
            "after_seconds", default=DEFAULT_INCIDENT_AFTER_SECONDS
        ): probatio.All(
            probatio.Coerce(float),
            probatio.Range(min=0, max=MAX_INCIDENT_WINDOW_SECONDS),
        ),
        probatio.Optional("title"): str,
        probatio.Optional("trace_evidence"): dict,
    }
)
@websocket_api.async_response
async def websocket_incidents_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Freeze a bounded incident around one event from the rolling buffer."""
    capture = _capture_or_error(hass, connection, msg["id"])
    if capture is None:
        return

    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    try:
        incident = create_incident(
            capture.events,
            msg["target_event_id"],
            before_seconds=msg["before_seconds"],
            after_seconds=msg["after_seconds"],
            title=msg.get("title"),
            trace_evidence=normalize_trace_evidence(msg.get("trace_evidence")),
        )
    except KeyError:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Target forensic event not found in the current capture buffer",
        )
        return
    except ValueError as err:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            str(err),
        )
        return

    try:
        await store.async_add(incident)
    except IncidentLimitReached as err:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            str(err),
        )
        return

    connection.send_result(
        msg["id"],
        _incident_to_dict(incident, include_events=False),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/incidents/delete",
        probatio.Required("incident_id"): str,
    }
)
@websocket_api.async_response
async def websocket_incidents_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete one saved forensic incident."""
    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    try:
        await store.async_delete(msg["incident_id"])
    except KeyError:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Saved forensic incident not found",
        )
        return

    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "ha_forensic_lab/incidents/export",
        probatio.Required("incident_id"): str,
    }
)
@websocket_api.async_response
async def websocket_incidents_export(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Build a safe-by-default sanitized ZIP export for one incident."""
    store = _incident_store_or_error(hass, connection, msg["id"])
    if store is None:
        return

    incident = store.get(msg["incident_id"])
    if incident is None:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_NOT_FOUND,
            "Saved forensic incident not found",
        )
        return

    bundle = await hass.async_add_executor_job(build_export_bundle, incident)
    connection.send_result(msg["id"], _export_bundle_to_dict(bundle))


@websocket_api.require_admin
@websocket_api.websocket_command({"type": "ha_forensic_lab/diagnostics"})
@callback
def websocket_diagnostics(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return privacy-safe aggregate runtime diagnostics."""
    domain_data = hass.data.get(DOMAIN, {})
    capture = domain_data.get(DATA_CAPTURE)
    store = domain_data.get(DATA_STORE)
    incident_store = domain_data.get(DATA_INCIDENT_STORE)

    entries = hass.config_entries.async_entries(DOMAIN)
    options = entries[0].options if entries else {}

    connection.send_result(
        msg["id"],
        build_runtime_diagnostics(
            options,
            capture=capture if isinstance(capture, ForensicCapture) else None,
            store=store if isinstance(store, RollingForensicStore) else None,
            incident_store=(
                incident_store
                if isinstance(incident_store, IncidentStore)
                else None
            ),
        ),
    )


def _incident_review_to_dict(
    incident: Incident,
    review: IncidentReview,
) -> dict[str, Any]:
    return {
        "incident": _incident_to_dict(incident, include_events=False),
        "explanation": _explanation_to_dict(review.explanation),
        "trace_evidence": trace_evidence_to_dict(review.trace_evidence),
    }


def _export_bundle_to_dict(bundle: ExportBundle) -> dict[str, Any]:
    return {
        "filename": bundle.filename,
        "content_type": bundle.content_type,
        "encoding": bundle.encoding,
        "data": bundle.data,
        "sha256": bundle.sha256,
        "size_bytes": bundle.size_bytes,
        "profile": bundle.profile,
    }


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


def _incident_store_or_error(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg_id: int,
) -> IncidentStore | None:
    store = hass.data.get(DOMAIN, {}).get(DATA_INCIDENT_STORE)
    if isinstance(store, IncidentStore):
        return store

    connection.send_error(
        msg_id,
        websocket_api.ERR_NOT_FOUND,
        "HA Forensic Lab incident store is not loaded",
    )
    return None


def _incident_to_dict(
    incident: Incident,
    *,
    include_events: bool,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "incident_id": incident.incident_id,
        "title": incident.title,
        "created_at": incident.created_at,
        "target_event_id": incident.target_event_id,
        "window_start": incident.window_start,
        "window_end": incident.window_end,
        "event_count": incident.event_count,
        "has_trace_evidence": incident.trace_evidence is not None,
    }
    if include_events:
        result["events"] = [event_to_dict(event) for event in incident.events]
        result["trace_evidence"] = trace_evidence_to_dict(incident.trace_evidence)
    return result


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
