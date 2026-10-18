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
globalThis.confirm = () => true;

await import("../../custom_components/ha_forensic_lab/frontend/ha-forensic-lab-panel.js");

function setup() {
  const panel = new Panel();
  const pending = [];
  panel._incidentsLoaded = true;
  panel._hass = {
    callWS(request) {
      if (request.type.endsWith("/list")) {
        return new Promise((resolve, reject) => pending.push({ resolve, reject }));
      }
      if (request.type.endsWith("/create")) {
        return Promise.resolve({ incident_id: "saved", event_count: 1, title: "Test" });
      }
      if (request.type.endsWith("/delete")) return Promise.resolve();
      assert.fail(`Unexpected request: ${request.type}`);
    },
  };
  return { panel, pending };
}

for (const operation of ["save", "delete"]) {
  for (const result of ["resolve", "reject"]) {
    for (const newestFirst of [false, true]) {
      test(`${operation} refresh ignores an older ${result}; newest first: ${newestFirst}`, async () => {
        const { panel, pending } = setup();
        const original = { incident_id: "original" };
        panel._incidents = [original];
        const oldLoad = panel._loadIncidents();
        panel._incidentDraft = {
          eventId: "event", beforeSeconds: "1", afterSeconds: "0",
          title: "Test", preview: { can_save: true },
        };
        const mutation = operation === "save"
          ? panel._saveIncident() : panel._deleteIncident("original");
        await Promise.resolve();
        assert.equal(pending.length, 2, "A mutation must request a fresh incident list");
        const expected = operation === "save" ? [original, { incident_id: "saved" }] : [];
        if (newestFirst) {
          pending[1].resolve(expected);
          await mutation;
        }
        pending[0][result](result === "resolve" ? [original] : new Error("Old list failed"));
        await oldLoad;
        assert.equal(panel._incidentsError, null);
        if (!newestFirst) {
          assert.equal(panel._incidentsLoading, true);
          pending[1].resolve(expected);
          await mutation;
        }
        assert.deepEqual(panel._incidents, expected);
        assert.equal(panel._incidentsLoading, false);
        assert.equal(panel._incidentsError, null);
        if (operation === "save") assert.equal(panel._incidentDraft, null);
      });
    }
  }
}

test("ordinary refresh clicks share the pending list request", async () => {
  const { panel, pending } = setup();
  const first = panel._loadIncidents();
  await panel._loadIncidents();
  assert.equal(pending.length, 1);
  pending[0].resolve([]);
  await first;
});


test("a failed current list refresh can be retried", async () => {
  const { panel, pending } = setup();
  const first = panel._loadIncidents();
  pending[0].reject(new Error("List unavailable"));
  await first;
  assert.equal(panel._incidentsError, "List unavailable");
  assert.equal(panel._incidentsLoading, false);
  const retry = panel._loadIncidents();
  pending[1].resolve([{ incident_id: "restored" }]);
  await retry;
  assert.equal(panel._incidentsError, null);
  assert.deepEqual(panel._incidents, [{ incident_id: "restored" }]);
});
