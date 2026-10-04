# Trace enrichment

The panel can add a retained HA automation/script trace to a context explanation.
It calls the admin-only `trace/contexts` and `trace/get` WebSocket commands.

## Lookup

The panel tries the selected event's context, its parent context, then the
explanation's remaining contexts from newest to oldest. Only automation and
script traces are accepted. If HA has evicted the run, the context chain remains
available and the trace is shown as unavailable.

## Projection

The browser reduces the raw response to:

- domain, item ID, run ID and matched context ID;
- allowlisted trace state and execution status;
- the last structural step and at most 200 step paths;
- boolean condition results and allowlisted or numeric branch choices;
- child automation/script trace references.

Config, blueprint inputs, changed variables, errors, template text, arbitrary
results and trace timestamps are discarded. Arbitrary identifier-shaped text is
not accepted as a structural path or status.

## Saved evidence

Saving the currently explained event may attach its reduced projection. The
backend treats this as untrusted input and validates the fields again before
persistence. Review uses the frozen projection without querying live HA traces.
Saving also works without a trace, using the captured context evidence alone.

Exports pseudonymize item, run and context identifiers. Raw HA traces are never
stored in an incident or exported. See [export policy](export.md).

## Meaning

Trace steps describe execution inside a run. The context graph determines how
the run relates to the selected state change; trace enrichment does not replace
those [evidence rules](causality.md).
