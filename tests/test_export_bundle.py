"""Tests for sanitized portable incident export bundles."""

from __future__ import annotations

import base64
import hashlib
import importlib.util
import io
import json
import sys
import zipfile
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
PACKAGE = "ha_forensic_lab_export_test"


def _load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


package = ModuleType(PACKAGE)
package.__path__ = [str(INTEGRATION)]
sys.modules[PACKAGE] = package

models = _load_module(f"{PACKAGE}.models", INTEGRATION / "models.py")
incidents = _load_module(f"{PACKAGE}.incidents", INTEGRATION / "incidents.py")
sanitizer = _load_module(f"{PACKAGE}.sanitizer", INTEGRATION / "sanitizer.py")
export_bundle = _load_module(
    f"{PACKAGE}.export_bundle",
    INTEGRATION / "export_bundle.py",
)


def _incident():
    event = models.ForensicEvent(
        event_id="secret-session:00000001",
        kind=models.ForensicEventKind.AUTOMATION_TRIGGERED,
        timestamp=11.0,
        context_id="secret-context",
        parent_context_id="secret-parent",
        user_id="secret-user",
        entity_id="automation.private_rule",
        domain="automation",
        name="Highly private automation",
        source="Private sensor changed",
    )
    return incidents.Incident(
        incident_id="incident-abcdef123456",
        title="Private incident title",
        created_at=99.0,
        target_event_id=event.event_id,
        window_start=10.0,
        window_end=70.0,
        events=(event,),
    )


def test_export_bundle_is_sanitized_zip_with_integrity_hash() -> None:
    bundle = export_bundle.build_export_bundle(_incident())

    payload = base64.b64decode(bundle.data)

    assert bundle.filename == "ha-forensic-lab-incident.zip"
    assert bundle.content_type == "application/zip"
    assert bundle.encoding == "base64"
    assert bundle.profile == "safe"
    assert bundle.size_bytes == len(payload)
    assert bundle.sha256 == hashlib.sha256(payload).hexdigest()

    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        assert archive.namelist() == [
            "manifest.json",
            "incident.json",
            "summary.md",
        ]
        combined = b"\n".join(archive.read(name) for name in archive.namelist())
        manifest = json.loads(archive.read("manifest.json"))
        incident = json.loads(archive.read("incident.json"))

    decoded = combined.decode("utf-8")
    for secret in (
        "secret-session",
        "secret-context",
        "secret-parent",
        "secret-user",
        "private_rule",
        "Highly private automation",
        "Private sensor changed",
        "Private incident title",
    ):
        assert secret not in decoded

    assert sanitizer.REDACTED in decoded
    assert manifest["sanitizer_profile"] == "safe"
    assert manifest["event_count"] == 1
    assert incident["incident"]["events"][0]["user_id"] is None


def test_export_bundle_output_is_deterministic_for_same_incident() -> None:
    first = export_bundle.build_export_bundle(_incident())
    second = export_bundle.build_export_bundle(_incident())

    assert first.data == second.data
    assert first.sha256 == second.sha256
