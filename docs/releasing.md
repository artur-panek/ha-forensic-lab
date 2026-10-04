# Release process

HA Forensic Lab releases are intentionally gated. A green repository CI run is
necessary but is not sufficient evidence for publishing an alpha.

## Version contract

The release version lives in:

~~~text
custom_components/ha_forensic_lab/manifest.json
~~~

A release tag must be exactly:

~~~text
v<VERSION>
~~~

For example:

~~~text
manifest version: 0.1.0-alpha.1
tag:              v0.1.0-alpha.1
~~~

`scripts/build_release.py` fails when the tag and manifest version disagree or
when `CHANGELOG.md` has no matching version section.

## Before tagging

1. Merge the stacked implementation PRs in dependency order.
2. Run the full repository validation suite on the resulting default branch.
3. Install that exact commit on a real Home Assistant instance.
4. Complete every blocking item in
   [alpha-release-checklist.md](alpha-release-checklist.md).
5. Record real-instance observations using the alpha test matrix.
6. Review [known-limitations.md](known-limitations.md).
7. Confirm the changelog accurately describes the candidate.
8. Confirm `manifest.json` contains the version you intend to tag.

Do **not** tag a release merely because CI is green.

## Local packaging check

~~~bash
python scripts/build_release.py --output dist
~~~

For an exact tag contract check:

~~~bash
python scripts/build_release.py \
  --tag v0.1.0-alpha.1 \
  --output dist
~~~

The generated manual-install ZIP is deterministic for the same source tree.

## Publishing

After the real-instance gate has passed, create and push the exact version tag:

~~~bash
git tag v0.1.0-alpha.1
git push origin v0.1.0-alpha.1
~~~

The Release workflow then re-runs:

- Ruff
- Python compilation
- pytest
- frontend JavaScript checks
- trace projection tests
- hassfest
- HACS validation
- release contract validation

Only after those checks succeed does it publish the GitHub release and attach:

- `ha-forensic-lab.zip`
- `ha-forensic-lab.zip.sha256`

Tags containing `-` are published as GitHub pre-releases.

## Failed release workflow

Do not move or reuse a published tag to hide a failed release.

Fix the problem, bump the pre-release version, update the changelog, and create
a new tag.

Example:

~~~text
0.1.0-alpha.1 → 0.1.0-alpha.2
~~~

## Stable release

The alpha process does not imply that `0.1.0` is ready.

Remove the pre-release suffix only after the known alpha gates and compatibility
expectations have been revisited explicitly.
