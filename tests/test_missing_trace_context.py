"""Keep an unknown child context distinct from a captured context ID."""

import base64
import io
import json
import zipfile

import pytest

from tests.support import load_module

models = load_module("models")
incidents = load_module("incidents")
traces = load_module("trace_evidence")
export = load_module("export_bundle")


def _projection():
    return {
        "reference": {
            "context_id": "root-context",
            "domain": "automation",
            "item_id": "hallway",
            "run_id": "root-run",
        },
        "steps": [
            {
                "path": f"action/{index}",
                "child": {
                    "domain": "script",
                    "item_id": f"routine_{index}",
                    "run_id": f"run-{index}",
                },
            }
            for index in range(2)
        ],
    }


@pytest.mark.parametrize("explicit_null", [False, True])
def test_missing_child_context_stays_none_through_storage(explicit_null):
    raw = _projection()
    if explicit_null:
        for step in raw["steps"]:
            step["child"]["context_id"] = None

    evidence = traces.normalize_trace_evidence(raw)
    restored = traces.normalize_trace_evidence(traces.trace_evidence_to_dict(evidence))

    assert evidence == restored
    assert all(step.child.context_id is None for step in evidence.steps)
    assert evidence.reference.context_id == "root-context"


def _exported_trace(raw):
    event = models.ForensicEvent(
        event_id="target", kind=models.ForensicEventKind.STATE_CHANGED,
        timestamp=1.0, context_id="root-context", parent_context_id=None, user_id=None,
    )
    incident = incidents.create_incident(
        (event,), "target", trace_evidence=traces.normalize_trace_evidence(raw)
    )
    bundle = export.build_export_bundle(incident)
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(bundle.data))) as archive:
        return json.loads(archive.read("incident.json"))["incident"]["trace_evidence"]


def test_export_does_not_assign_a_shared_id_to_missing_child_contexts():
    trace = _exported_trace(_projection())

    assert all(step["child"]["context_id"] is None for step in trace["steps"])
    assert trace["reference"]["context_id"] is not None


def test_export_preserves_a_real_shared_context_as_one_alias():
    raw = _projection()
    for step in raw["steps"]:
        step["child"]["context_id"] = "root-context"

    trace = _exported_trace(raw)

    assert all(
        step["child"]["context_id"] == trace["reference"]["context_id"]
        for step in trace["steps"]
    )


def test_root_trace_still_requires_a_context():
    raw = _projection()
    del raw["reference"]["context_id"]

    with pytest.raises(ValueError, match="context_id"):
        traces.normalize_trace_evidence(raw)
