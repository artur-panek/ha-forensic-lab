# Context causality

HA Forensic Lab reconstructs relationships from Home Assistant contexts.

The underlying Home Assistant behavior is documented in the
[Home Assistant Context documentation](https://data.home-assistant.io/docs/context/).

## What is confirmed

### Parent context

When an event has:

~~~text
context.id = child
context.parent_id = parent
~~~

Home Assistant explicitly states that the parent context started the child
change. Automations are a common example: an automation creates a new context
whose parent points back to the triggering context.

HA Forensic Lab classifies this as:

~~~text
evidence_class = confirmed
evidence_type = parent_context
~~~

The event chosen from the parent context is a **captured anchor** for that
context. The relationship is between contexts; the anchor must not be described
as the uniquely proven triggering event when multiple events share the parent
context.

### Same context sequence

Home Assistant attaches the same context to events and states that happen as
part of the same change.

HA Forensic Lab can therefore confirm that captured events share a context and
show their observed order:

~~~text
evidence_class = confirmed
evidence_type = same_context_sequence
~~~

This does **not** mean the earlier event is proven to directly cause the next
event. The UI and API must preserve that distinction.

## Missing evidence

v0.1 does not create timing-only causal edges.

If the required context is missing, outside the bounded buffer, or absent from
the original Home Assistant event, the explanation returns an explicit gap
instead of inventing a relationship.

Current gap values include:

- target_context_missing
- parent_context_not_in_buffer:<context_id>
- context_not_in_buffer:<context_id>
- event_limit_reached
- context_depth_limit_reached
- context_cycle_detected

## Explain API

The admin-only WebSocket command:

~~~text
ha_forensic_lab/explain
~~~

accepts an event ID from the current timeline buffer and returns:

- the target event ID
- whether the reconstruction is complete
- context-linked events in chronological order
- typed evidence edges
- explicit evidence gaps

The panel uses this response for **Explain this change**.
