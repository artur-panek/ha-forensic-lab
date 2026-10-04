# Alpha testing

This document defines the first closed-alpha validation path for HA Forensic Lab.

Passing CI is necessary but not sufficient. The checks below are intended for a
real Home Assistant instance before the project is called alpha-ready.

## Exact candidate build

For real-instance testing, prefer the ZIP artifact produced by the green
**Validate → Code checks** job rather than rebuilding a moving branch locally.

After the candidate PR/commit is green:

1. open its GitHub Actions **Validate** run
2. download the artifact named:

   ~~~text
   ha-forensic-lab-candidate-<full-commit-sha>
   ~~~

3. verify the included `ha-forensic-lab.zip.sha256`
4. record the full commit SHA in the test report
5. install that exact ZIP as described in [installation.md](installation.md)

Candidate artifacts are retained for 14 days. The artifact name binds the test
package to the exact source commit that passed CI.

The artifact is for testing only. Its existence does not mean an alpha release
has been published.

## Read-only smoke client

A zero-touch WebSocket smoke client is included:

~~~bash
HA_URL="https://home.example" \
HA_TOKEN="<long-lived-access-token>" \
node scripts/alpha-smoke.mjs
~~~

Requirements:

- Node.js 22 or newer
- a Home Assistant administrator token
- HA Forensic Lab already installed and configured

The client performs **read-only** checks only:

1. authenticates to Home Assistant's official WebSocket API
2. reads one HA Forensic Lab timeline result
3. lists saved incidents
4. reads privacy-safe runtime diagnostics

It does not call Home Assistant services, change entity state, create incidents
or delete anything.

A healthy result ends with:

~~~text
SMOKE PASS · read-only checks completed
~~~

The token is never printed.

## Manual functional matrix

Use a disposable automation/script or a test entity where practical.

### Install and lifecycle

- [ ] install/update through the intended HACS path
- [ ] add HA Forensic Lab from Settings → Devices & services
- [ ] verify the admin-only sidebar panel appears
- [ ] reload the integration and verify the panel recovers
- [ ] restart Home Assistant and verify the integration loads cleanly
- [ ] unload/remove the integration and verify capture stops without affecting automations

### Runtime capture

- [ ] produce a state change
- [ ] produce a service call
- [ ] trigger an automation
- [ ] run a script
- [ ] verify all enabled event types appear in the timeline
- [ ] verify entity/event-type filtering returns expected results
- [ ] verify Recorder health values update after activity

### Capture privacy settings

Use a recognizable test entity such as `input_boolean.forensic_secret_test`.

- [ ] capture the test entity once
- [ ] add it to **Excluded entities**
- [ ] apply options and allow the integration to reload
- [ ] verify new matching events are not retained
- [ ] restart/reload and verify an older restored rolling snapshot does not re-expose the excluded entity
- [ ] test a domain exclusion with a disposable domain if available
- [ ] verify a mixed-target service call keeps allowed targets while removing excluded ones

### Persistence

- [ ] generate several runtime events
- [ ] wait for at least one completed rolling write
- [ ] restart Home Assistant cleanly
- [ ] verify recent rolling evidence is restored
- [ ] confirm Recorder health reports persistence failures = 0
- [ ] confirm reducing rolling capacity results in the smaller active/persisted buffer

### Explain this change

Use an automation that performs at least one service action.

- [ ] select the resulting state change
- [ ] run **Explain this change**
- [ ] verify parent-context vs same-context labels are not conflated
- [ ] verify missing evidence is shown as a gap rather than invented causality
- [ ] verify a retained Home Assistant trace enriches the view when available
- [ ] verify trace variables/config/raw result payloads are not shown by HA Forensic Lab

### Saved incidents

- [ ] save an explained state change
- [ ] verify the incident appears in Saved incidents
- [ ] restart Home Assistant
- [ ] open **Review**
- [ ] verify deterministic causality is reconstructed from frozen incident evidence
- [ ] verify frozen trace skeleton is available when it was captured
- [ ] delete a disposable saved incident and verify it disappears after reload

### Sanitized export

Before saving, create recognizable test strings where possible:

~~~text
FORensic-secret-entity
FORensic-secret-context
FORensic-secret-free-text
~~~

- [ ] export the incident using **Export safe ZIP**
- [ ] unpack the ZIP
- [ ] inspect `manifest.json`, `incident.json` and `summary.md`
- [ ] verify no known secret test string appears
- [ ] verify user IDs and absolute timestamps are absent
- [ ] verify entity/context/event aliases remain stable inside the one bundle
- [ ] verify the reported SHA-256 matches the downloaded ZIP

### Performance observation

Do not assign arbitrary pass/fail millisecond thresholds yet.

Instead record:

- [ ] average callback duration after normal use
- [ ] maximum callback duration after normal use
- [ ] observed vs retained vs dropped event counts
- [ ] rolling-buffer utilization
- [ ] completed/failed persistence writes
- [ ] Home Assistant logs for HA Forensic Lab warnings/errors

These measurements should inform future thresholds after multiple alpha
installations rather than encoding a guessed limit into v0.1.

## Test report

For each alpha installation record:

~~~text
Home Assistant version:
HA Forensic Lab commit/version:
CI candidate artifact name:
Installation method:
Approximate entity count:
Capture buffer setting:
Persistence interval:
Enabled event kinds:
Excluded entity count:
Excluded domain count:

Read-only smoke: PASS / FAIL
Restart persistence: PASS / FAIL
Explain flow: PASS / FAIL
Trace enrichment: PASS / FAIL
Saved incident review: PASS / FAIL
Sanitized export: PASS / FAIL

Callback average:
Callback maximum:
Persistence failures:

Notes / reproduction:
~~~

Do not attach raw Home Assistant trace payloads. Prefer the safe incident export
and native HA Forensic Lab diagnostics.
