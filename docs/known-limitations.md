# Known limitations

HA Forensic Lab is pre-alpha software. These boundaries are deliberate and
should be visible to testers.

## Rolling persistence is not a write-ahead log

The rolling buffer is saved on a bounded interval.

A hard process or host crash may lose events captured since the last completed
snapshot. A clean Home Assistant shutdown or integration unload flushes
immediately.

Saved incidents are written separately and immediately.

## Home Assistant trace retention is finite

Rich automation/script trace enrichment depends on traces still retained by Home
Assistant.

If Home Assistant has already evicted a run, HA Forensic Lab keeps the
deterministic context chain but reports the richer trace as unavailable.

HA Forensic Lab does not increase Home Assistant's trace retention automatically.

## Context evidence has gaps

Not every Home Assistant event has a complete parent-context chain.

v0.1 does not invent timing-based causality to fill those gaps. Missing context
is shown explicitly.

## Same context is not direct causation

Two events sharing one context are confirmed to belong to the same Home
Assistant change context and can be ordered as captured.

That does not prove that the earlier event directly caused the later event.

## Normalized capture is intentionally incomplete

The rolling recorder currently omits:

- state attributes
- complete service data
- arbitrary event payloads
- trace variables
- rendered template values
- raw trace config and blueprint inputs

This keeps capture bounded and reduces sensitive-data retention, but it means
some investigations will require native Home Assistant logs/traces as additional
evidence.

## Capture filters do not rewrite saved incidents

Changing excluded entities/domains re-filters the rolling recorder and restored
rolling snapshot.

It does not rewrite already saved incidents, because they are explicit durable
evidence captures. Users can review/delete/export those cases separately.

## Saved incident bounds

Current v0.1 bounds:

- 50 saved incidents
- 500 frozen events per incident
- maximum one-hour capture window on either side of the target event

Oversized incident creation fails rather than silently truncating evidence.

## Safe export only

v0.1 intentionally has no raw-export mode.

The portable ZIP removes or pseudonymizes sensitive fields according to the safe
sanitizer profile.

## Admin-only UI/API

The Forensic Lab sidebar and its internal WebSocket commands require a Home
Assistant administrator.

Non-admin investigation workflows are out of scope for v0.1.

## No anomaly detection or AI root-cause claims

v0.1 is an evidence reconstruction tool.

It does not automatically decide that behavior is anomalous and it does not use
an LLM to claim a root cause.
