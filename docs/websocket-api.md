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

## Security

Every command requires an authenticated Home Assistant administrator.

The live APIs expose normalized forensic evidence only. Export is safe-by-default and does not provide a raw mode in v0.1.

See [Sanitized incident export](export.md).
