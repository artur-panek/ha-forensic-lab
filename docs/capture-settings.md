# Capture and retention settings

HA Forensic Lab exposes capture controls through the integration's Home Assistant
**Configure** action.

Settings live in the config entry options and reload the integration after they
change.

## Rolling event capacity

Default: **2048 events**

Allowed range: **256–8192**

This is an event-count bound, not a time promise. A busy installation may rotate
through 2048 events quickly; a quiet installation may retain the same events for
much longer.

A full buffer continues recording by evicting its oldest event for each new one.
The panel's **Retained span** is the difference between the oldest and newest
timestamps in the entire buffer, independent of timeline filters and page size.
It describes retained events, not a guarantee of complete or continuous history.

Timeline entity/kind filters only change the displayed results. To reduce capture
volume, use the integration options below. For example, exclude a device-clock
entity if its frequent timestamp changes are irrelevant to an investigation.
Increasing capacity to 8192 retains up to four times as many events and increases
memory/storage use; changing the persistence interval does not extend history.

Reducing the capacity immediately rebuilds the in-memory deque at the new bound.
The next rolling persistence write replaces the older larger snapshot.

## Persistence interval

Default: **10 seconds**

Allowed range: **5–60 seconds**

This controls the maximum delay between the first dirty event and the scheduled
rolling snapshot write.

It does not change saved-incident durability: manually saved incidents remain a
separate store and are written immediately.

## Captured event types

The four normalized runtime evidence types can be enabled independently:

- state_changed
- call_service
- automation_triggered
- script_started

An empty selection is valid and effectively pauses new forensic capture without
removing saved incidents.

## Unchanged-state updates

Default: **off**

HA can emit `state_changed` when attributes change or an integration forces an
update even though the state string stays the same. With **Capture unchanged-state
updates** off, entries such as `playing → playing` and `50 → 50` are filtered
before retention and persistence. They increment `dropped_unchanged_state`.

Real state changes, including numeric sensors, entity creation/removal and
availability transitions, remain eligible for capture. Service calls, automation
triggers and script starts still follow their existing kind/exclusion settings.

Enable the option when investigating attribute-triggered automations. It retains
the update's timestamp and context, but does not start storing attributes.
The default also applies to existing entries without this option, and restored
rolling snapshots are filtered on reload. Saved incidents are not rewritten.

## Excluded entities

Specific Home Assistant entities can be excluded with the entity selector.

The exclusion happens **after normalization but before the event enters the
rolling buffer or persistence layer**.

For service calls, excluded targets are removed individually. If a service call
only targets excluded entities, the service event itself is dropped.

## Excluded domains

Domains such as camera, person or device_tracker can be excluded globally.

Domain values are trimmed and case-normalized before comparison.

The same rules are applied to:

- newly captured events
- service-call targets
- events restored from the previous rolling snapshot after an options reload

This last point is intentional: changing a privacy filter must not leave
previously persisted matching events visible in the active forensic buffer.

## Scope boundary

These filters affect the rolling forensic recorder only.

They do not retroactively rewrite manually saved incidents, because saved
incidents are explicit durable evidence captures. Deleting or exporting those
cases remains a separate user action.
