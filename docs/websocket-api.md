# WebSocket API

HA Forensic Lab exposes an admin-only read API for the current in-memory
capture buffer.

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

Results are newest-first and include:

- normalized events
- current buffer size
- current buffer capacity

Example request:

~~~json
{
  "id": 42,
  "type": "ha_forensic_lab/timeline",
  "entity_id": "light.hallway",
  "limit": 100
}
~~~

## Security

The command requires an authenticated Home Assistant administrator.

The API only returns the normalized event model. It does not expose raw
Home Assistant event payloads or full service data.
