# Rolling persistence

HA Forensic Lab persists the same bounded normalized event buffer used by the live timeline.

## Storage mechanism

Rolling snapshots use Home Assistant's `Store` helper.

The store is configured with:

- private file permissions
- atomic writes
- JSON serialization outside the Home Assistant event loop
- storage schema version 1

The stored body contains only normalized ForensicEvent records.

## Bound

The in-memory capture deque defaults to 2048 events and is configurable from 256 to 8192 events through the integration options. The persistent snapshot is created from that deque, so persistence inherits the same bound.

HA Forensic Lab does not append an unbounded event log.

## Write cadence

The first new event after a completed snapshot schedules a write after the configured persistence interval (5–60 seconds; default 10 seconds).

Further events inside that interval do not push the deadline back. This is intentional: a continuously active Home Assistant instance still receives periodic snapshots instead of waiting forever for a quiet period.

Integration unload and the Home Assistant final-write event both:

1. stops event-bus capture
2. cancels any pending timer
3. flushes the latest normalized snapshot immediately

## Hard-crash behavior

This storage layer is **rolling persistence**, not a write-ahead log.

A hard process or host crash can lose events since the last successful snapshot. With working storage and the default cadence, this is roughly 10 seconds plus write time. Disk errors can extend the loss window.

Atomic writes protect the previous completed snapshot from being replaced by a partially written file.

HA's Store helper logs some write errors without raising them. Rolling save counters measure helper calls; they do not verify disk contents. Check HA logs and restart persistence during testing. See [diagnostics](diagnostics.md) for counter definitions.

## Privacy

The persistent file can contain:

- entity IDs
- normalized state strings
- service names and target entity IDs
- Home Assistant context and user IDs
- automation/script names and automation trigger descriptions

It does not currently contain full state attributes, arbitrary event payloads, full service data or trace variables.
