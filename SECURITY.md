# Security policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository when available.
If it is unavailable, open an issue with a minimal description and ask for a
private contact path. Do not include tokens, raw traces or private evidence in a
public issue.

## Data boundaries

The panel, incident actions and custom WebSocket API require a Home Assistant
administrator. Rolling snapshots and incidents use HA's private storage mode;
this is a file-permission setting, not encryption.

Local evidence can contain entity/context/user IDs, state strings, service
names, targets, automation/script names and trigger descriptions. These fields
may be sensitive. Capture omits state attributes, complete service data and
arbitrary event payloads.

The browser fetches raw HA traces on demand and reduces them to structural
steps. Config, variables, blueprint inputs, error text and arbitrary action
results are discarded. Any projection attached to an incident is validated
again by the backend.

The only export profile removes user IDs and absolute timestamps, pseudonymizes
identifiers and redacts free text. It preserves domains, relative timing,
allowlisted states and execution structure. Sanitization reduces disclosure;
it does not guarantee anonymity. Review exported bundles before sharing them.
See the [field policy](docs/export.md).
