import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeEvidence } from "../../custom_components/ha_forensic_lab/frontend/evidence-summary.mjs";

const target = { event_id: "target", kind: "state_changed" };
const service = { event_id: "service", kind: "call_service" };
const base = { target_event_id: "target", events: [target], edges: [], gaps: [], complete: true };

test("a complete single-event context does not claim that a cause was found", () => {
  const summary = summarizeEvidence(base);
  assert.equal(summary.title, "Cause not captured");
  assert.equal(summary.tone, "neutral");
  assert.equal(summary.anchor, null);
});

test("same-context sequence keeps causation unproven", () => {
  const summary = summarizeEvidence({ ...base, events: [service, target], edges: [{ evidence_type: "same_context_sequence" }] });
  assert.equal(summary.title, "Related events, cause unproven");
  assert.equal(summary.anchor, service);
});

test("explicit parent links identify related activity without a root-cause claim", () => {
  const summary = summarizeEvidence({ ...base, events: [service, target], edges: [{ evidence_type: "parent_context" }] });
  assert.equal(summary.title, "Linked activity found");
  assert.equal(summary.relatedCount, 1);
  assert.equal(summary.anchor, service);
  assert.ok(summary.detail.includes("does not establish the full cause"));
});

test("missing evidence stays prominent even when there are captured links", () => {
  const summary = summarizeEvidence({ ...base, events: [service, target], edges: [{ evidence_type: "parent_context" }], gaps: ["event_limit_reached"], complete: false });
  assert.equal(summary.title, "Part of the history is missing");
  assert.equal(summary.tone, "limited");
});
