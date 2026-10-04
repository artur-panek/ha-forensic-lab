# Architecture

## Design principle

**Record evidence first. Interpret it second.**

HA Forensic Lab should preserve enough runtime evidence to reconstruct an incident while remaining explicit about what is proven and what is merely correlated.

## Proposed data flow

~~~mermaid
flowchart LR
    BUS[Home Assistant event bus]
    CAPTURE[Capture layer]
    NORMALIZE[Normalizer]
    BUFFER[Bounded event store]
    CAUSAL[Causality engine]
    API[Query / WebSocket API]
    UI[Forensic Lab panel]
    INCIDENT[Saved incidents]

    BUS --> CAPTURE
    CAPTURE --> NORMALIZE
    NORMALIZE --> BUFFER
    BUFFER --> CAUSAL
    CAUSAL --> API
    BUFFER --> API
    API --> UI
    UI --> INCIDENT
~~~

## 1. Capture layer

The capture layer subscribes only to runtime sources that materially improve reconstruction.

Initial candidates are:

- state_changed
- call_service
- automation_triggered
- script_started

The capture layer should do as little work as possible on the event loop. Heavy normalization or persistence should be deferred.

## 2. Normalized event model

The storage model should not depend on retaining arbitrary Home Assistant event objects forever.

A normalized event should be able to represent at least:

~~~text
event_id
timestamp
event_type
entity_id?
domain?
service?
old_state?
new_state?
context_id?
parent_context_id?
user_id?
source_ref?
payload_ref?
~~~

Large or sensitive payloads should be separated from the searchable index.

## 3. Evidence edges

Causal analysis produces typed relationships between normalized event anchors.

Each edge carries:

~~~text
source_event_id
target_event_id
evidence_class
evidence_type
source_context_id?
target_context_id?
~~~

### Confirmed does not always mean direct causation

Two deterministic relationship types are currently modeled:

- **parent_context**: the child Home Assistant context explicitly points to the parent context that started it.
- **same_context_sequence**: events are confirmed to belong to the same Home Assistant context and are shown in captured order.

A same-context sequence is **not** a claim that the earlier event directly caused the later event. It is a confirmed relationship plus chronology.

The parent-context event shown by HA Forensic Lab is a captured anchor for the parent context. When several events share that parent context, the tool must not pretend one specific event is uniquely proven to be the trigger.

### Correlated

Future correlation may use evidence such as:

- close timestamps
- an entity change following a relevant service call when context is unavailable
- surrounding events that are useful to inspect but cannot be proven causal

Correlation must never be displayed as confirmed causation.

See [context causality](causality.md) for the current deterministic rules.

## 4. Storage

v0.1 should use a dedicated, bounded local store rather than treating Home Assistant's Recorder database as its own schema.

Suggested model:

- lightweight searchable index for a configurable short retention window
- optional richer payload ring buffer
- durable saved incidents copied out of the rolling window
- periodic pruning

The integration must avoid unbounded growth.

## 5. Query layer

The frontend should not query implementation-specific storage directly.

Expose a small internal API for:

- timeline queries
- entity-change explanation
- context-chain expansion
- incident creation/list/read/delete
- sanitized incident export

A Home Assistant WebSocket API is the preferred direction for interactive panel queries.

## 6. Frontend

The frontend is a native sidebar custom panel.

Primary views:

1. **Timeline**
2. **Explain**
3. **Incidents**
4. **Evidence**

The first production UI should optimize for answering a question, not for showing every possible event.

## 7. Security and privacy

The panel is admin-only.

Potentially sensitive fields include:

- user IDs
- entity names
- service payloads
- text states
- automation variables
- trace variables
- URLs/tokens accidentally present in payloads

Exports must use an explicit sanitizer and should be safe-by-default rather than raw-by-default.

## 8. Failure boundaries

HA Forensic Lab must fail open with respect to the smart home:

- recorder failure must not block Home Assistant events
- storage pressure must drop or degrade forensic detail rather than destabilize Core
- analysis failure must not affect automations
- panel failure must not affect capture
- uninstall must not mutate user automations or Recorder data

## v0.1 module direction

The implementation is being introduced in narrow layers:

~~~text
capture.py
models.py
query.py
causality.py
websocket.py
incidents.py
sanitizer.py
~~~

Persistence, incidents and sanitization should be introduced only when their responsibility is implemented.
