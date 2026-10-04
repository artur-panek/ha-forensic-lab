# Installation

HA Forensic Lab is currently an alpha candidate. It is not yet listed in the
default HACS repository catalogue.

Do not install it on a Home Assistant instance where an experimental custom
integration is unacceptable.

## HACS custom repository

### Test the unreleased candidate now

Minimum Home Assistant version: **2026.9.4**. Use an administrator account.
This is an experimental development install, with real-instance validation still
pending. A GitHub release is not required for a HACS custom repository.

[Open HA Forensic Lab in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=artur-panek&repository=ha-forensic-lab&category=integration)

If the button does not add/open the repository, follow these steps:

1. Open HACS in Home Assistant.
2. Open the custom repositories dialog.
3. Add:

   ~~~text
   https://github.com/artur-panek/ha-forensic-lab
   ~~~

4. Select **Integration** as the repository type.
5. Find **HA Forensic Lab**, choose **Download**, and install `main` (the default branch).
6. Restart Home Assistant when HACS requests it.
7. Open **Settings → Devices & services → Add integration**.
8. Search for **HA Forensic Lab** and add the single instance.

9. Open **HA Forensic Lab** in the sidebar. The timeline and Recorder health
   should appear; use **Configure** on the integration to change capture options.

HACS downloads the integration directory from the selected Git ref. The repository
intentionally does not enable `zip_release` or hide the default branch, so a
missing public release does not prevent this development installation.

### After the alpha release is published

Enable **Show beta versions** in the repository's HACS menu if needed, then select
`v0.1.0-alpha.1` (or the newer published prerelease) when downloading/updating.
A plain Git tag is not enough for a release entry in HACS; the GitHub Release
workflow must publish successfully.

### Exact candidate testing

A `main` install is convenient, but the branch can advance. For the release gate,
use the [exact-SHA CI candidate ZIP](alpha-testing.md#exact-candidate-build), verify
the checksum, and record the candidate SHA in the report. Do not mark HACS
installation or lifecycle checks passed merely because CI is green.

### If installation does not appear

- Confirm the custom repository type is **Integration**, not Dashboard.
- If previously added, use **Download information** to refresh its metadata.
- Restart Home Assistant after downloading the integration; a browser refresh
  alone cannot load new Python integration files.
- If **Add integration** still cannot find it, hard-refresh the browser and inspect
  Home Assistant logs for `ha_forensic_lab` setup/import errors.

### Default HACS catalogue

Custom-repository installation does not mean the project is in HACS's default
catalogue. Submission requires a release after validation, HACS validation without
ignored checks, repository topics, and an accepted PR to `hacs/default`.
The existing `topics` exception is tracked in [HACS readiness](hacs-readiness.md).

## Manual release ZIP

Every tagged release is intended to publish:

~~~text
ha-forensic-lab.zip
ha-forensic-lab.zip.sha256
~~~

The ZIP contains the integration files at its root.

Extract it into:

~~~text
<home-assistant-config>/custom_components/ha_forensic_lab/
~~~

The resulting directory should contain at least:

~~~text
custom_components/ha_forensic_lab/
├── __init__.py
├── manifest.json
├── config_flow.py
├── const.py
├── frontend/
└── brand/
~~~

Restart Home Assistant and add the integration from **Settings → Devices &
services**.

## Updating

For HACS installs, use the HACS update flow.

For manual installs:

1. stop Home Assistant or disable the integration
2. replace the complete `custom_components/ha_forensic_lab` directory with the
   new release ZIP contents
3. restart Home Assistant

Do not mix files from two releases.

## Removing

Remove the HA Forensic Lab config entry before deleting the custom integration
files.

Saved incidents and rolling snapshots are stored through Home Assistant private
storage. Removing the integration files alone is not a privacy/data-erasure
workflow.

## Alpha validation

Before treating a build as alpha-ready, run the checklist in
[alpha-release-checklist.md](alpha-release-checklist.md) against a real Home
Assistant instance.
