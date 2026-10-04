# WebSocket API

HA Forensic Lab exposes admin-only APIs for the rolling capture buffer, deterministic context reconstruction and saved incidents.

## Timeline

Command type:

~~~text
ha_forensic_lab/timeline
~~~

Optional filters:

| Field | Type | Meaning |
| --- | --- | --- |
| limit | integer, 1–500 | Maximum number of events returned |
| entity_id | string | Match a primary entity or service target |
| context_id | string | Match an event context or parent context |
| kind | string | One of the supported normalized event kinds |
| since | number | Minimum Home Assistant event timestamp |

Results are newest-first and include normalized events plus current rolling buffer size/capacity.
`retained_span_seconds` reports the timestamp span of the entire rolling buffer,
before query filters or the response limit. Empty and single-event buffers report
zero. This duration is also available in aggregate diagnostics.

## Explain

Command type:

~~~text
ha_forensic_lab/explain
~~~

Required:

- event_id

Optional:

- max_events, 1–100

The response contains context-linked events, typed confirmed evidence edges and explicit evidence gaps.

## Saved incidents

### List

~~~text
ha_forensic_lab/incidents/list
~~~

Returns incident summaries newest-first.

### Get

~~~text
ha_forensic_lab/incidents/get
~~~

Requires incident_id and returns the frozen normalized events.

### Review

~~~text
ha_forensic_lab/incidents/review
~~~

Requires incident_id.

Optional:

- max_events, 1–200, default 100

Review reconstructs the deterministic context chain from the incident's frozen event snapshot and returns its frozen safe trace evidence when present. It does not depend on the current rolling buffer.

### Create

~~~text
ha_forensic_lab/incidents/create
~~~

Requires target_event_id.

Optional:

- before_seconds, default 300, maximum 3600
- after_seconds, default 60, maximum 3600
- title

Incident creation fails rather than silently truncating when the selected window exceeds the incident event bound.

### Delete

~~~text
ha_forensic_lab/incidents/delete
~~~

Requires incident_id.

### Export

~~~text
ha_forensic_lab/incidents/export
~~~

Requires incident_id.

The response contains a safe-profile sanitized ZIP bundle:

~~~json
{
  "filename": "ha-forensic-lab-ab12cd34.zip",
  "content_type": "application/zip",
  "encoding": "base64",
  "data": "<base64>",
  "sha256": "<hex digest>",
  "size_bytes": 1234,
  "profile": "safe"
}
~~~

The ZIP contains manifest.json, incident.json and summary.md.

Export construction is performed outside the Home Assistant event loop.

## Diagnostics

Command type:

~~~text
ha_forensic_lab/diagnostics
~~~

Returns privacy-safe aggregate runtime health data for administrators:

- rolling buffer size/capacity
- capture/drop/eviction counters
- average and maximum capture callback time
- rolling persistence write/load counters and durations
- pending-write status
- saved incident counts and total frozen-event count
- active configuration bounds and filter counts

It does **not** include event IDs, entity IDs, context IDs, incident IDs,
incident titles, state values or trace payloads.

The same aggregate payload is available through Home Assistant's native
config-entry diagnostics download.

## Security

Every command requires an authenticated Home Assistant administrator.

The live APIs expose normalized forensic evidence only. Export is safe-by-default and does not provide a raw mode in v0.1.

See [Sanitized incident export](export.md).
