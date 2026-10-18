import assert from "node:assert/strict";
import { test } from "node:test";

let Panel;
globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      getElementById: () => null,
      querySelectorAll: () => [],
    };
  }
};
globalThis.customElements = { define(_name, constructor) { Panel = constructor; } };

await import("../../custom_components/ha_forensic_lab/frontend/ha-forensic-lab-panel.js");

test("missing and invalid timestamps do not become epoch dates", () => {
  const panel = new Panel();
  for (const value of [null, undefined, "", " ", false, true, [], {}, "bad", NaN, Infinity, -Infinity, 1e300, -1e300]) {
    assert.equal(panel._formatDateTime(value), "Unknown timestamp");
    assert.equal(panel._formatTime(value), "Unknown time");
    assert.equal(panel._formatIncidentDate(value), "Unknown date");
  }
});

test("valid timestamps keep epoch zero, fractions and numeric strings", () => {
  const panel = new Panel();
  for (const value of [0, -1, 1.25, "0", "1.25", 1792300000]) {
    assert.equal(panel._formatDateTime(value), new Date(Number(value) * 1000).toISOString());
    assert.notEqual(panel._formatTime(value), "Unknown time");
    assert.notEqual(panel._formatIncidentDate(value), "Unknown date");
  }
});

test("an invalid event timestamp does not hide the rest of the timeline", () => {
  const panel = new Panel();
  panel._hasLoaded = true;
  panel._data.events = [
    { event_id: "bad", kind: "state_changed", timestamp: 1e300, entity_id: "light.bad", old_state: "off", new_state: "on" },
    { event_id: "valid", kind: "state_changed", timestamp: 1, entity_id: "light.valid", old_state: "off", new_state: "on" },
  ];

  panel._render();

  assert.ok(panel.shadowRoot.innerHTML.includes("Unknown timestamp"));
  assert.ok(panel.shadowRoot.innerHTML.includes("light.valid"));
  assert.ok(panel.shadowRoot.innerHTML.includes("light.bad"));
});

test("an invalid incident date still leaves its review and export controls usable", () => {
  const panel = new Panel();
  const html = panel._incidentCard({ incident_id: "saved", title: "Saved event", created_at: -1e300, event_count: 1 });

  assert.ok(html.includes("Saved event"));
  assert.ok(html.includes("Unknown timestamp"));
  assert.ok(html.includes('data-incident-id="saved"'));
  assert.ok(html.includes("review-incident-button"));
  assert.ok(html.includes("export-incident-button"));
});
