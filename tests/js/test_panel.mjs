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
globalThis.customElements = {
  define(name, constructor) {
    assert.equal(name, "ha-forensic-lab-panel");
    Panel = constructor;
  },
};

await import("../../custom_components/ha_forensic_lab/frontend/ha-forensic-lab-panel.js");

test("HA state updates preserve panel DOM and requests use the latest connection", async () => {
  const panel = new Panel();
  let requests = 0;
  const connection = () => ({
    async callWS({ type }) {
      requests += 1;
      if (type.endsWith("/timeline")) return { events: [] };
      if (type.endsWith("/incidents/list")) return [];
      return {};
    },
  });

  panel.connectedCallback();
  panel.hass = connection();
  await Promise.resolve();
  assert.equal(requests, 3);
  assert.equal(panel._hasLoaded, true);
  assert.equal(panel._incidentsLoaded, true);
  assert.equal(panel._diagnosticsLoaded, true);

  // Any innerHTML assignment would destroy draft inputs, focus and open details.
  let replacements = 0;
  Object.defineProperty(panel.shadowRoot, "innerHTML", {
    set() { replacements += 1; },
  });
  const latest = connection();
  panel.hass = latest;
  assert.equal(replacements, 0);
  assert.equal(requests, 3);
  assert.equal(panel._hass, latest);

  await panel._loadTimeline();
  assert.equal(requests, 4);
  assert.ok(replacements > 0);
});

test("full buffers show server-reported retention instead of the filtered page span", async () => {
  const panel = new Panel();
  panel._hass = {
    async callWS() {
      return {
        events: [{ timestamp: 100 }],
        buffer_size: 2048,
        buffer_capacity: 2048,
        retained_span_seconds: 125,
      };
    },
  };
  await panel._loadTimeline();
  const html = panel._statsView(1);
  assert.ok(html.includes("2m 5s"));
  assert.ok(html.includes("Retained span"));
  assert.ok(html.includes("new events replace the oldest"));
  assert.ok(html.includes("Timeline filters only change this view"));
});

test("diagnostics distinguish filtered updates from buffer evictions", () => {
  const panel = new Panel();
  panel._diagnostics = {
    capture: { retained_events: 2883, dropped_unchanged_state: 500, evicted_events: 835 },
  };
  const html = panel._recorderHealthView();
  assert.ok(html.includes("2883 / 500"));
  assert.ok(html.includes("835 evicted this session"));
  assert.ok(html.includes("500 unchanged updates skipped"));
});
