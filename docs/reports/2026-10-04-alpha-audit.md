# Alpha candidate audit — 2026-10-04

Historical audit for the PR #21 consolidation. For current requirements, use
[the release checklist](../alpha-release-checklist.md).

Release status: **BLOCKED: real Home Assistant validation NOT RUN**.
Version remains `0.1.0-alpha.1`, Unreleased. No release tag is authorized by CI
alone. No tag was created during this audit.

## Repository topology and integration

The dependency order was #1 (already merged), then #2 → #3 → #4 → #5 → #6 →
#7 → #8 → #9 → #10 → #11 → #12 → #13 → #14 → #15 → #16 → #17 → #18 → #19 → #20.
Each open PR had a successful Validate run for its recorded head SHA.
The latest complete stack head was `80ba1bd88aa8a10f94c74789985b869eea0431fe`.
No open feature PR was redundant within that chain.

#2 and #3 were retargeted and merged sequentially with merge commits. #4 could
not merge against main because of an intermediate README conflict with main's
independent project-page/testing documentation. The full stack merges cleanly.
The consolidation branch therefore preserves every original feature commit,
merges current main without losing its README additions, and applies the audit
fixes separately. Do not squash/rebase the consolidation or delete stack branches
before verifying ancestry on main. Earlier PR discussions remain available.

The separate `hardening/release-prep` branch is not an open PR and is not in the
feature chain. It adds alternate release-process/contribution documentation
and review templates but no runtime implementation. The candidate uses #19/#20
for packaging and release instructions; this separate branch was left untouched.

## Code and packaging audit

The stack contains all requested alpha surfaces: four normalized event kinds,
pre-retention filtering and restored-snapshot filtering, native admin panel,
explicit parent-context vs same-context semantics, safe trace projection with
server validation, bounded durable incidents and frozen Review, safe-only ZIP
export, aggregate/versioned diagnostics, recorder health and existing brand.

The manual ZIP builder checks manifest/tag/changelog agreement and runtime-root
layout and writes a SHA-256 sidecar. Packaging determinism has regression tests.
Release remains tag-only and prerelease suffixes produce GitHub prereleases.
HACS uses the standard integration repository layout, not the manual ZIP mode.
The existing HACS description/topics metadata exceptions were not broadened.

## Defects fixed during repository audit

1. Trace structural fields accepted arbitrary token-shaped text, which could
   survive retention/export. Both JS projection and backend now validate a
   structural path vocabulary and explicit state/execution/branch values.
2. HA choose actions emit integer branch indexes. Projection discarded these.
   Numeric branch choices, including zero, are now retained as normalized text.
3. Direct script/named custom service calls exposed user-defined identity in the
   exported service field. Custom service names now receive stable aliases;
   direct script calls share the entity alias map. Sanitizer profile version 2.

Regression coverage includes secret-shaped structural fields, numeric branches,
and secret absence across an unpacked exported ZIP.

## Real-instance report

Home Assistant version: NOT RUN
HA Forensic Lab version: 0.1.0-alpha.1
Git commit SHA: record the final green main candidate, not this document's parent
CI candidate artifact: ha-forensic-lab-candidate-<full-main-sha>
Installation method: NOT RUN (planned: exact CI manual ZIP)
Approximate entity count: NOT MEASURED
Capture buffer: NOT MEASURED
Persistence interval: NOT MEASURED
Enabled event kinds: NOT MEASURED

| Gate | Result |
| --- | --- |
| Read-only smoke | NOT RUN |
| Install/config entry/options/sidebar/reload/unload/removal | NOT RUN |
| HA restart and rolling persistence | NOT RUN |
| Runtime event capture and timeline filtering | NOT RUN |
| Entity/domain/mixed-target/restored-snapshot privacy filters | NOT RUN |
| Explain semantics and explicit gaps | NOT RUN |
| Real retained HA trace enrichment | NOT RUN |
| Saved incident persistence/Review/delete after restart | NOT RUN |
| Real-instance sanitized export and checksum | NOT RUN |
| Diagnostics/health/logs/performance observation | NOT RUN |
| HACS prerelease visibility/install | NOT RUN (no release) |

Callback average: NOT MEASURED
Callback maximum: NOT MEASURED
Persistence failures: NOT MEASURED
Buffer utilization: NOT MEASURED

No HA connector, configured HA URL/token, or HA browser session was available in
the execution environment. Unit tests are not evidence of real HA compatibility.
See [alpha-testing.md](../alpha-testing.md) for the exact remaining manual matrix,
[installation.md](../installation.md) for installation, and
[known-limitations.md](../known-limitations.md) for documented product limits.

After downloading the exact main artifact and unpacking its outer archive, run
`sha256sum -c ha-forensic-lab.zip.sha256`, install only that inner ZIP, and record
its full source SHA and artifact digest before running the matrix. Every code
fix requires a new green exact-SHA artifact and affected-path retesting.
