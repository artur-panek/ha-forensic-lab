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

The raw Home Assistant trace never leaves this live-only boundary.

When the user explicitly saves the currently explained event as an incident, the already reduced projection may be attached as **validated trace evidence**. The backend treats the client projection as untrusted input and re-normalizes it through an allowlist before persistence.

Only the structural fields documented above can enter the incident store. Extra fields, variables, config, error text and arbitrary results cannot be persisted through the incident API.

## Evidence semantics

Trace enrichment is additional execution evidence. It does not replace the context causality model.

A trace can explain which branch/action path executed inside an automation or script. The context graph still determines how that run relates to the selected Home Assistant state change.


## Frozen trace evidence

Saving an incident while a matching trace projection is available freezes that safe structural projection together with the incident.

If no retained Home Assistant trace exists, the incident is still saved normally with context evidence only.

The saved projection remains bounded to 200 structural steps and is included in sanitized exports using pseudonymized automation/script, run and context identifiers.
