# Release process

Testing prereleases make a fixed build available through HACS. They are not a
claim that real-instance validation is complete. The release notes must state
which checks remain open, and the maintainer must explicitly approve publication.
A green workflow on its own is not that approval.

## Version contract

The version lives in `custom_components/ha_forensic_lab/manifest.json`. Its tag
must be exactly `v<VERSION>`, for example `v0.1.0-alpha.1`.

`scripts/build_release.py` rejects a mismatched tag, a missing changelog section
or missing runtime files. Release notes belong in `docs/releases/v<VERSION>.md`.

## Prepare a testing release

1. Merge and review the intended runtime fixes.
2. Run the repository and Home Assistant compatibility checks.
3. Set the manifest version, date the matching changelog entry, and write release
   notes with HACS instructions and any outstanding real-instance checks.
4. Review the release-preparation PR and its CI results.
5. Merge it to `main` when publication is intended.

For the first testing prerelease, the maintainer has requested HACS distribution
so the real-instance checklist can be completed using the tagged build. Its
unchecked items remain unchecked; the README and release notes say they are open.

## Publication

Release runs when a change to the manifest, release workflow or versioned release
notes reaches `main`. It also accepts a matching lightweight version tag or a
manual workflow run on `main`. No new version is published just because an
ordinary runtime fix is merged.

The workflow leaves an existing published version untouched. An existing draft
requires inspection rather than silently replacing its assets. It also rejects
a mismatched tag, a conflicting tag target and a main-branch build whose head
has advanced before publication.

For a new version, the workflow reruns:

- Ruff, Python compilation and repository tests;
- frontend syntax and regression tests;
- HA 2026.9.4 helper compatibility tests;
- hassfest and HACS validation;
- deterministic packaging and the version contract check.

It creates a draft with the exact tested commit as its target, uploads
`ha-forensic-lab.zip` and `ha-forensic-lab.zip.sha256`, downloads them again and
compares both files with the local build. Only then is the draft published.
Publication uses the workflow's short-lived GitHub token, not a personal token.

Versions containing `-` remain GitHub prereleases. In HACS, enable **Show beta
versions** and select the tagged version. Existing `main` installations may
need **Redownload** rather than an automatic update prompt.

## Local packaging check

~~~bash
python scripts/build_release.py --tag v0.1.0-alpha.1 --output dist
(cd dist && sha256sum --check ha-forensic-lab.zip.sha256)
~~~

The generated manual-install ZIP is deterministic for the same runtime files.
Documentation and workflow changes do not alter that ZIP.

## Failed publication

Inspect the failing job and any draft before retrying. Do not move a published
tag or overwrite published assets to hide a failed check. After publication,
fixes require a new version, for example `0.1.0-alpha.1` to `0.1.0-alpha.2`.

## Real-instance and stable-release gates

Complete [alpha-release-checklist.md](alpha-release-checklist.md) on an exact
release or candidate before calling the build alpha-ready. Record installation,
reload/restart, saved-incident review, exclusions, export and observed recorder
cost using [alpha-testing.md](alpha-testing.md). Never mark an item passed based
only on CI.

Remove the prerelease suffix only after the real-instance gates and supported
Home Assistant versions have been reviewed explicitly. This first HACS testing
release does not make `0.1.0` stable.
