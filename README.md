# HA Forensic Lab

**Runtime forensics and incident analysis for Home Assistant.**

HA Forensic Lab is an experimental Home Assistant custom integration for reconstructing **what happened, in what order, and why**.

The project is deliberately evidence-first: it should record facts before interpreting them, and it must never present a timing correlation as proven causation.

> [!IMPORTANT]
> HA Forensic Lab is pre-alpha. The current development stack captures a minimal normalized runtime event stream into a bounded in-memory buffer and exposes it through an admin-only timeline. Persistent storage and causal reconstruction are not implemented yet.

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
- searchable incident timeline
- context-chain reconstruction
- **Explain this change**
- saved incidents
- sanitized incident export
- native Home Assistant sidebar panel

See [docs/v0.1-scope.md](docs/v0.1-scope.md) for the acceptance criteria, [docs/architecture.md](docs/architecture.md) for the proposed design, [docs/event-model.md](docs/event-model.md) for the capture schema and [docs/websocket-api.md](docs/websocket-api.md) for the internal read API.

## Repository layout

~~~text
custom_components/ha_forensic_lab/
├── __init__.py
├── capture.py
├── config_flow.py
├── const.py
├── models.py
├── query.py
├── websocket.py
├── manifest.json
├── strings.json
├── translations/
├── frontend/
└── brand/
~~~

The repository follows the HACS integration layout from the start.

## Current status

The integration can be added through Home Assistant's UI and registers an admin-only sidebar panel.

The capture layer listens for:

- state changes
- service calls
- automation triggers
- script starts

It stores only a compact normalized representation in a bounded in-memory buffer. No database writes or raw payload persistence are performed yet.

The sidebar timeline can currently:

- display newest runtime events
- filter by entity
- filter by event type
- show state transitions and service targets
- expose context, parent context, user and event identifiers as evidence metadata
- report recorder buffer usage
- refresh on demand

The frontend talks only to the admin-only Home Assistant WebSocket API; it does not read internal storage directly.

## Development

This repository validates changes with:

- Home Assistant hassfest
- HACS repository validation
- Ruff
- Python bytecode compilation
- frontend JavaScript syntax checks
- pytest

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security and privacy

Forensic captures may contain entity names, service metadata, user IDs and automation context. Richer future evidence may be more sensitive, so exports must be sanitized by default and the analysis panel is admin-only.

The current UI HTML-escapes values returned from Home Assistant before rendering them.

Please report security issues as described in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
