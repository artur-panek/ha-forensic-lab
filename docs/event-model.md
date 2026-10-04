# Runtime event model

Capture keeps normalized fields from supported Home Assistant events.

## Captured event kinds

v0.1 currently normalizes four runtime event types:

| Home Assistant event | Forensic purpose |
| --- | --- |
| state_changed | Observe the effect: an entity changed state |
| call_service | Observe an attempted action |
| automation_triggered | Identify an automation execution and trigger description |
| script_started | Identify a script execution |

## Common fields

Every normalized event contains:

- event ID
- event kind
- event timestamp
- context ID
- parent context ID
- user ID when Home Assistant provides one

Depending on the event type it may also contain:

- entity ID and derived domain
- service domain and service name
- target entity IDs
- old/new state strings
- automation/script name
- automation trigger source

## Deliberate omissions

Capture omits:

- state attributes
- complete service_data
- arbitrary event payloads
- trace variables
- rendered templates
- message bodies


## Event IDs and capture sessions

Each capture process generates a random session namespace. New event IDs use:

~~~text
<session-id>:<monotonic-sequence>
~~~

This keeps restored events from an earlier Home Assistant process distinct from new events captured after a restart.

Event timestamps remain separate and are used for chronology and display.

## Retention

The live capture buffer defaults to 2048 normalized events; integration options allow 256–8192 events.

That same bounded snapshot is persisted through Home Assistant's private storage layer:

- the oldest event is evicted when the buffer reaches capacity
- the persisted snapshot therefore cannot grow without bound
- restored events are loaded before live capture starts
- raw Home Assistant payloads are still not written
- a clean integration unload flushes the newest snapshot immediately

See [rolling persistence](persistence.md) for write cadence and crash behavior.
