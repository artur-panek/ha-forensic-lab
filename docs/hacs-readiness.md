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

The compatibility job installs HA 2026.9.4 and checks options/WebSocket schemas,
incident writes (including disk failures) and the final-write shutdown hook.
It uses temporary test storage and does not boot a full installation. The
exact-SHA real-instance matrix remains incomplete.

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

The workflows currently ignore the missing repository topics check. This does
not prevent custom-repository installation; remove the exception before a
default-catalogue submission.

## Candidate identity

Download `ha-forensic-lab-candidate-<full-main-sha>` from a green main run. Verify
its ZIP checksum and record the SHA used for real-instance testing. Reports for
older commits are historical and do not validate later code changes.

## References

- [HACS integration requirements](https://www.hacs.xyz/docs/publish/integration/)
- [Adding a custom repository](https://www.hacs.xyz/docs/faq/custom_repositories/)
- [Default catalogue requirements](https://www.hacs.xyz/docs/publish/include/)
