#!/usr/bin/env python3
"""Build and validate a deterministic HA Forensic Lab release archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTEGRATION = ROOT / "custom_components" / "ha_forensic_lab"
MANIFEST = INTEGRATION / "manifest.json"
CHANGELOG = ROOT / "CHANGELOG.md"
DEFAULT_OUTPUT = ROOT / "dist"

REQUIRED_FILES = (
    "__init__.py",
    "manifest.json",
    "config_flow.py",
    "const.py",
    "strings.json",
)

EXCLUDED_PARTS = {
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
}

FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)


def read_version() -> str:
    """Return the integration version from manifest.json."""
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    version = data.get("version")
    if not isinstance(version, str) or not version:
        raise ValueError("manifest.json must contain a non-empty version")
    return version


def validate_release_contract(version: str, tag: str | None) -> str:
    """Validate version, optional tag and changelog contract."""
    expected_tag = f"v{version}"
    if tag is not None and tag != expected_tag:
        raise ValueError(
            f"release tag {tag!r} does not match manifest version {expected_tag!r}"
        )

    changelog = CHANGELOG.read_text(encoding="utf-8")
    if f"## [{version}]" not in changelog:
        raise ValueError(f"CHANGELOG.md has no section for {version}")

    for relative in REQUIRED_FILES:
        if not (INTEGRATION / relative).is_file():
            raise ValueError(f"required integration file is missing: {relative}")

    brand_icon = INTEGRATION / "brand" / "icon.png"
    if not brand_icon.is_file():
        raise ValueError("brand/icon.png is required for the release")

    return expected_tag


def release_files() -> tuple[Path, ...]:
    """Return runtime integration files in deterministic archive order."""
    files = []
    for path in INTEGRATION.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(INTEGRATION)
        if any(part in EXCLUDED_PARTS for part in relative.parts):
            continue
        if path.suffix in {".pyc", ".pyo"}:
            continue
        files.append(path)
    return tuple(sorted(files, key=lambda path: path.as_posix()))


def build_archive(output_dir: Path, version: str) -> tuple[Path, Path]:
    """Build the manual-install ZIP and SHA-256 checksum file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    archive_path = output_dir / "ha-forensic-lab.zip"

    with zipfile.ZipFile(
        archive_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path in release_files():
            relative = path.relative_to(INTEGRATION).as_posix()
            info = zipfile.ZipInfo(relative)
            info.date_time = FIXED_ZIP_TIME
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())

    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    checksum_path = output_dir / "ha-forensic-lab.zip.sha256"
    checksum_path.write_text(
        f"{digest}  {archive_path.name}\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(archive_path) as archive:
        names = set(archive.namelist())
        for relative in REQUIRED_FILES:
            if relative not in names:
                raise ValueError(f"release archive is missing: {relative}")
        if "brand/icon.png" not in names:
            raise ValueError("release archive is missing brand/icon.png")
        if any(name.startswith("custom_components/") for name in names):
            raise ValueError(
                "manual ZIP must contain integration files at archive root"
            )

        archived_manifest = json.loads(
            archive.read("manifest.json").decode("utf-8")
        )
        if archived_manifest.get("version") != version:
            raise ValueError("archive manifest version changed during packaging")

    return archive_path, checksum_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tag",
        help="Release tag to validate, for example v0.1.0-alpha.1",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output directory (default: dist)",
    )
    args = parser.parse_args()

    try:
        version = read_version()
        expected_tag = validate_release_contract(version, args.tag)
        archive, checksum = build_archive(args.output, version)
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(f"release contract failed: {exc}", file=sys.stderr)
        return 1

    print(f"version={version}")
    print(f"expected_tag={expected_tag}")
    print(f"archive={archive}")
    print(f"checksum={checksum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
