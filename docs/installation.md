# Installation

HA Forensic Lab is currently an alpha candidate. It is not yet listed in the
default HACS repository catalogue.

Do not install it on a Home Assistant instance where an experimental custom
integration is unacceptable.

## HACS custom repository

After an alpha release is published:

1. Open HACS in Home Assistant.
2. Open the custom repositories dialog.
3. Add:

   ~~~text
   https://github.com/artur-panek/ha-forensic-lab
   ~~~

4. Select **Integration** as the repository type.
5. Install **HA Forensic Lab**.
6. Restart Home Assistant when HACS requests it.
7. Open **Settings → Devices & services → Add integration**.
8. Search for **HA Forensic Lab** and add the single instance.

Pre-release versions may require enabling beta/pre-release versions in HACS.

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
