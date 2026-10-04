# HACS readiness

## Custom repository: prepared for development testing

Repository: `https://github.com/artur-panek/ha-forensic-lab`  
Type: **Integration**  
Minimum declared Home Assistant version: **2026.9.4**

[Open in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=artur-panek&repository=ha-forensic-lab&category=integration)

HACS can download the default branch before a GitHub release exists. Keep the
standard `custom_components/ha_forensic_lab/` layout. `zip_release` and
`hide_default_branch` intentionally remain unset. All runtime files and the
existing local brand icon are inside that integration directory.

The install/restart/config-entry/panel instructions are in
[installation.md](installation.md). Custom-repository installability is not a
claim that the real Home Assistant release checklist has passed.

The schema compatibility job installs the actual HA 2026.9.4 package and checks
options schemas, WebSocket defaults, required fields and validation error types.
It does not boot a real installation or validate lifecycle, restart persistence,
HACS UI or the forensic workflow. Those gates remain NOT RUN.

## Default catalogue: not submitted

Before submitting to `hacs/default`:

1. Complete the real-instance checklist and publish the approved alpha release.
2. Set GitHub repository topics (About → settings), for example:
   `home-assistant`, `hacs`, `custom-integration`, `forensics`, `automation`.
3. Remove the remaining `ignore: "topics"` from Validate and Release workflows
   and obtain green HACS validation without ignored checks.
4. Confirm description, issues, release, integration manifest and local brand
   asset requirements, then submit the repository to the alphabetical
   `integration` list in `hacs/default`.

At preparation time the repository had a description, enabled issues and no
topics. The old description exception was removed; the existing topics exception
remains explicit. The connected GitHub tools do not expose repository-topic
editing. This metadata omission does not require publishing an untested release
or prevent using a custom repository.

## Candidate identity after these changes

This change fixes schema compatibility, so the older `40da89e` candidate/report
is historical and must not be reused as evidence for this code. Download the new
`ha-forensic-lab-candidate-<full-main-sha>` artifact from the final green main run,
verify its ZIP checksum and record that SHA for real-instance testing.

## References

- [HACS integration requirements](https://www.hacs.xyz/docs/publish/integration/)
- [Adding a custom repository](https://www.hacs.xyz/docs/faq/custom_repositories/)
- [Default catalogue requirements](https://www.hacs.xyz/docs/publish/include/)
