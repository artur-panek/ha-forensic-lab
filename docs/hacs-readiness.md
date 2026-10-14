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

The release-baseline compatibility job installs HA 2026.9.4 and checks
options/WebSocket schemas, incident writes (including disk failures) and the
final-write shutdown hook. A separate advisory lane checks current stable Core
2026.10.1 on pull requests, weekly schedules and manual runs. Both use temporary
test storage; neither boots a full installation or replaces exact-SHA testing
on a real Home Assistant instance.

## Default catalogue: not submitted

Before submitting to `hacs/default`:

1. Complete the real-instance checklist and publish the approved alpha release.
2. Keep repository topics (`home-assistant`, `hacs`, `custom-integration`,
   `forensics`, `automation`) set and verify them through HACS validation.
3. Require green HACS checks without exceptions in both Validate and Release workflows.
4. Confirm description, issues, release, integration manifest and local brand
   asset requirements, then submit the repository to the alphabetical
   `integration` list in `hacs/default`.

Repository topics are set. Both workflows now run HACS validation without topic exceptions.

## Candidate identity

Download `ha-forensic-lab-candidate-<full-main-sha>` from a green main run. Verify
its ZIP checksum and record the SHA used for real-instance testing. Reports for
older commits are historical and do not validate later code changes.

## References

- [HACS integration requirements](https://www.hacs.xyz/docs/publish/integration/)
- [Adding a custom repository](https://www.hacs.xyz/docs/faq/custom_repositories/)
- [Default catalogue requirements](https://www.hacs.xyz/docs/publish/include/)
