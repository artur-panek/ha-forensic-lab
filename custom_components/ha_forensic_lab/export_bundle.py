"""Build portable sanitized incident export bundles."""

from __future__ import annotations

import base64
import hashlib
import io
import json
import zipfile
from dataclasses import dataclass
from typing import Any

from .incidents import Incident
from .sanitizer import SANITIZER_PROFILE, SANITIZER_VERSION, sanitize_incident

BUNDLE_SCHEMA_VERSION = 1


@dataclass(frozen=True, slots=True)
class ExportBundle:
    """A sanitized ZIP bundle ready for transport over the WebSocket API."""

    filename: str
    content_type: str
    encoding: str
    data: str
    sha256: str
    size_bytes: int
    profile: str


def build_export_bundle(incident: Incident) -> ExportBundle:
    """Create a deterministic-layout sanitized ZIP bundle."""
    sanitized = sanitize_incident(incident)

    incident_json = _json_bytes(sanitized)
    manifest = {
        "bundle_schema_version": BUNDLE_SCHEMA_VERSION,
        "sanitizer_profile": SANITIZER_PROFILE,
        "sanitizer_version": SANITIZER_VERSION,
        "event_count": sanitized["incident"]["event_count"],
        "files": ["manifest.json", "incident.json", "summary.md"],
    }
    manifest_json = _json_bytes(manifest)
    summary = _summary_markdown(sanitized).encode("utf-8")

    buffer = io.BytesIO()
    with zipfile.ZipFile(
        buffer,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        _write_zip_member(archive, "manifest.json", manifest_json)
        _write_zip_member(archive, "incident.json", incident_json)
        _write_zip_member(archive, "summary.md", summary)

    payload = buffer.getvalue()
    digest = hashlib.sha256(payload).hexdigest()

    return ExportBundle(
        filename=f"ha-forensic-lab-{incident.incident_id[:8]}.zip",
        content_type="application/zip",
        encoding="base64",
        data=base64.b64encode(payload).decode("ascii"),
        sha256=digest,
        size_bytes=len(payload),
        profile=SANITIZER_PROFILE,
    )


def _json_bytes(value: Any) -> bytes:
    return (
        json.dumps(
            value,
            indent=2,
            sort_keys=True,
            ensure_ascii=False,
        )
        + "\n"
    ).encode("utf-8")


def _write_zip_member(
    archive: zipfile.ZipFile,
    filename: str,
    data: bytes,
) -> None:
    info = zipfile.ZipInfo(filename)
    info.date_time = (1980, 1, 1, 0, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o600 << 16
    archive.writestr(info, data)


def _summary_markdown(sanitized: dict[str, Any]) -> str:
    incident = sanitized["incident"]
    policy = sanitized["sanitizer"]["policy"]

    return (
        "# HA Forensic Lab sanitized incident\n\n"
        f"- Events: {incident['event_count']}\n"
        f"- Window duration: {incident['window_duration_seconds']} seconds\n"
        f"- Target event: {incident['target_event_id']}\n"
        f"- Sanitizer profile: {SANITIZER_PROFILE} v{SANITIZER_VERSION}\n\n"
        "## Sanitization\n\n"
        f"- Absolute timestamps: {policy['absolute_timestamps']}\n"
        f"- Entity IDs: {policy['entity_ids']}\n"
        f"- Context IDs: {policy['context_ids']}\n"
        f"- User IDs: {policy['user_ids']}\n"
        f"- Free text: {policy['free_text']}\n"
        f"- State values: {policy['state_values']}\n\n"
        "This bundle contains normalized forensic evidence only. "
        "It does not contain raw Home Assistant event payloads.\n"
    )
