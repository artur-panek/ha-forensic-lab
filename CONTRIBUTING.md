# Contributing

HA Forensic Lab is pre-alpha. Small, reviewable changes are preferred over broad rewrites.

## Principles

1. Preserve the distinction between evidence and inference.
2. Avoid private Home Assistant APIs when a supported API exists.
3. Keep capture overhead bounded.
4. Do not add cloud dependencies for core forensic functionality.
5. Do not store more user data than the feature needs.

## Local checks

Use the Python version in .python-version, then run:

~~~bash
python -m pip install pytest ruff
ruff check custom_components tests
python -m compileall -q custom_components
pytest -q
~~~

Pull requests are also checked by hassfest and the HACS validation action.

## Home Assistant development test

For a real instance, copy or symlink:

~~~text
custom_components/ha_forensic_lab
~~~

into the test Home Assistant configuration's custom_components directory, restart Home Assistant, then add **HA Forensic Lab** from **Settings → Devices & services**.

The current foundation build should create a single config entry and expose an admin-only sidebar panel.

## Pull requests

A useful PR should state:

- the forensic problem it solves
- whether it changes stored data
- whether it changes evidence classification
- expected performance impact
- how it was tested
