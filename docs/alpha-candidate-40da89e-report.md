# Exact candidate report — 2026-10-04

**Release blocked. No real Home Assistant checks were run. No tag or release
was created.** This report is kept on a separate reporting branch so recording
results does not move the exact candidate main commit.

## Candidate identity

- Home Assistant version: NOT RUN
- HA Forensic Lab version: `0.1.0-alpha.1` (Unreleased)
- Git commit SHA: `40da89e3b42a93dea1fb9749d82d6aa5d578d620`
- CI candidate artifact: `ha-forensic-lab-candidate-40da89e3b42a93dea1fb9749d82d6aa5d578d620`
- Artifact ID: `11312422230`
- [Download artifact from Validate run 37228244801](https://github.com/artur-panek/ha-forensic-lab/actions/runs/37228244801/artifacts/11312422230)
- Artifact expires: 2026-10-18 19:26 UTC
- Outer artifact SHA-256: `b2160c9acb28f5cbea33746aa1909dc251e701e9199bf824adcd31acd1a476b6`
- Inner `ha-forensic-lab.zip` SHA-256: `07a50aefaa1d7a1d89b5b96be18f86f71cbd3e7f7f7c91f9b0aa45b97bc3cfa5`
- Installation method tested: NOT RUN; intended test method is the exact CI manual ZIP.
- Approximate entity count: NOT MEASURED
- Capture buffer: NOT MEASURED (code default 2048, configurable 256–8192)
- Persistence interval: NOT MEASURED (code default 10 seconds, configurable 5–60)
- Enabled event kinds: NOT MEASURED (code default: all four kinds)

## Repository validation — PASS

Final main Validate run: [37228244801](https://github.com/artur-panek/ha-forensic-lab/actions/runs/37228244801).
All HACS, hassfest and Code checks jobs completed successfully. Code checks
include Ruff, compile, pytest, JS syntax, trace projection tests and deterministic
release packaging. Local Python 3.14 regression suite: 64 tests passed.

The actual downloaded CI artifact was inspected, not inferred from a local
build. Its outer digest matched GitHub metadata. It contained exactly the manual
ZIP and SHA-256 sidecar. The inner checksum matched the sidecar; all 27 runtime
files matched the exact main source, the manifest was `0.1.0-alpha.1`, and files
were at the archive root. The tag/manifest/changelog contract passed locally
without creating a tag.

## Integration and fixes

#2 and #3 merged sequentially. #4 encountered an intermediate README conflict.
[Consolidation PR #21](https://github.com/artur-panek/ha-forensic-lab/pull/21)
merged the full remaining stack with main, preserving the original feature
commits and main's independent README additions. Every #2–#20 head was verified
as an ancestor of final main; GitHub marks all those PRs merged. No branch was
deleted and main was never force-pushed. No open PR remains from the stack.

Actual defects fixed:

- `852e6f0dfcc1062c7ad65955956ce50bffeec9c6`: reject arbitrary token-shaped
  secrets in trace structural fields; preserve HA integer choose-branch indexes.
- `75aafcb1b72b059790f03e1a924d4395b9c7a575`: pseudonymize custom service names
  in safe exports, including direct script identity; negative ZIP regression.
- Documentation distinguishes defaults from configurable retention limits.

## Real-instance validation

| Gate | Status | Remaining check |
| --- | --- | --- |
| Smoke | NOT RUN | Run read-only client against installed exact candidate |
| Lifecycle | NOT RUN | Install/update, config flow, exactly one entry, admin sidebar, options flow, reload, unload, removal |
| Restart persistence | NOT RUN | Completed rolling write, HA restart, restored evidence, smaller buffer persistence |
| Runtime capture/filtering | NOT RUN | State, service, automation and script events; timeline entity/kind filters |
| Privacy filters | NOT RUN | Entity/domain exclusion, mixed allowed/excluded service targets, reload/restart and restored-snapshot filtering |
| Explain | NOT RUN | Disposable automation/service action; parent-context vs same-context labels; explicit missing-evidence gap |
| Trace enrichment | NOT RUN | Retained HA trace; paths/conditions/branches/child references; no config, variables, blueprint inputs or raw results |
| Saved incident Review | NOT RUN | Save/list/get, frozen trace, restart, review without live buffer, delete and verify persistence |
| Sanitized export | NOT RUN | Seed recognizable secrets; export/unpack; no secrets/user IDs/absolute times; stable aliases and matching checksum |
| Diagnostics/health/logs | NOT RUN | Aggregate-only diagnostics; installed version; health counters; integration errors, blocking warnings and persistence exceptions |
| Activity/performance | NOT RUN | Normal-use and busy/synthetic activity observations without invented thresholds |
| HACS install/visibility | NOT RUN | Custom repository install path; prerelease visibility after an authorized release |

Callback average: NOT MEASURED
Callback maximum: NOT MEASURED
Persistence failures: NOT MEASURED
Buffer utilization: NOT MEASURED

No configured HA endpoint/token, HA connector or HA browser session was available
in this execution environment. No smart-home entities or automations were changed.
Repository tests are not a substitute for any row above.

## Exact test handoff

1. Download the artifact linked above. Verify the outer archive if desired:

   ```bash
   sha256sum <downloaded-artifact.zip>
   ```

   It must match the outer digest in this report.

2. Unpack the outer artifact into an empty working directory. From that directory:

   ```bash
   sha256sum -c ha-forensic-lab.zip.sha256
   ```

   Expected: `ha-forensic-lab.zip: OK`, and the inner digest listed above.

3. Following [installation.md](installation.md), extract only the inner ZIP into
   `<HA config>/custom_components/ha_forensic_lab/`. Do not mix versions. Restart
   HA, add the integration and confirm its version.
4. Check out the source SHA above and run the read-only smoke client with Node 22+.
   Enter the token locally; do not put it in an issue/report or command history:

   ```bash
   read -r -p 'HA URL: ' HA_URL
   read -r -s -p 'HA admin token: ' HA_TOKEN
   echo
   export HA_URL HA_TOKEN
   node scripts/alpha-smoke.mjs
   unset HA_TOKEN
   ```

5. Complete every row above using disposable test helpers/automation/script and
   the detailed [manual matrix](alpha-testing.md). Record actual version,
   settings, metrics, logs observations and PASS/FAIL; leave unchecked work NOT RUN.
6. If defects require code fixes, create a new PR, rerun full CI and obtain a new
   exact-main-SHA candidate. Update this report and retest affected paths.
7. Only after blocking checks pass: date the changelog, verify final CI and
   runtime package identity, tag the matching version, verify prerelease flag,
   both release assets and checksum, then check HACS prerelease installation.

Known limitations remain those in [known-limitations.md](known-limitations.md):
rolling hard-crash loss window, finite HA trace retention, explicit context gaps,
same-context order not direct causation, safe-only export, bounded incidents,
and saved incidents not retroactively rewritten by rolling privacy filters.
