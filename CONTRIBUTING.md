# Contributing

Keep changes reviewable. Preserve context evidence semantics, bounded capture,
admin-only access and the separation between local evidence and sanitized export.
Use supported Home Assistant APIs and keep filesystem work off the event loop.

## Local checks

Use the Python version in `.python-version` and Node.js 24:

~~~bash
python -m pip install pytest ruff
ruff check custom_components tests scripts/build_release.py
python -m compileall -q custom_components scripts/build_release.py
pytest -q
for source in custom_components/ha_forensic_lab/frontend/*.js custom_components/ha_forensic_lab/frontend/*.mjs scripts/alpha-smoke.mjs; do
  node --check "$source"
done
node --test tests/js/*.mjs
python scripts/build_release.py --output dist
~~~

Pure Python tests load integration modules through `tests/support.py`, without
running HA setup. Tests in `tests/ha_runtime` skip when HA is absent. Run those
against the declared baseline in a separate virtual environment:

~~~bash
python -m pip install homeassistant==2026.9.4 pytest
python -m pytest -q tests/ha_runtime
~~~

These tests exercise HA schemas, storage and event-bus behavior in temporary
directories. They do not boot an installation or replace the
[real-instance test matrix](docs/alpha-testing.md). CI also runs hassfest and HACS
validation.

## Pull requests

Describe the problem, changed behavior and verification. Call out any changes to
stored data, evidence classification, privacy or capture cost. Add regression
tests for bugs; do not introduce an abstraction solely to make a test possible.

Use [installation.md](docs/installation.md) for deployment to a test instance.
Keep the version unreleased until the
[release checklist](docs/alpha-release-checklist.md) passes.
