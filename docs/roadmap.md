# Roadmap

The roadmap is ordered around useful forensic capability rather than feature
count.

## v0.1 alpha — Incident reconstruction

Implemented in the current alpha candidate:

- bounded normalized runtime recorder
- configurable capture scope and rolling retention
- context and parent-context indexing
- searchable runtime timeline
- deterministic evidence relationships
- **Explain this change**
- privacy-reduced live automation/script trace enrichment
- durable saved incidents and saved-incident Review
- safe-only sanitized incident export
- privacy-safe runtime diagnostics and Recorder health
- production branding
- read-only real-instance smoke client
- deterministic release packaging and release contract

Release gates still outstanding until they are actually performed:

- run the full real-instance alpha matrix
- verify restart/persistence behavior on a real Home Assistant installation
- collect initial performance observations
- confirm known limitations against the tested HA version
- intentionally publish the first pre-release tag

## v0.2 — Better investigation workflows

Candidates after alpha feedback:

- richer graph navigation for context and trace paths
- incident comparison
- reusable investigation filters/bookmarks
- better trace-to-event navigation
- improved evidence-bundle summaries
- carefully designed optional correlated evidence where deterministic context
  is unavailable

## v0.3 — Cross-tool workflows

Potential directions:

- optional integration points with HA Blast Radius
- incident annotations
- shareable investigation presets
- compatibility/history views across Home Assistant releases

## Later, only if justified

- anomaly detection
- automated incident detection
- assisted root-cause summaries
- cross-instance analysis

AI-generated causality remains deliberately out of scope until deterministic
evidence collection is trustworthy and alpha feedback justifies it.
