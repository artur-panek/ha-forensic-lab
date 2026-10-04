# Sanitized incident export

HA Forensic Lab exports saved incidents using one safe-by-default profile.

v0.1 deliberately does **not** provide a raw-export toggle.

## Bundle layout

The export is a ZIP containing:

~~~text
manifest.json
incident.json
summary.md
~~~

The ZIP is generated with deterministic member metadata and includes a SHA-256 digest in the WebSocket response.

## Safe profile

The safe profile preserves diagnostic structure while reducing disclosure risk.

### Removed or redacted

- absolute event timestamps are removed
- incident creation time is removed
- incident title is replaced with a generic title
- Home Assistant user IDs are removed
- event IDs are replaced with stable per-export aliases
- context IDs are replaced with stable per-export aliases
- entity IDs are pseudonymized while retaining the domain
- automation/script names are redacted
- automation trigger source text is redacted
- non-allowlisted state strings are redacted

### Preserved

The following are retained because they materially help debugging:

- event type
- event ordering
- time offsets relative to the incident window
- entity domain
- service domain and service name
- stable relationships between pseudonymized entity/event/context identifiers
- a small allowlist of generic state values such as on/off/open/closed/idle/playing
- safe trace paths, boolean condition outcomes and simple branch choices when frozen trace evidence is present

The aliases are stable only within one exported incident. They are not intended to be stable identifiers across exports.

When an incident contains frozen trace evidence, its automation/script identity, run ID and context ID are pseudonymized using the same per-export alias context. Raw Home Assistant trace payloads are never part of the bundle.

## Transport

The admin-only WebSocket export command returns:

- filename
- content_type
- encoding
- base64 ZIP data
- SHA-256
- byte size
- sanitizer profile

ZIP construction runs outside the Home Assistant event loop.

## Limits

Export operates only on a saved incident, so it inherits saved-incident bounds:

- maximum 500 frozen events per incident
- no raw event payloads
- no complete service_data
- no trace variables in the current implementation

The sanitizer should remain a separately tested module as richer evidence types are added.

Custom service names (including direct script calls and named notification
services) are pseudonymized. Only generic turn_on/turn_off/toggle/reload service
names remain readable. Trace status, branch choices and path segments use a
structural vocabulary allowlist; arbitrary identifier-shaped text is not evidence.
