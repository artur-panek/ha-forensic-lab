# Saved incidents

Saved incidents freeze a bounded slice of normalized runtime evidence so it can survive after the rolling capture buffer moves on.

## Creating an incident

An incident is anchored to one event currently present in the rolling buffer.

The default capture window is:

- 300 seconds before the target event
- 60 seconds after the target event

Both sides can be adjusted up to 3600 seconds.

The incident stores:

- a generated incident ID
- title
- creation timestamp
- target event ID
- requested window start/end
- frozen normalized events
- optional validated structural trace evidence when a matching live Home Assistant trace was available at save time

## Bounds

Saved incidents are deliberately bounded:

- maximum 50 saved incidents
- maximum 500 events per incident
- maximum one-hour window in either direction

If a requested window contains more than 500 events, creation fails and asks the caller to narrow the window. HA Forensic Lab does not silently discard evidence from a saved incident.

## Persistence

Saved incidents use a separate private Home Assistant Store file from the rolling capture snapshot.

Creating or deleting an incident writes the saved-incident collection immediately because these are explicit, infrequent user actions.

Rolling-buffer eviction does not remove already saved incidents.

Trace evidence is optional. An incident remains valid when Home Assistant has already evicted the richer automation/script trace; in that case the deterministic context evidence is still frozen normally.

When trace evidence is supplied by the panel, the backend revalidates it against a strict allowlist before writing it to storage.

## API

The admin-only WebSocket API exposes:

- ha_forensic_lab/incidents/list
- ha_forensic_lab/incidents/get
- ha_forensic_lab/incidents/create
- ha_forensic_lab/incidents/delete
- ha_forensic_lab/incidents/export

Export is sanitized by default and has no raw mode in v0.1.

See [Sanitized incident export](export.md).
