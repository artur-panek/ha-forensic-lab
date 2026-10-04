# First alpha release notes draft

> This is a drafting file, not a published release announcement.
>
> Replace all **TBD** fields only after the real-instance release checklist has
> been completed.

# HA Forensic Lab — first alpha

HA Forensic Lab is a runtime forensics toolkit for Home Assistant.

It is built around one question:

> An entity changed. What evidence explains what happened?

Instead of presenting timing guesses as root cause, the alpha reconstructs
Home Assistant context relationships, enriches them with retained automation or
script trace structure when available, and makes missing evidence explicit.

## What you can test

- inspect a bounded runtime timeline
- filter by entity and event type
- run **Explain this change** on a state transition
- inspect parent-context and same-context evidence
- view a privacy-reduced Home Assistant execution trace when HA still retains it
- save an incident before rolling evidence expires
- reopen and review that incident after a restart
- export a safe-profile sanitized ZIP for a bug report
- tune capture scope and retention
- inspect aggregate Recorder health and diagnostics

## Privacy model

HA Forensic Lab intentionally avoids becoming a second raw Home Assistant log.

The rolling recorder does not retain complete event payloads, state attributes
or service data. Full native Home Assistant traces are not persisted by
Forensic Lab.

Portable export is safe-only in this alpha. Identifiers are pseudonymized,
user IDs and absolute event timestamps are removed, and free-text values are
redacted according to the sanitizer policy.

## Important evidence semantics

**Parent context** means Home Assistant explicitly linked a child context to a
parent context.

**Same context** means events belong to the same Home Assistant change context
and are displayed in captured order. It does **not** prove the earlier event
directly caused the later event.

If the evidence is incomplete, HA Forensic Lab shows a gap instead of inventing
a connection.

## Known limitations

- rolling persistence is not a WAL; a hard crash may lose the newest rolling
  evidence since the last completed snapshot
- richer trace analysis depends on traces still retained by Home Assistant
- capture is normalized and intentionally omits many raw payload fields
- the UI/API is admin-only
- there is no raw incident export
- there is no timing-only causal inference, anomaly detector or AI root-cause
  engine

See `docs/known-limitations.md` for the maintained list.

## Compatibility

Minimum Home Assistant version: **TBD after real-instance validation**

Validated Home Assistant versions:

- **TBD**

Do not replace these fields using assumptions from Core HEAD or CI alone.

## Installation

For the first testing build, use the installation method documented for the
alpha announcement.

Before publishing, confirm:

- **TBD** final tag/version
- **TBD** HACS custom-repository instructions
- **TBD** compatibility floor

## What to include in bug reports

Please include:

- Home Assistant version
- HA Forensic Lab version/commit
- reproduction steps
- HA Forensic Lab native diagnostics
- a safe incident ZIP when the bug concerns a captured incident

Do **not** post access tokens or raw Home Assistant trace payloads.

## Alpha testing goal

The first alpha is primarily intended to answer:

1. Does the recorder stay cheap on real installations?
2. Does context reconstruction explain real automation incidents usefully?
3. Which evidence is still missing often enough to justify expanding capture?
4. Are privacy controls and safe exports understandable?
5. What compatibility floor can be supported honestly?
