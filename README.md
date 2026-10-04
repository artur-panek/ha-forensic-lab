<p align="center">
  <img src="assets/brand/ha-forensic-lab-mark.svg" width="180" alt="HA Forensic Lab logo">
</p>

<h1 align="center">HA Forensic Lab</h1>

<p align="center"><strong>Runtime forensics and incident analysis for Home Assistant.</strong></p>

By [Artur Panek](https://artur.panek.tech/) · [Project page](https://artur.panek.tech/work/ha-forensic-lab/)

HA Forensic Lab is an experimental Home Assistant custom integration for reconstructing **what happened, in what order, and why**.

The project is deliberately evidence-first: it should record facts before interpreting them, and it must never present a timing correlation as proven causation.

> [!IMPORTANT]
> **0.1.0-alpha.1 is an unreleased alpha candidate.** Repository CI, packaging and smoke tooling do not by themselves prove real-instance compatibility. The first public pre-release must not be tagged until the real Home Assistant alpha checklist has passed.

## The problem

Home Assistant already exposes history, logbook entries and automation traces, but debugging an incident often means jumping between several views while already knowing which automation to inspect.

HA Forensic Lab is intended to start from the incident instead:

> Why did this entity change at 19:42?

and reconstruct the surrounding chain of states, service calls, automations, scripts and Home Assistant contexts.

## Evidence model

Every relationship shown by HA Forensic Lab must carry an evidence class:

- **Confirmed**: backed by Home Assistant context IDs, parent contexts, trace data or another direct runtime link.
- **Correlated**: nearby in time or otherwise associated, but not proven to be causal.

The UI must make those classes visually distinct.

## v0.1 alpha candidate

Implemented on `main`:

- bounded normalized runtime capture
- configurable event-type/entity/domain capture filters
- configurable rolling capacity and persistence cadence
- private atomic rolling snapshot persistence
- searchable admin-only runtime timeline
- deterministic context-based **Explain this change**
- privacy-reduced automation/script trace enrichment
- durable saved incidents with Review independent from the live rolling buffer
- safe-only sanitized ZIP incident export
- privacy-safe aggregate diagnostics and Recorder health
- production waveform/lens visual identity
- read-only real-instance smoke client
- deterministic alpha packaging and tag/version release contract

Capture filters are applied before rolling retention and persistence, including to
a restored rolling snapshot after an options change. See
[`docs/capture-settings.md`](docs/capture-settings.md).

Saved incidents are bounded to 50 records and 500 frozen events per record.

Safe export preserves diagnostic structure but pseudonymizes identifiers,
removes user IDs and absolute timestamps, redacts free text and only retains a
small allowlist of generic state values. v0.1 has no raw-export mode.

Still intentionally outside the first alpha:

- timing-only correlated evidence
- anomaly detection
- AI root-cause summaries

## Installation

The project is not yet in the default HACS catalogue.

For development testing, add this repository to HACS as **Integration** and
install the default branch (`main`). HACS supports this before the first release.
The code is an **unreleased candidate**, not a validated public alpha.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=artur-panek&repository=ha-forensic-lab&category=integration)

Requires Home Assistant **2026.9.4 or newer** and an administrator account.
For the release-validation matrix, use the exact-SHA CI ZIP and record its SHA;
a HACS `main` install follows a moving development branch.

See [Installation](docs/installation.md).

## Alpha testing and release gate

Repository CI is not treated as proof of real-instance compatibility.

The test matrix, read-only smoke client and release gate are documented in:

- [Alpha testing](docs/alpha-testing.md)
- [Alpha release checklist](docs/alpha-release-checklist.md)
- [Known limitations](docs/known-limitations.md)
- [Release process](docs/releasing.md)
- [Changelog](CHANGELOG.md)

Read-only smoke example:

~~~bash
HA_URL="https://home.example" \
HA_TOKEN="<long-lived-access-token>" \
node scripts/alpha-smoke.mjs
~~~

The smoke client does not call services or modify Home Assistant state.

## Persistence caveat

Rolling persistence is not a write-ahead log. A hard process or host crash can
lose the newest rolling events since the most recent completed snapshot,
normally roughly the configured persistence interval. Clean unloads flush
immediately.

Saved incidents are explicit user actions and are written immediately.

## Security and privacy

The panel and custom WebSocket API are admin-only.

Persistent rolling snapshots and saved incidents use Home Assistant private
storage mode. Raw event payloads and complete service data are not retained.

Full Home Assistant traces are queried live through the admin-only trace
WebSocket API and immediately reduced to structural paths/outcomes in panel
memory. Config, blueprint inputs, variables, error text and arbitrary result
payloads are not stored.

When a user freezes trace evidence with an incident, the backend validates the
reduced projection again against a strict allowlist. Sanitized exports
pseudonymize automation/script, run, context and entity identifiers.

Sanitized incident export is safe-only in v0.1. The sanitizer is separately
tested and export ZIPs include a SHA-256 digest.

## Technical documentation

For the technical design, see [architecture](docs/architecture.md), the
[v0.1 scope](docs/v0.1-scope.md) and the [roadmap](docs/roadmap.md).

## Development

Validation includes:

- Home Assistant hassfest
- HACS repository validation
- Ruff
- Python bytecode compilation
- frontend JavaScript syntax checks
- trace projection tests
- pytest
- release packaging contract tests

## Branding

The production mark combines a runtime waveform, trace nodes and a forensic
lens. Source artwork and palette guidance live in
[`assets/brand/`](assets/brand/).

## License

MIT. See [LICENSE](LICENSE).
