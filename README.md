# HA Forensic Lab

**Runtime forensics and incident analysis for Home Assistant.**

By [Artur Panek](https://artur.panek.tech/) · [Project page](https://artur.panek.tech/work/ha-forensic-lab/)

HA Forensic Lab is an experimental Home Assistant custom integration for reconstructing **what happened, in what order, and why**.

The project is deliberately evidence-first: it should record facts before interpreting them, and it must never present a timing correlation as proven causation.

> [!IMPORTANT]
> HA Forensic Lab is pre-alpha. The current branch establishes the v0.1 architecture and integration shell; the event recorder is not enabled yet.

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

See [docs/v0.1-scope.md](docs/v0.1-scope.md) for the acceptance criteria and [docs/architecture.md](docs/architecture.md) for the proposed design.

## Repository layout

~~~text
custom_components/ha_forensic_lab/
├── __init__.py
├── config_flow.py
├── const.py
├── manifest.json
├── strings.json
├── translations/
├── frontend/
└── brand/
~~~

The repository follows the HACS integration layout from the start.

## Current status

The integration can be added through Home Assistant's UI and registers an admin-only placeholder sidebar panel. Recording and forensic analysis are deliberately not implemented in this foundation commit.

## Installation / testing

This repository is **pre-alpha** and does not have a numbered public release yet. It is useful for development and architecture testing, not as a production forensic recorder.

For a manual test install:

1. Copy `custom_components/ha_forensic_lab/` into your Home Assistant configuration directory under `custom_components/`.
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → HA Forensic Lab**.
4. Confirm setup. The current build registers the admin-only placeholder panel.

HACS repository metadata is already present so the project follows the expected custom-integration layout, but normal user installation will be documented around the first useful recording release.

For the technical design, see [architecture](docs/architecture.md), the [v0.1 scope](docs/v0.1-scope.md) and the [roadmap](docs/roadmap.md).

## Development

This repository validates changes with:

- Home Assistant hassfest
- HACS repository validation
- Ruff
- pytest
- Python bytecode compilation

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security and privacy

Forensic captures may contain entity names, service payloads, user IDs and automation context. Exports must therefore be sanitized by default and the analysis panel is admin-only.

Please report security issues as described in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
