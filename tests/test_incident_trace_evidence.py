"""Tests for freezing and exporting validated trace evidence with incidents."""

from __future__ import annotations

import base64
import io
import json
import zipfile

from tests.support import load_module

models = load_module("models")
trace_evidence = load_module("trace_evidence")
incidents = load_module("incidents")
incident_codec = load_module("incident_codec")
sanitizer = load_module("sanitizer")
export_bundle = load_module("export_bundle")


def _event():
    return models.ForensicEvent(
        event_id="session-secret:00000001",
        kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=101.0,
        context_id="ctx-secret",
        parent_context_id="ctx-parent-secret",
        user_id="user-secret",
        entity_id="light.secret_room",
        domain="light",
        old_state="off",
        new_state="on",
    )


def _trace_projection():
    return {
        "reference": {
            "context_id": "ctx-secret",
            "domain": "automation",
            "item_id": "private_hallway_logic",
            "run_id": "run-secret",
            "ignored": "DO-NOT-PERSIST-REFERENCE-EXTRA",
        },
        "state": "stopped",
        "script_execution": "finished",
        "last_step": "action/1",
        "steps": [
            {
                "path": "condition/0",
                "result": True,
                "ignored": "DO-NOT-PERSIST-STEP-EXTRA",
            },
            {
                "path": "action/0/choose/1",
                "choice": "then",
                "child": {
                    "domain": "script",
                    "item_id": "private_child_script",
                    "run_id": "child-run-secret",
                    "ignored": "DO-NOT-PERSIST-CHILD-EXTRA",
                },
            },
        ],
        "truncated": False,
        "ignored": "DO-NOT-PERSIST-TOP-LEVEL-EXTRA",
    }


def _incident():
    event = _event()
    evidence = trace_evidence.normalize_trace_evidence(_trace_projection())
    assert evidence is not None

    return incidents.Incident(
        incident_id="incident-secret",
        title="Private incident title",
        created_at=999.0,
        target_event_id=event.event_id,
        window_start=100.0,
        window_end=160.0,
        events=(event,),
        trace_evidence=evidence,
    )


def test_incident_codec_round_trip_preserves_safe_trace_evidence() -> None:
    original = (_incident(),)

    stored = incident_codec.serialize_incidents(original)
    serialized = json.dumps(stored, sort_keys=True)
    restored = incident_codec.deserialize_incidents(stored)

    assert restored == original

    for secret in (
        "DO-NOT-PERSIST-REFERENCE-EXTRA",
        "DO-NOT-PERSIST-STEP-EXTRA",
        "DO-NOT-PERSIST-CHILD-EXTRA",
        "DO-NOT-PERSIST-TOP-LEVEL-EXTRA",
    ):
        assert secret not in serialized


def test_sanitizer_pseudonymizes_frozen_trace_references() -> None:
    result = sanitizer.sanitize_incident(_incident())
    trace = result["incident"]["trace_evidence"]
    serialized = json.dumps(result, sort_keys=True)

    assert trace is not None
    assert trace["reference"]["entity_id"] == "automation.entity_002"
    assert trace["reference"]["run_id"] == "run_001"
    assert trace["reference"]["context_id"] == "ctx_001"
    assert trace["steps"][0]["path"] == "condition/0"
    assert trace["steps"][0]["result"] is True
    assert trace["steps"][1]["choice"] == "then"
    assert trace["steps"][1]["child"]["entity_id"] == "script.entity_003"
    assert trace["steps"][1]["child"]["run_id"] == "run_002"

    for secret in (
        "private_hallway_logic",
        "run-secret",
        "private_child_script",
        "child-run-secret",
        "ctx-secret",
        "user-secret",
        "secret_room",
        "Private incident title",
    ):
        assert secret not in serialized


def test_export_bundle_contains_only_sanitized_trace_projection() -> None:
    bundle = export_bundle.build_export_bundle(_incident())
    payload = base64.b64decode(bundle.data)

    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        incident = json.loads(archive.read("incident.json"))
        combined = b"\n".join(
            archive.read(name)
            for name in archive.namelist()
        ).decode("utf-8")

    assert manifest["trace_evidence"] is True

    trace = incident["incident"]["trace_evidence"]
    assert trace is not None
    assert trace["steps"][0]["path"] == "condition/0"
    assert trace["steps"][1]["choice"] == "then"

    for secret in (
        "private_hallway_logic",
        "run-secret",
        "private_child_script",
        "child-run-secret",
        "ctx-secret",
        "session-secret",
        "user-secret",
        "secret_room",
        "Private incident title",
    ):
        assert secret not in combined


def test_incident_without_trace_evidence_remains_supported() -> None:
    event = _event()
    incident = incidents.Incident(
        incident_id="incident-no-trace",
        title="No trace",
        created_at=999.0,
        target_event_id=event.event_id,
        window_start=100.0,
        window_end=160.0,
        events=(event,),
    )

    stored = incident_codec.serialize_incidents((incident,))
    restored = incident_codec.deserialize_incidents(stored)
    sanitized = sanitizer.sanitize_incident(incident)

    assert restored == (incident,)
    assert sanitized["incident"]["trace_evidence"] is None


def test_safe_zip_hides_custom_service_identity_and_keeps_branch_zero() -> None:
    from dataclasses import replace

    original = _incident()
    projection = _trace_projection()
    projection["steps"][1]["choice"] = 0
    evidence = trace_evidence.normalize_trace_evidence(projection)
    service = replace(
        original.events[0], kind=models.ForensicEventKind.CALL_SERVICE,
        domain="script", service="SECRET_SCRIPT_NAME", entity_id=None,
    )
    incident = replace(original, events=(service,), trace_evidence=evidence)
    bundle = export_bundle.build_export_bundle(incident)
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(bundle.data))) as archive:
        contents = b"\n".join(archive.read(name) for name in archive.namelist())
        exported = json.loads(archive.read("incident.json"))
    assert b"SECRET_SCRIPT_NAME" not in contents
    assert exported["incident"]["trace_evidence"]["steps"][1]["choice"] == "0"
