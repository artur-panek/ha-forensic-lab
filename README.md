<p align="center">
  <img src="assets/brand/ha-forensic-lab-mark.svg" width="180" alt="HA Forensic Lab logo">
</p>

<h1 align="center">HA Forensic Lab</h1>

A Home Assistant custom integration for inspecting the events and context links
around an entity change.

By [Artur Panek](https://artur.panek.tech/) · [Project page](https://artur.panek.tech/work/ha-forensic-lab/)

> [!IMPORTANT]
> **0.1.0-alpha.1 is an unreleased candidate.** The real Home Assistant
> [release checklist](docs/alpha-release-checklist.md) has not been completed.
> A green CI run is not approval to tag a release.

## Install for testing

Requires Home Assistant **2026.9.4 or newer** and an administrator account.
The repository is available as a HACS custom repository, outside the default
catalogue.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=artur-panek&repository=ha-forensic-lab&category=integration)

1. Add `artur-panek/ha-forensic-lab` in HACS with type **Integration**.
2. Download `main` and restart Home Assistant.
3. Add **HA Forensic Lab** in **Settings → Devices & services**.
4. Open **HA Forensic Lab** in the sidebar.

See [installation](docs/installation.md) for manual ZIP installation. Release
testing must use an exact-SHA CI artifact; `main` changes as fixes are merged.

## Investigate a change

- **Timeline:** refresh the captured state changes, service calls, automation
  triggers and script starts. Choose an exact entity ID or event kind, then
  **Apply**. The view is a timestamped snapshot; **Refresh events** updates it.
- **Inspect:** select an event row to see its state change, a plain-language
  evidence summary and the recorded sequence beside the list. A single event
  without links says **Cause not captured**. IDs and trace details are expandable.
- **Save incident:** choose the seconds before/after the selected event, preview
  the event count, then freeze the window with structural trace evidence when
  available. Narrow busy windows to fit the 500-event limit.
- **Saved incidents → Review:** reopen an incident after the live buffer has moved on.
- **Export:** download a sanitized ZIP with a SHA-256 checksum.
- **Recorder:** inspect technical capture/storage counters separately from the
  timeline. Refresh this view to update its own snapshot.

Parent-context links identify relationships between HA contexts. Events sharing
one context are shown in captured order; that order does not prove that one
caused the next. Missing evidence stays explicit. There are no timing-only
causal links or AI root-cause claims.

## Retention and privacy

The rolling buffer defaults to **2,048 events**, configurable from 256 to 8,192.
Updates with an unchanged state string (such as `playing → playing`) are skipped
by default; enable **Capture unchanged-state updates** for attribute-triggered
investigations. Actual sensor value changes still count. The panel shows the
retained time span; once full, the buffer replaces its oldest events.
Snapshots are requested every 5–60 seconds while data changes (default 10).
A hard crash can lose events since the last successful snapshot.

Saved incidents use separate storage, with limits of **50 incidents** and
**500 events per incident**. Changing capture filters does not rewrite them.

The panel and WebSocket API require an administrator. Local storage contains
identifiers and state strings, but omits raw event payloads, complete service
data and trace variables. Export removes user IDs and absolute timestamps,
pseudonymizes identifiers and redacts free text. Domains, relative timing and
execution structure remain visible; review a bundle before sharing it.

## Documentation

- [Capture settings](docs/capture-settings.md) and [known limitations](docs/known-limitations.md)
- [Architecture](docs/architecture.md) and [implemented v0.1 scope](docs/v0.1-scope.md)
- [Evidence rules](docs/causality.md) and [WebSocket API](docs/websocket-api.md)
- [Saved incidents](docs/incidents.md), [trace evidence](docs/trace-enrichment.md) and [export format](docs/export.md)
- [Alpha testing](docs/alpha-testing.md), [release process](docs/releasing.md) and [HACS status](docs/hacs-readiness.md)
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md) and [changelog](CHANGELOG.md)

MIT licensed. See [LICENSE](LICENSE). Brand assets are in [assets/brand](assets/brand/).
