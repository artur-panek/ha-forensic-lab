<p align="center">
  <img src="assets/brand/ha-forensic-lab-mark.svg" width="180" alt="HA Forensic Lab logo">
</p>

<h1 align="center">HA Forensic Lab</h1>

<p align="center"><strong>Runtime forensics and incident analysis for Home Assistant.</strong></p>

HA Forensic Lab is an experimental Home Assistant custom integration for reconstructing **what happened, in what order, and why**.

The project is deliberately evidence-first: it should record facts before interpreting them, and it must never present a timing correlation as proven causation.

> [!IMPORTANT]
> HA Forensic Lab is pre-alpha. The current development stack captures and persists a bounded normalized runtime stream, provides an admin-only timeline, supports deterministic context reconstruction with live Home Assistant trace enrichment, freezes durable saved incidents, and exports safe-profile sanitized incident bundles directly from the sidebar.

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

## v0.1 target

The first useful release is intentionally small:

- bounded runtime event recording
- configurable capture scope and retention
- searchable incident timeline
- context-chain reconstruction
- **Explain this change**
- saved incidents
- sanitized incident export
- native Home Assistant sidebar panel

See the docs directory for architecture, event model, persistence, capture settings, causality, incident, export and WebSocket details.

## Current status

Implemented in the development stack:

- capture state changes, service calls, automation triggers and script starts
- configurable event-type/entity/domain capture filters
- configurable bounded rolling capacity (256–8192 events)
- configurable rolling persistence cadence (5–60 seconds)
- private atomic rolling snapshot persistence
- admin-only searchable timeline
- deterministic context-based **Explain this change**
- live automation/script trace enrichment with a privacy-reduced structural projection
- optional freezing of that validated safe trace projection into saved incidents and sanitized exports
- **Save incident** directly from a state-change event
- durable saved incidents in a separate private store
- saved-incident list and management in the sidebar
- durable saved-incident Review that reconstructs causality without the live buffer
- safe-profile sanitized ZIP export and download from the sidebar
- explicit evidence gaps instead of timing guesses

Capture filters are applied before rolling retention and persistence, including to
a restored rolling snapshot after an options change. See
[`docs/capture-settings.md`](docs/capture-settings.md).

Saved incidents are bounded to 50 records and 500 frozen events per record.

Safe export preserves diagnostic structure but pseudonymizes identifiers, removes user IDs and absolute timestamps, redacts free text and only retains a small allowlist of generic state values. v0.1 has no raw-export mode.

Still intentionally missing from v0.1:

- timing-only correlated evidence
- anomaly detection
- AI root-cause summaries

## Persistence caveat

Rolling persistence is not a write-ahead log. A hard process or host crash can lose the newest rolling events since the most recent completed snapshot, normally roughly the configured persistence interval. Clean unloads flush immediately.

Saved incidents are explicit user actions and are written immediately.

## Development

Validation includes:

- Home Assistant hassfest
- HACS repository validation
- Ruff
- Python bytecode compilation
- frontend JavaScript syntax checks
- pytest

## Security and privacy

The panel and WebSocket API are admin-only.

Persistent rolling snapshots and saved incidents use Home Assistant private storage mode. Raw event payloads and complete service data are not retained.

The current UI HTML-escapes values returned from Home Assistant before rendering them.

Full Home Assistant traces are queried live through the admin-only trace WebSocket API and immediately reduced to structural paths/outcomes in panel memory. Config, blueprint inputs, variables, error text and arbitrary result payloads are never stored.

When the user saves the currently explained event, the backend can freeze only that reduced projection after validating it again against a strict allowlist. Sanitized exports pseudonymize its automation/script, run and context identifiers. See [`docs/trace-enrichment.md`](docs/trace-enrichment.md).

Sanitized incident export is safe-only in v0.1. The sanitizer is a separate tested module and export ZIPs include a SHA-256 digest.

## Branding

The production mark combines a runtime waveform, trace nodes and a forensic lens. Source artwork and palette guidance live in [`assets/brand/`](assets/brand/).

## License

MIT. See [LICENSE](LICENSE).
