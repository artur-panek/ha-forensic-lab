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
  define(_name, constructor) { Panel = constructor; },
};
await import("../../custom_components/ha_forensic_lab/frontend/ha-forensic-lab-panel.js");

function pendingReviews() {
  const panel = new Panel();
  const requests = [];
  let renders = 0;
  let scrolls = 0;
  panel._render = () => { renders += 1; };
  panel.shadowRoot.getElementById = () => ({
    scrollIntoView() { scrolls += 1; },
  });
  panel._hass = {
    callWS(request) {
      assert.equal(request.type, "ha_forensic_lab/incidents/review");
      return new Promise((resolve, reject) => {
        requests.push({ request, resolve, reject });
      });
    },
  };
  return { panel, requests, renders: () => renders, scrolls: () => scrolls };
}

for (const reply of ["resolve", "reject"]) {
  test(`closed review ignores a late ${reply}`, async () => {
    const state = pendingReviews();
    const { panel, requests } = state;
    const pending = panel._reviewIncident("old");
    panel._closeIncidentReview();
    const renders = state.renders();
    requests[0][reply](reply === "resolve" ? { incident: { incident_id: "old" } } : new Error("old error"));
    await pending;

    assert.equal(panel._reviewIncidentId, null);
    assert.equal(panel._incidentReview, null);
    assert.equal(panel._incidentReviewError, null);
    assert.equal(panel._incidentReviewLoading, false);
    assert.equal(state.renders(), renders);
    assert.equal(state.scrolls(), 0);
  });
}

for (const reply of ["resolve", "reject"]) {
  for (const newerFirst of [false, true]) {
    test(`switching review ignores old ${reply}, newer first: ${newerFirst}`, async () => {
      const state = pendingReviews();
      const { panel, requests } = state;
      const old = panel._reviewIncident("old");
      const current = panel._reviewIncident("new");
      assert.equal(requests.length, 2);
      assert.equal(panel._reviewIncidentId, "new");
      const result = { incident: { incident_id: "new" }, explanation: {} };
      if (newerFirst) {
        requests[1].resolve(result);
        await current;
      }
      const renders = state.renders();
      const scrolls = state.scrolls();
      requests[0][reply](reply === "resolve" ? { incident: { incident_id: "old" } } : new Error("old error"));
      await old;

      assert.equal(panel._incidentReviewError, null);
      assert.equal(panel._incidentReviewLoading, !newerFirst);
      assert.equal(panel._incidentReview, newerFirst ? result : null);
      assert.equal(state.renders(), renders);
      assert.equal(state.scrolls(), scrolls);
      if (!newerFirst) {
        requests[1].resolve(result);
        await current;
      }
      assert.equal(panel._incidentReview, result);
      assert.equal(panel._incidentReviewLoading, false);
      assert.equal(state.scrolls(), 1);
    });
  }
}

test("current review errors remain visible and can be retried", async () => {
  const { panel, requests } = pendingReviews();
  const failed = panel._reviewIncident("current");
  requests[0].reject(new Error("Cannot read saved incident"));
  await failed;
  assert.equal(panel._incidentReviewError, "Cannot read saved incident");
  assert.equal(panel._incidentReviewLoading, false);

  const retried = panel._reviewIncident("current");
  const result = { incident: { incident_id: "current" } };
  requests[1].resolve(result);
  await retried;
  assert.equal(panel._incidentReviewError, null);
  assert.equal(panel._incidentReview, result);
});

test("deleting the selected incident invalidates its pending review", async () => {
  const { panel, requests } = pendingReviews();
  const pending = panel._reviewIncident("deleted");
  const callWS = panel._hass.callWS;
  panel._hass.callWS = (request) => {
    if (request.type.endsWith("/delete")) return Promise.resolve();
    if (request.type.endsWith("/list")) return Promise.resolve([]);
    return callWS(request);
  };
  const confirm = globalThis.confirm;
  globalThis.confirm = () => true;
  try {
    await panel._deleteIncident("deleted");
  } finally {
    globalThis.confirm = confirm;
  }
  requests[0].resolve({ incident: { incident_id: "deleted" } });
  await pending;
  assert.equal(panel._reviewIncidentId, null);
  assert.equal(panel._incidentReview, null);
  assert.equal(panel._incidentReviewLoading, false);
});

for (const reply of ["resolve", "reject"]) {
  test(`reopening the same incident ignores its previous ${reply}`, async () => {
    const { panel, requests } = pendingReviews();
    const old = panel._reviewIncident("same");
    panel._closeIncidentReview();
    const current = panel._reviewIncident("same");
    requests[0][reply](reply === "resolve" ? { stale: true } : new Error("old error"));
    await old;
    assert.equal(panel._reviewIncidentId, "same");
    assert.equal(panel._incidentReview, null);
    assert.equal(panel._incidentReviewError, null);
    assert.equal(panel._incidentReviewLoading, true);
    const result = { incident: { incident_id: "same" } };
    requests[1].resolve(result);
    await current;
    assert.equal(panel._incidentReview, result);
    assert.equal(panel._incidentReviewLoading, false);
  });
}
