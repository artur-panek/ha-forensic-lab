# Changelog

All notable changes to HA Forensic Lab are documented here.

The project follows Semantic Versioning. Pre-release versions are expected to
change while the public alpha is being validated.

## [0.1.0-alpha.1] - Unreleased

First alpha candidate.

### Added

- bounded runtime capture for state changes, service calls, automation triggers
  and script starts
- configurable capture kinds, entity/domain exclusions, rolling capacity and
  persistence cadence
- private atomic rolling persistence with explicit hard-crash durability limits
- searchable admin-only runtime timeline
- deterministic context-chain reconstruction with explicit evidence gaps
- **Explain this change** workflow
- privacy-reduced live Home Assistant automation/script trace enrichment
- durable saved incidents with optional validated frozen trace evidence
- saved-incident review independent from the live rolling buffer
- safe-only sanitized ZIP incident export with pseudonymized identifiers
- privacy-safe aggregate diagnostics and Recorder health view
- production HA Forensic Lab waveform/lens visual identity
- read-only real-instance alpha smoke client
- alpha test matrix, known-limitations document and explicit release gate

### Security and privacy

- panel and custom WebSocket commands require Home Assistant administrator access
- capture filters are applied before rolling retention and persistence
- full Home Assistant trace config, variables and arbitrary result payloads are
  not retained
- saved trace projections are validated again server-side before persistence
- exported bundles remove user IDs and absolute timestamps, pseudonymize
  identifiers and redact free text
- diagnostics are aggregate-only and exclude forensic identifiers/payloads

### Fixed during candidate audit

- reject arbitrary token-shaped text in trace structural fields
- preserve numeric Home Assistant choose-branch indexes, including branch zero
- pseudonymize user-defined service names in safe incident exports

### Known alpha limitations

See [docs/known-limitations.md](docs/known-limitations.md).

This entry remains **Unreleased** until the real-instance alpha checklist has
passed and the matching release tag is intentionally created.
