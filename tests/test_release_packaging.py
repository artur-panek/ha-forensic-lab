"""Release packaging contract tests."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from scripts import build_release as builder


def test_manifest_version_has_matching_changelog_section() -> None:
    version = builder.read_version()

    expected_tag = builder.validate_release_contract(version, None)

    assert expected_tag == f"v{version}"
    assert version == "0.1.0-alpha.1"


def test_release_tag_must_match_manifest_version() -> None:
    version = builder.read_version()

    with pytest.raises(ValueError, match="does not match manifest version"):
        builder.validate_release_contract(version, "v9.9.9")


def test_manual_release_zip_is_deterministic_and_has_runtime_root(
    tmp_path: Path,
) -> None:
    version = builder.read_version()

    first_dir = tmp_path / "first"
    second_dir = tmp_path / "second"
    first_zip, first_sha = builder.build_archive(first_dir, version)
    second_zip, second_sha = builder.build_archive(second_dir, version)

    assert first_zip.read_bytes() == second_zip.read_bytes()
    assert first_sha.read_text() == second_sha.read_text()

    with zipfile.ZipFile(first_zip) as archive:
        names = archive.namelist()
        assert "__init__.py" in names
        assert "manifest.json" in names
        assert "brand/icon.png" in names
        assert not any(name.startswith("custom_components/") for name in names)
        assert not any("__pycache__" in name for name in names)

        manifest = json.loads(archive.read("manifest.json"))

    assert manifest["version"] == version
