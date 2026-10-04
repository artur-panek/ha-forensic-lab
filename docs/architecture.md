# Architecture

HA Forensic Lab has one config entry, an admin-only sidebar panel and an
admin-only WebSocket API. It reads runtime events and retained traces. It does
not call services, modify automations or use the Recorder database.

## Runtime path

1. `capture.py` listens for `state_changed`, `call_service`,
   `automation_triggered` and `script_started`.
2. `models.py` extracts normalized fields. `capture_policy.py` applies enabled
   kinds and entity/domain exclusions before retention.
3. Accepted events enter a bounded deque. The first dirty notification schedules
   a rolling snapshot; subsequent events do not postpone its deadline.
4. `websocket.py` queries an immutable snapshot for the timeline or explanation.
   The panel refreshes through requests; it does not subscribe to a live stream.
5. Saving an incident freezes a window from the current deque into a separate
   store. Review and export use those frozen events.

## Modules

| Responsibility | Modules |
| --- | --- |
| Setup, unload, final-write hook, options | `__init__.py`, `config_flow.py`, `const.py` |
| Event normalization and capture | `models.py`, `capture.py`, `capture_policy.py` |
| Filtering and event serialization | `query.py` |
| Context reconstruction | `causality.py` |
| Rolling storage and decoding | `store.py`, `storage_codec.py` |
| Incident creation, storage and review | `incidents.py`, `incident_store.py`, `incident_codec.py`, `incident_review.py` |
| Trace validation | `trace_evidence.py`, `frontend/trace-projection.mjs` |
| Export policy and ZIP construction | `sanitizer.py`, `export_bundle.py` |
| Aggregate counters and diagnostics | `metrics.py`, `diagnostics_data.py`, `diagnostics.py` |
| Admin API and panel | `websocket.py`, `frontend/ha-forensic-lab-panel.js`, `frontend/panel-styles.mjs` |

The event model, query, causality, codecs, trace validation and sanitizer have no
HA imports. Tests can use these modules without booting HA.

## Evidence

`parent_context` links contexts using HA's explicit parent IDs. The selected
parent event is an anchor, not necessarily a uniquely identified trigger.
`same_context_sequence` records shared context and capture order, not direct
causation. Both have the `confirmed` evidence class. The engine emits gaps when
context is missing or traversal hits a bound; it produces no timing-only edges.

See [causality.md](causality.md) for traversal rules and gap values.

## Persistence and lifecycle

Both stores use HA's versioned `Store` helper, private permissions, atomic writes
and JSON serialization outside the event loop.

Setup loads the rolling snapshot, reapplies current filters and capacity, loads
saved incidents, then starts capture. Option changes reload the entry. Unload
stops capture and flushes pending rolling data. The HA final-write event also
stops capture and flushes the buffer before process shutdown.

Rolling persistence uses a timer and a write lock. It is best effort: HA's helper
can log disk errors without raising them, so aggregate save counters are not
proof of disk durability. See [persistence.md](persistence.md).

Incident mutations use a separate lock and read back the stored collection
before changing visible state or acknowledging success. They are rejected while
HA is stopping because the helper can defer writes at that point. Incidents
survive rolling-buffer eviction and capture-option changes.

## Trace and export boundaries

The panel requests HA's `trace/contexts` and `trace/get` on demand, then discards
raw config, variables and arbitrary results. At most 200 structural steps can be
attached to a saved incident; the backend validates that projection again.

Export applies the sanitizer to a frozen incident and builds the ZIP in an
executor. Domains, relative timing and structural outcomes remain in the bundle;
identifiers and free text follow the [export policy](export.md).

Capture uses a bounded synchronous callback. Disk writes and ZIP construction
run separately, and panel request failures do not stop event capture. Retention
bounds and unavailable evidence are documented in [known limitations](known-limitations.md).
