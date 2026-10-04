# Security policy

HA Forensic Lab may process sensitive Home Assistant runtime data. Security and privacy issues are therefore treated as first-class bugs.

## Reporting a vulnerability

Please do not publish secrets, tokens, private event payloads or incident exports in a public issue.

For a suspected vulnerability, use GitHub's private vulnerability reporting feature for this repository when available.

If private reporting is unavailable, open a public issue containing only a minimal description and no sensitive reproduction data, and ask for a private contact path.

## Sensitive forensic data

Assume incident captures may contain:

- entity and device names
- user identifiers
- service call data
- automation/script variables
- URLs or credentials accidentally present in payloads

Sanitized export is a product requirement, not an optional convenience.
