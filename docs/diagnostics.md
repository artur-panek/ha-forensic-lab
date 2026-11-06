# Runtime diagnostics

Diagnostics report aggregate counts and timings through HA's config-entry
download and the admin-only `ha_forensic_lab/diagnostics` WebSocket command.
The sidebar panel's **Recorder** tab uses the same payload. It loads when opened
and has its own refresh button and snapshot time, separate from the timeline.

## Capture

Counters cover observed/normalized/retained events, evictions, filtered service
targets and drops by policy reason. Callback count, average and maximum duration
measure the synchronous path from normalization through filtering, deque append
and save scheduling, using a monotonic timer.

`dropped_unchanged_state` counts same-state updates skipped by the default capture
policy. Capture counters reset on integration setup/reload. `retained_events`
counts accepted events during that session; `evicted_events` counts older events
replaced in the full buffer. Neither is the current buffer size.

`rolling_buffer.retained_span_seconds` is the timestamp span of all retained
events (zero for fewer than two), independent of timeline filters. It does not
expose absolute timestamps or promise continuous coverage. Configuration also
reports whether `capture_unchanged_states` is enabled.

## Rolling persistence

| Field | Meaning |
| --- | --- |
| `load_count`, `restored_events` | Loads returning normally and events decoded by the most recent load |
| `load_average_ms`, `load_max_ms` | Load-call timing |
| `dirty_notifications`, `scheduled_writes` | Buffer changes and scheduled save timers |
| `completed_writes` | Save calls followed by a matching read-back |
| `failed_writes` | Save/read exceptions or a read-back mismatch |
| `deferred_writes` | Writes queued by HA during stopping; not verified checkpoints |
| `flush_calls` | Explicit flush requests |
| `write_average_ms`, `write_max_ms` | Save plus verification timing |
| `last_snapshot_events` | Event count in the most recent verified snapshot |
| `pending_save` | A save timer is scheduled; this does not indicate an active filesystem write |
| `dirty_generation`, `persisted_generation` | Buffer revision and most recent verified revision |

HA can log disk/serialization failures without raising them. Rolling writes now
read back the snapshot before advancing the persisted revision. A mismatch keeps
the revision dirty and schedules another attempt at the configured interval even
without new events. Verification adds one bounded Store read per write; timings
include that read. HA's stopping-phase deferrals remain unverified until a final
write can complete. Read-back establishes the stored content, not a physical
power-loss durability guarantee. Saved-incident actions retain their separate
read-back check. Continue restart/restore validation during alpha testing.

## Privacy

Saved-incident diagnostics include only the number of incidents, frozen events
and incidents with trace evidence. Capture configuration includes counts of
excluded entities/domains, not their values.

The payload excludes entity, context, event, user and incident IDs; titles;
state values; service targets; and trace data. Tests verify that seeded private
identifiers do not appear in the serialized output.

Recorder health shows these counts and timings without fixed performance
thresholds. Alpha reports should include observations from the tested instance.
