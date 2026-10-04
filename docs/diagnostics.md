# Runtime diagnostics and performance counters

HA Forensic Lab measures its own recorder overhead using aggregate counters only.

The diagnostics surface exists for two reasons:

1. alpha testers can report useful performance evidence
2. we can evaluate whether the recorder materially affects Home Assistant Core

## Capture counters

The capture callback records:

- observed events
- normalized events
- normalization drops
- retained events
- rolling-buffer evictions
- individually filtered service targets
- drops by policy reason
- callback count
- average callback duration
- maximum callback duration

Timing uses a monotonic high-resolution timer around the full synchronous
capture path:

~~~text
event bus callback
→ normalization
→ capture policy
→ bounded deque append
→ rolling-save scheduling
~~~

The timer does not store entity, event or context identifiers.

## Persistence counters

Rolling storage reports:

- successful snapshot loads
- restored event count
- average/maximum load duration
- dirty notifications
- scheduled writes
- completed writes
- failed writes
- explicit flush calls
- average/maximum write duration
- event count in the last completed snapshot
- pending-write state
- dirty and persisted generation counters

A failed filesystem write is counted and then re-raised. Diagnostics must never
convert a storage failure into silent success.

## Saved incident counters

Only aggregate saved-case information is exposed:

- incident count
- total frozen event count
- number of incidents containing frozen trace evidence

Incident IDs, titles, timestamps and evidence are not included.

## Privacy contract

The diagnostics payload intentionally excludes:

- entity IDs
- excluded entity/domain values
- event IDs
- context IDs
- user IDs
- incident IDs and titles
- state values
- service targets
- trace data

Capture configuration reports **counts** of excluded entities/domains, not the
values themselves.

Tests include explicit secret identifiers and assert they do not appear in the
serialized diagnostics payload.

## Access

Diagnostics are available in two admin-only forms:

- Home Assistant's native config-entry diagnostics download
- the internal WebSocket command `ha_forensic_lab/diagnostics`

The WebSocket command exists so the Forensic Lab panel can show a small recorder
health view without gaining access to forensic payload internals.


## Sidebar recorder health

The sidebar consumes the same admin-only aggregate diagnostics command.

It intentionally shows only a compact operational summary:

- average capture callback duration
- maximum capture callback duration
- retained vs dropped events
- rolling-buffer utilization
- persistence pending/failure status and completed-write count

The view does not set hard performance thresholds in v0.1. Alpha data should
inform any future warning levels instead of treating an arbitrary millisecond
number as unhealthy.
