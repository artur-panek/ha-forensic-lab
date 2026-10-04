# Sanitized incident export

The only v0.1 export profile is `safe` (sanitizer version 2). There is no raw
export option.

## Bundle

The ZIP contains `manifest.json`, `incident.json` and `summary.md`. Member
metadata is deterministic. ZIP construction runs outside the HA event loop.
The admin-only WebSocket response includes its filename, content type, base64
data, byte size, profile and SHA-256 digest.

## Field policy

| Input | Export |
| --- | --- |
| Absolute event/creation timestamps | Removed; event times become offsets from the window start |
| Incident title | Generic title |
| User IDs | Removed |
| Event/context IDs | Per-export aliases |
| Entity and trace item IDs | Aliases retaining the domain |
| Trace run IDs | Per-export aliases |
| Automation/script names and trigger descriptions | Redacted |
| State strings | `on`, `off`, `open`, `closed`, `locked`, `unlocked`, `idle`, `playing`, `paused`, `standby`, `unavailable`, `unknown`; everything else redacted |
| Service names | `turn_on`, `turn_off`, `toggle`, `reload` remain readable; other names receive aliases |
| Direct script calls | Use the same entity alias mapping as other references to that script |
| Trace status, paths and branch choices | Structural vocabulary allowlist; numeric branch indexes retained |
| Trace condition results | Booleans only |

Event kinds, domains, order, relative timing and relationships between aliased
identifiers remain visible. Aliases are consistent within a bundle; they are
not cross-export identities. This is pseudonymization, not guaranteed anonymity.
Review a bundle before sharing it.

## Bounds

Export uses one saved incident, with at most 500 frozen events and 200 structural
trace steps. Raw event payloads, complete service data, trace config, variables
and arbitrary action results are not included. Tests seed sensitive strings and
check their absence from the unpacked bundle.
