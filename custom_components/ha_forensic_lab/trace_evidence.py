"""Validated structural trace evidence for saved incidents."""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

TRACE_DOMAINS = frozenset({"automation", "script"})
MAX_TRACE_EVIDENCE_STEPS = 200

# Structural vocabulary only; a character allowlist also accepts secret text.
_PATH_PARTS = frozenset({
    "action", "sequence", "trigger", "condition", "conditions", "choose",
    "default", "if", "then", "else", "repeat", "while", "until", "parallel",
})
TRACE_STATES = frozenset({"running", "stopped"})
TRACE_EXECUTIONS = frozenset({
    "finished", "cancelled", "aborted", "error", "failed_single",
    "failed_max_runs", "disallowed_recursion_detected",
})
TRACE_CHOICES = frozenset({"then", "else", "default"})
_SAFE_TOKEN = re.compile(r"^[A-Za-z0-9_.:-]{1,160}$")


@dataclass(frozen=True, slots=True)
class TraceReference:
    """Reference to one retained Home Assistant automation/script trace."""

    context_id: str
    domain: str
    item_id: str
    run_id: str


@dataclass(frozen=True, slots=True)
class TraceStepEvidence:
    """Privacy-reduced structural trace step."""

    path: str
    child: TraceReference | None = None
    result: bool | None = None
    choice: str | None = None


@dataclass(frozen=True, slots=True)
class TraceEvidence:
    """Validated safe trace projection suitable for persistence."""

    reference: TraceReference
    state: str | None
    script_execution: str | None
    last_step: str | None
    steps: tuple[TraceStepEvidence, ...]
    truncated: bool


def normalize_trace_evidence(raw: object) -> TraceEvidence | None:
    """Normalize an untrusted client projection into the safe persistence model."""
    if raw is None:
        return None
    if not isinstance(raw, Mapping):
        raise ValueError("trace_evidence must be an object")

    reference = _reference(raw.get("reference"), require_context=True)

    raw_steps = raw.get("steps", [])
    if not isinstance(raw_steps, list):
        raise ValueError("trace_evidence.steps must be a list")
    if len(raw_steps) > MAX_TRACE_EVIDENCE_STEPS:
        raise ValueError(
            f"trace_evidence exceeds {MAX_TRACE_EVIDENCE_STEPS} structural steps"
        )

    steps = tuple(_step(step) for step in raw_steps)

    truncated = raw.get("truncated", False)
    if not isinstance(truncated, bool):
        raise ValueError("trace_evidence.truncated must be a boolean")

    return TraceEvidence(
        reference=reference,
        state=_optional_enum(raw.get("state"), "state", TRACE_STATES),
        script_execution=_optional_enum(
            raw.get("script_execution"),
            "script_execution",
            TRACE_EXECUTIONS,
        ),
        last_step=_optional_path(raw.get("last_step"), "last_step"),
        steps=steps,
        truncated=truncated,
    )


def trace_evidence_to_dict(evidence: TraceEvidence | None) -> dict[str, Any] | None:
    """Serialize validated trace evidence."""
    if evidence is None:
        return None

    return {
        "reference": _reference_to_dict(evidence.reference),
        "state": evidence.state,
        "script_execution": evidence.script_execution,
        "last_step": evidence.last_step,
        "steps": [_step_to_dict(step) for step in evidence.steps],
        "truncated": evidence.truncated,
    }


def _step(raw: object) -> TraceStepEvidence:
    if not isinstance(raw, Mapping):
        raise ValueError("trace step must be an object")

    result = raw.get("result")
    if result is not None and not isinstance(result, bool):
        raise ValueError("trace step result must be boolean")

    child_raw = raw.get("child")
    child = None if child_raw is None else _reference(child_raw, require_context=False)

    return TraceStepEvidence(
        path=_required_path(raw.get("path"), "path"),
        child=child,
        result=result,
        choice=_choice(raw.get("choice")),
    )


def _reference(raw: object, *, require_context: bool) -> TraceReference:
    if not isinstance(raw, Mapping):
        raise ValueError("trace reference must be an object")

    domain = _required_token(raw.get("domain"), "domain")
    if domain not in TRACE_DOMAINS:
        raise ValueError("trace reference domain must be automation or script")

    context_value = raw.get("context_id")
    if require_context:
        context_id = _required_token(context_value, "context_id")
    else:
        context_id = (
            _optional_token(context_value, "context_id")
            or "child-context-unavailable"
        )

    return TraceReference(
        context_id=context_id,
        domain=domain,
        item_id=_required_token(raw.get("item_id"), "item_id"),
        run_id=_required_token(raw.get("run_id"), "run_id"),
    )


def _step_to_dict(step: TraceStepEvidence) -> dict[str, Any]:
    result: dict[str, Any] = {"path": step.path}
    if step.child is not None:
        child = _reference_to_dict(step.child)
        if step.child.context_id == "child-context-unavailable":
            child["context_id"] = None
        result["child"] = child
    if step.result is not None:
        result["result"] = step.result
    if step.choice is not None:
        result["choice"] = step.choice
    return result


def _reference_to_dict(reference: TraceReference) -> dict[str, Any]:
    return {
        "context_id": reference.context_id,
        "domain": reference.domain,
        "item_id": reference.item_id,
        "run_id": reference.run_id,
    }


def _required_token(value: object, field: str) -> str:
    if not isinstance(value, str) or not _SAFE_TOKEN.fullmatch(value):
        raise ValueError(f"trace_evidence.{field} is not a safe token")
    return value


def _optional_token(value: object, field: str) -> str | None:
    if value is None:
        return None
    return _required_token(value, field)


def _required_path(value: object, field: str) -> str:
    if (
        not isinstance(value, str)
        or not 1 <= len(value) <= 180
        or any(
            part not in _PATH_PARTS and not re.fullmatch(r"[0-9]{1,6}", part)
            for part in value.split("/")
        )
    ):
        raise ValueError(f"trace_evidence.{field} is not a safe path")
    return value


def _optional_path(value: object, field: str) -> str | None:
    if value is None:
        return None
    return _required_path(value, field)


def _optional_enum(value: object, field: str, allowed: frozenset[str]) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value not in allowed:
        raise ValueError(f"trace_evidence.{field} is not an allowed structural value")
    return value


def _choice(value: object) -> str | None:
    # HA choose actions report integer branch indexes, unlike if/else actions.
    if type(value) is int and 0 <= value <= 999999:
        return str(value)
    if isinstance(value, str) and re.fullmatch(r"[0-9]{1,6}", value):
        return value
    return _optional_enum(value, "choice", TRACE_CHOICES)
