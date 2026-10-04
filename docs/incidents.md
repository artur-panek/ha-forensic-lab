# Saved incidents

Saved incidents freeze a bounded slice of normalized runtime evidence so it can survive after the rolling capture buffer moves on.

## Creating an incident

An incident is anchored to one event currently present in the rolling buffer.

The default capture window is:

- 300 seconds before the target event
- 60 seconds after the target event

Both sides can be adjusted up to 3600 seconds. Only events already in the buffer are frozen; saving does not wait for the future side of the window.

In the panel, **Save incident** opens a form with an optional title and seconds
before/after the target. The initial preview counts all retained events in that
window, including events outside the current timeline filters. If the count
exceeds 500, shorten the times and click **Preview window**. Saving is enabled
once the preview fits the limit. Editing either time invalidates the preview;
editing the title does not.

The preview does not reserve or save events. Creation rechecks the live buffer,
so the count can change and the target can be evicted while the form is open.
A failed save preserves the form values so the window can be adjusted or retried.

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

Create and delete operations are serialized. Each writes the proposed collection and reads it back before changing the visible list or acknowledging success. A failed write leaves the previous in-memory collection intact. These actions are rejected while HA is stopping, when its Store helper can defer writes.

Rolling-buffer eviction does not remove already saved incidents.

Trace evidence is optional. An incident remains valid when Home Assistant has already evicted the richer automation/script trace; in that case the deterministic context evidence is still frozen normally.

When trace evidence is supplied by the panel, the backend revalidates it against a strict allowlist before writing it to storage.

## API

The admin-only WebSocket API exposes:

- ha_forensic_lab/incidents/list
- ha_forensic_lab/incidents/get
- ha_forensic_lab/incidents/review
- ha_forensic_lab/incidents/preview
- ha_forensic_lab/incidents/create
- ha_forensic_lab/incidents/delete
- ha_forensic_lab/incidents/export

Export is sanitized by default and has no raw mode in v0.1.

See [Sanitized incident export](export.md).


## Reviewing an incident

A saved incident is a self-contained forensic snapshot.

The Review workflow reconstructs the same deterministic context chain from the incident's frozen events rather than from the live rolling capture buffer. This means a saved incident can still be investigated:

- after its original events have been evicted from the rolling buffer
- after a Home Assistant restart
- while the current live timeline has moved on to unrelated activity

If validated structural trace evidence was frozen with the incident, Review displays that trace skeleton alongside the reconstructed context chain. If no trace was captured, context evidence remains fully reviewable.
