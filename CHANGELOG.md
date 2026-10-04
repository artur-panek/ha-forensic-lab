# Changelog

All notable changes to HA Forensic Lab will be documented in this file.

The project is currently **pre-alpha**. Until the first tagged alpha, everything
below remains part of the unreleased development line.

The format is inspired by Keep a Changelog. Version compatibility claims are
only added after they have been tested on real Home Assistant installations.

## [Unreleased]

### Added

- Home Assistant config-entry setup with an admin-only sidebar panel.
- Bounded normalized runtime capture for state changes, service calls,
  automation triggers and script starts.
- Searchable runtime timeline with entity and event-kind filtering.
- Deterministic context reconstruction with explicit parent-context,
  same-context and evidence-gap semantics.
- **Explain this change** workflow for captured state transitions.
- Privacy-reduced live Home Assistant automation/script trace enrichment.
- Durable saved incidents with bounded frozen evidence.
- Saved-incident Review independent of the current rolling buffer.
- Safe-only sanitized ZIP export with stable per-export pseudonyms and SHA-256.
- Rolling persistence through Home Assistant private atomic storage.
- Configurable rolling capacity, persistence interval, event kinds and
  entity/domain exclusions.
- Privacy-safe native diagnostics and recorder performance counters.
- Compact Recorder health view in the sidebar.
- Production waveform + forensic-lens visual identity.
- Read-only real-instance alpha smoke client and manual alpha validation matrix.
- Alpha-specific bug-report template.

### Security

- Raw Home Assistant event payloads, complete service data, trace config,
  blueprint inputs, changed variables and arbitrary trace result payloads are
  excluded from HA Forensic Lab persistence.
- Safe export removes or pseudonymizes identifiers and removes user IDs and
  absolute event timestamps.
- Runtime diagnostics are aggregate-only and do not include forensic
  identifiers or payload values.
- Capture exclusions are applied before rolling retention/persistence and are
  re-applied to restored rolling evidence after options changes.
- v0.1 intentionally provides no raw-export mode.

### Known limitations

- Rolling persistence is not a write-ahead log; a hard crash can lose evidence
  since the last completed rolling snapshot.
- Home Assistant trace enrichment is limited by Home Assistant's own retained
  trace window.
- Same-context ordering is not direct-causation proof.
- No timing-only correlation, anomaly detection or AI root-cause claims are
  implemented.
- The minimum supported Home Assistant version is not yet declared; it will be
  set only after the real-instance alpha compatibility pass.

[Unreleased]: https://github.com/artur-panek/ha-forensic-lab/commits/main
