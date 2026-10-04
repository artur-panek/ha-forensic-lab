# Runtime event model

The first capture layer deliberately keeps a **small forensic index**, not raw
Home Assistant event payloads.

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

- process-local event ID
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

This stage does **not** retain:

- state attributes
- complete service_data
- arbitrary event payloads
- trace variables
- rendered templates
- message bodies

That is intentional. Those values are frequently large and can be sensitive.

Future richer evidence should be stored separately, bounded independently, and
only when it materially improves incident reconstruction.

## Event IDs

The current event ID is process-local and generated from:

1. the Home Assistant event timestamp
2. a monotonic capture sequence

It is suitable for linking events inside one capture session. It is not a
persistent globally unique identifier and should not be treated as one.

## Retention

The capture layer currently uses an in-memory deque capped at 2048 normalized
events.

This is intentionally temporary:

- it proves the capture path without creating a database migration surface
- memory cannot grow without bound
- restart clears the buffer
- no user runtime data is written to disk yet

Persistent rolling storage belongs in the next storage-focused stage.
