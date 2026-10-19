"""Automation IDs are strings, not entity IDs or structural trace paths."""

import base64
import io
import json
import zipfile

import pytest

from tests.support import load_module

models = load_module("models")
traces = load_module("trace_evidence")
incidents = load_module("incidents")
codec = load_module("incident_codec")
export = load_module("export_bundle")


def _projection(item_id):
    return {
        "reference": {
            "context_id": "root-context",
            "domain": "automation",
            "item_id": item_id,
            "run_id": "root-run",
        },
        "steps": [{
            "path": "action/0",
            "child": {
                "domain": "automation",
                "item_id": item_id,
                "run_id": "child-run",
            },
        }],
    }


@pytest.mark.parametrize("item_id", [
    "Hallway lights", "Światło w kuchni", 'Evening / lights <test> "quoted"',
])
def test_custom_automation_ids_survive_restore_but_not_export(item_id):
    evidence = traces.normalize_trace_evidence(_projection(item_id))
    assert evidence.reference.item_id == item_id
    assert evidence.steps[0].child.item_id == item_id
    event = models.ForensicEvent(
        event_id="target",
        kind=models.ForensicEventKind.AUTOMATION_TRIGGERED,
        timestamp=10.0,
        context_id="root-context",
        parent_context_id=None,
        user_id=None,
        entity_id="automation.hallway",
    )
    incident = incidents.create_incident(
        (event,), "target", trace_evidence=evidence,
    )
    restored = codec.deserialize_incidents(codec.serialize_incidents((incident,)))
    assert restored == (incident,)

    bundle = export.build_export_bundle(restored[0])
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(bundle.data))) as archive:
        for name in archive.namelist():
            assert item_id not in archive.read(name).decode("utf-8")
        sanitized = json.loads(archive.read("incident.json"))
    trace = sanitized["incident"]["trace_evidence"]
    root = trace["reference"]
    child = trace["steps"][0]["child"]
    assert root["entity_id"].startswith("automation.entity_")
    assert child["entity_id"] == root["entity_id"]
    assert "item_id" not in root and "item_id" not in child


@pytest.mark.parametrize("item_id", [None, "", 42, {"id": "test"}, "x" * 161])
def test_trace_item_ids_still_require_bounded_strings(item_id):
    with pytest.raises(ValueError, match="item_id"):
        traces.normalize_trace_evidence(_projection(item_id))


def test_trace_item_id_at_length_limit_is_preserved():
    item_id = "x" * 160
    evidence = traces.normalize_trace_evidence(_projection(item_id))
    assert evidence.reference.item_id == item_id
    assert evidence.steps[0].child.item_id == item_id
