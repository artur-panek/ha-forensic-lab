# Release process

HA Forensic Lab uses an evidence-based release gate. A green repository is not
by itself proof that a Home Assistant integration is ready to ship.

## 1. Finish the intended stack

- merge stacked PRs in dependency order
- resolve/rebase downstream PRs after each merge when necessary
- verify default-branch CI after the final merge
- update `CHANGELOG.md`

Do not publish a release from an unmerged stacked feature branch.

## 2. Run the real-instance gate

Follow:

- `docs/alpha-testing.md`
- `docs/alpha-release-checklist.md`

At minimum, verify:

- install/configure/reload/unload
- clean Home Assistant restart
- rolling persistence restoration
- capture exclusions after reload/restart
- Explain this change
- live trace enrichment
- saved incident persistence and durable Review
- sanitized export
- Recorder health and native diagnostics

Run the read-only smoke client after installation:

~~~bash
HA_URL="https://home.example" \
HA_TOKEN="<long-lived-access-token>" \
node scripts/alpha-smoke.mjs
~~~

## 3. Establish the compatibility floor

Only after real-instance testing:

1. record every Home Assistant version actually validated
2. choose the oldest version we are prepared to support
3. set the HACS `homeassistant` minimum in `hacs.json`
4. document the same floor in release notes
5. rerun HACS/hassfest/default-branch CI

Do not infer the compatibility floor merely because the code validates against
Home Assistant Core HEAD.

## 4. Prepare the version

Before the first tag:

- choose the alpha version/tag
- update `custom_components/ha_forensic_lab/manifest.json` version
- move relevant `CHANGELOG.md` entries from Unreleased to the version/date
- finalize `docs/alpha-release-notes.md`
- confirm README status language matches the release stage
- confirm HACS icon/branding
- confirm known limitations are current

## 5. Final privacy pass

Before every public release confirm:

- diagnostics contain aggregates only
- safe export tests still include seeded secret strings
- no raw-export path has appeared accidentally
- full HA trace variables/config/payloads are not persisted
- newly captured fields are reflected in sanitizer/export tests
- issue templates still tell testers not to post tokens/raw traces

## 6. Publish

Only after the release checklist is complete:

- create the git tag/release
- paste finalized release notes
- install/update the tagged build through the intended HACS path
- rerun the read-only smoke client on the tagged build

## 7. After publishing

For early alpha feedback, prioritize:

1. data loss/corruption
2. Home Assistant event-loop or stability regressions
3. privacy leaks
4. false causality/evidence classification
5. install/update failures
6. workflow/UI usability
7. additional feature requests

Do not expand capture scope in response to one report without considering
retention, performance and privacy impact.
