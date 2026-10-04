"""Repository-level contract tests that do not require Home Assistant."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
CUSTOM_COMPONENTS = ROOT / "custom_components"
INTEGRATION = CUSTOM_COMPONENTS / "ha_forensic_lab"


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_exactly_one_custom_integration() -> None:
    """Keep the repository compatible with the intended HACS layout."""
    integrations = [
        path
        for path in CUSTOM_COMPONENTS.iterdir()
        if path.is_dir() and not path.name.startswith(".")
    ]

    assert integrations == [INTEGRATION]


def test_manifest_contract() -> None:
    """Guard the minimum public custom-integration manifest contract."""
    manifest = _read_json(INTEGRATION / "manifest.json")

    assert manifest["domain"] == INTEGRATION.name
    assert manifest["name"] == "HA Forensic Lab"
    assert manifest["version"]
    assert manifest["documentation"]
    assert manifest["issue_tracker"]
    assert manifest["codeowners"] == ["@artur-panek"]
    assert manifest["config_flow"] is True
    assert manifest["single_config_entry"] is True


def test_hacs_manifest_exists() -> None:
    """Keep the repository installable through HACS."""
    hacs = _read_json(ROOT / "hacs.json")

    assert hacs["name"] == "HA Forensic Lab"
