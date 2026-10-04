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

test("busy incident windows require a fresh preview and save the chosen times", async () => {
  const panel = new Panel();
  const requests = [];
  panel._hass = {
    async callWS(request) {
      requests.push(request);
      if (request.type.endsWith("/preview")) {
        const count = request.before_seconds === 300 ? 1585 : 401;
        return { event_count: count, max_events: 500, can_save: count <= 500 };
      }
      if (request.type.endsWith("/create")) return { event_count: 401, title: request.title };
      return [];
    },
  };
  await panel._openIncidentDraft("target");
  assert.ok(panel._incidentPreviewText().includes("1585 / 500"));
  await panel._saveIncident();
  assert.equal(requests.length, 1);

  // Edits must not replace the DOM and interrupt typing or focus.
  let replacements = 0;
  Object.defineProperty(panel.shadowRoot, "innerHTML", { set() { replacements += 1; } });
  panel._updateIncidentDraft("beforeSeconds", "30");
  panel._updateIncidentDraft("afterSeconds", "10");
  panel._updateIncidentDraft("title", 'Hallway <test> "incident"');
  assert.equal(replacements, 0);
  assert.equal(panel._incidentDraft.preview, null);
  assert.ok(panel._incidentDraftView().includes("&lt;test&gt; &quot;incident&quot;"));
  await panel._saveIncident();
  assert.equal(requests.length, 1);
  await panel._previewIncident();
  assert.equal(replacements, 0);
  assert.ok(panel._incidentPreviewText().includes("401 / 500"));
  panel._updateIncidentDraft("title", "Final title");
  await panel._saveIncident();
  assert.deepEqual(requests[2], {
    type: "ha_forensic_lab/incidents/create",
    target_event_id: "target",
    before_seconds: 30,
    after_seconds: 10,
    title: "Final title",
  });
  assert.equal(panel._incidentDraft, null);
  assert.ok(panel._incidentNotice.includes("401 frozen events"));
});

test("failed saves preserve the draft and require another preview", async () => {
  const panel = new Panel();
  let saves = 0;
  const trace = { reference: { run_id: "test-run" }, steps: [] };
  panel._selectedEventId = "target";
  panel._traceProjection = { status: "available", ...trace };
  panel._hass = {
    async callWS(request) {
      if (request.type.endsWith("/preview")) {
        return { event_count: 500, max_events: 500, can_save: true };
      }
      if (request.type.endsWith("/create")) {
        saves += 1;
        assert.deepEqual(request.trace_evidence.reference, trace.reference);
        throw new Error("incident contains 501 events; limit is 500");
      }
      assert.fail("A failed save must not reload the incident list");
    },
  };
  await panel._openIncidentDraft("target");
  panel._updateIncidentDraft("title", "Keep this title");
  // Navigating to another explanation must not attach a different event's trace.
  panel._selectedEventId = "other";
  panel._traceProjection = null;
  await panel._saveIncident();
  assert.equal(panel._incidentDraft.title, "Keep this title");
  assert.equal(panel._incidentDraft.beforeSeconds, "300");
  assert.equal(panel._incidentDraft.afterSeconds, "60");
  assert.equal(panel._incidentDraft.preview, null);
  assert.equal(panel._savingEventId, null);
  assert.ok(panel._incidentPreviewText().includes("501 events"));
  await panel._saveIncident();
  assert.equal(saves, 1);
  await panel._previewIncident();
  await panel._saveIncident();
  assert.equal(saves, 2);
});

test("stale previews cannot enable saving after edits, switching targets or cancellation", async () => {
  const panel = new Panel();
  const pending = [];
  panel._hass = { callWS: () => new Promise((resolve) => pending.push(resolve)) };
  const oldPreview = panel._openIncidentDraft("old-target");
  panel._updateIncidentDraft("beforeSeconds", "10");
  pending.shift()({ event_count: 10, max_events: 500, can_save: true });
  await oldPreview;
  assert.equal(panel._incidentDraft.preview, null);

  const editedPreview = panel._previewIncident();
  const newPreview = panel._openIncidentDraft("new-target");
  pending.shift()({ event_count: 10, max_events: 500, can_save: true });
  await editedPreview;
  assert.equal(panel._incidentDraft.eventId, "new-target");
  assert.equal(panel._incidentDraft.preview, null);
  assert.equal(panel._incidentDraft.previewLoading, true);
  panel._closeIncidentDraft();
  pending.shift()({ event_count: 20, max_events: 500, can_save: true });
  await newPreview;
  assert.equal(panel._incidentDraft, null);
});

test("invalid window input is rejected before requesting a preview", async () => {
  const panel = new Panel();
  let requests = 0;
  panel._hass = {
    async callWS() {
      requests += 1;
      return { event_count: 1, max_events: 500, can_save: true };
    },
  };
  await panel._openIncidentDraft("target");
  for (const value of ["", " ", "-1", "3601", "NaN", "Infinity"]) {
    panel._updateIncidentDraft("beforeSeconds", value);
    await panel._previewIncident();
    assert.equal(panel._incidentDraft.preview, null);
    assert.ok(panel._incidentPreviewText().includes("0 to 3600 seconds"));
    await panel._saveIncident();
  }
  assert.equal(requests, 1);
});
