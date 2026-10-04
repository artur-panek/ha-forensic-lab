# Live trace enrichment

HA Forensic Lab can enrich a deterministic context explanation with a retained Home Assistant automation or script trace.

## Why this is live-only

Home Assistant's full trace payload can contain:

- automation/script config
- blueprint inputs
- changed variables
- template error text
- arbitrary action results
- service/event payload data

HA Forensic Lab therefore does **not** copy the full `trace/get` response into its rolling store or saved incidents.

The admin-only sidebar queries Home Assistant's supported WebSocket commands:

- `trace/contexts`
- `trace/get`

and immediately projects the result into a small structural skeleton.

## Matching

The panel attempts trace lookup in this order:

1. selected event context
2. selected event parent context
3. reconstructed explanation contexts from newest to oldest

Only automation and script traces are accepted.

Home Assistant stores a limited number of traces per automation/script, so an older forensic event can have a valid context chain even when its richer trace has already been evicted.

## Safe projection

The retained panel projection contains only:

- trace domain
- item ID
- run ID
- matched context ID
- trace state
- script execution status
- last structural step
- up to 200 structural trace paths
- child automation/script trace references
- boolean condition outcomes
- simple branch-choice tokens

It deliberately drops:

- config
- blueprint inputs
- changed variables
- error text
- template error text
- arbitrary result payloads
- trace timestamps

The projection lives only in panel memory and is not written to HA Forensic Lab's rolling or incident stores.

## Evidence semantics

Trace enrichment is additional execution evidence. It does not replace the context causality model.

A trace can explain which branch/action path executed inside an automation or script. The context graph still determines how that run relates to the selected Home Assistant state change.
