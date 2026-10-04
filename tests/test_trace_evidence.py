"""Tests for server-side trace evidence normalization."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
MODULE_PATH = INTEGRATION / "trace_evidence.py"


def _load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


trace_evidence = _load_module("ha_forensic_lab_trace_evidence_test", MODULE_PATH)


def _raw_projection():
    return {
        "status": "available",
        "reference": {
            "context_id": "ctx_01",
            "domain": "automation",
            "item_id": "hallway_lights",
            "run_id": "run_01",
            "secret": "DO-NOT-PERSIST-REFERENCE-SECRET",
        },
        "state": "stopped",
        "script_execution": "finished",
        "last_step": "action/1",
        "steps": [
            {
                "path": "condition/0",
                "result": True,
                "changed_variables": {
                    "token": "DO-NOT-PERSIST-VARIABLE",
                },
            },
            {
                "path": "action/0/choose/1",
                "choice": "then",
                "child": {
                    "domain": "script",
                    "item_id": "movie_mode",
                    "run_id": "child_run",
                    "extra": "DO-NOT-PERSIST-CHILD-SECRET",
                },
                "arbitrary_result": "DO-NOT-PERSIST-RESULT",
            },
        ],
        "config": "DO-NOT-PERSIST-CONFIG",
    }


def test_normalization_keeps_only_allowlisted_trace_structure() -> None:
    evidence = trace_evidence.normalize_trace_evidence(_raw_projection())

    assert evidence is not None
    assert evidence.reference.domain == "automation"
    assert evidence.reference.item_id == "hallway_lights"
    assert evidence.state == "stopped"
    assert evidence.script_execution == "finished"
    assert evidence.last_step == "action/1"
    assert len(evidence.steps) == 2
    assert evidence.steps[0].result is True
    assert evidence.steps[1].choice == "then"
    assert evidence.steps[1].child is not None
    assert evidence.steps[1].child.domain == "script"

    serialized = json.dumps(
        trace_evidence.trace_evidence_to_dict(evidence),
        sort_keys=True,
    )
    for secret in (
        "DO-NOT-PERSIST-REFERENCE-SECRET",
        "DO-NOT-PERSIST-VARIABLE",
        "DO-NOT-PERSIST-CHILD-SECRET",
        "DO-NOT-PERSIST-RESULT",
        "DO-NOT-PERSIST-CONFIG",
    ):
        assert secret not in serialized


def test_normalization_rejects_unsafe_path() -> None:
    raw = _raw_projection()
    raw["steps"][0]["path"] = "action/<script>alert(1)</script>"

    try:
        trace_evidence.normalize_trace_evidence(raw)
    except ValueError as error:
        assert "safe path" in str(error)
    else:
        raise AssertionError("Expected ValueError")


def test_normalization_rejects_more_than_step_limit() -> None:
    raw = _raw_projection()
    raw["steps"] = [
        {"path": f"action/{index}"}
        for index in range(trace_evidence.MAX_TRACE_EVIDENCE_STEPS + 1)
    ]

    try:
        trace_evidence.normalize_trace_evidence(raw)
    except ValueError as error:
        assert "structural steps" in str(error)
    else:
        raise AssertionError("Expected ValueError")


def test_none_means_incident_without_trace_evidence() -> None:
    assert trace_evidence.normalize_trace_evidence(None) is None


def test_structural_fields_reject_secret_tokens() -> None:
    import pytest

    for field in ("state", "script_execution", "last_step"):
        raw = _raw_projection()
        raw[field] = "SECRET_TOKEN_123"
        with pytest.raises(ValueError):
            trace_evidence.normalize_trace_evidence(raw)
    for field in ("path", "choice"):
        raw = _raw_projection()
        raw["steps"][0][field] = "SECRET_TOKEN_123"
        with pytest.raises(ValueError):
            trace_evidence.normalize_trace_evidence(raw)


def test_numeric_choose_branch_is_preserved() -> None:
    raw = _raw_projection()
    raw["steps"][1]["choice"] = 0
    evidence = trace_evidence.normalize_trace_evidence(raw)
    assert evidence.steps[1].choice == "0"
