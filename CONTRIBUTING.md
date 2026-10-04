# Contributing

HA Forensic Lab is pre-alpha. Small, reviewable changes are preferred over broad
rewrites.

## Principles

1. Preserve the distinction between evidence and inference.
2. Avoid private Home Assistant APIs when a supported API exists.
3. Keep capture overhead bounded and measurable.
4. Do not add cloud dependencies for core forensic functionality.
5. Do not retain more user data than a feature needs.
6. Treat every newly retained/exported field as a privacy and sanitization
   decision.
7. Do not claim Home Assistant version compatibility without real-instance
   validation.

## Local checks

Use the Python version in `.python-version`, then run:

~~~bash
python -m pip install pytest ruff
ruff check custom_components tests
python -m compileall -q custom_components
node --check custom_components/ha_forensic_lab/frontend/ha-forensic-lab-panel.js
node --check custom_components/ha_forensic_lab/frontend/trace-projection.mjs
node --check scripts/alpha-smoke.mjs
node tests/js/test_trace_projection.mjs
pytest -q
~~~

Pull requests are also checked by hassfest and the HACS validation action.

## Home Assistant development test

For a development instance, copy or symlink:

~~~text
custom_components/ha_forensic_lab
~~~

into the Home Assistant configuration's `custom_components` directory,
restart Home Assistant, then add **HA Forensic Lab** from
**Settings → Devices & services**.

For release-level validation, follow `docs/alpha-testing.md`; a simple import
or config-flow check is not sufficient.

## Pull requests

Use the repository pull-request template. A useful PR should explain:

- the forensic/user problem it solves
- any evidence-semantics change
- retained-data/storage impact
- privacy/sanitization impact
- expected capture/event-loop/storage performance impact
- automated and real-instance testing
- documentation changes

UI PRs should include screenshots when practical.

## New capture fields

Before adding a new normalized field, answer all of the following:

1. Which investigation requires it?
2. Does it need rolling persistence?
3. Does it need to be copied into saved incidents?
4. Can it contain free text, identifiers, secrets or location data?
5. How will safe export handle it?
6. How will diagnostics avoid exposing it?
7. What is the event-loop/storage cost?

If those answers are unclear, the field should not be added yet.

## Alpha testing

The read-only smoke client and manual matrix are documented in
`docs/alpha-testing.md`.

Do not paste tokens or raw Home Assistant traces into public issues. Prefer the
native aggregate diagnostics and safe incident export.
