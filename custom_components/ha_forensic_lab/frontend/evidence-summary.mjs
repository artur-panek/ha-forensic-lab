/** Describe captured links without presenting a complete context as a proven cause. */
export function summarizeEvidence(explanation) {
  const events = explanation.events || [];
  const edges = explanation.edges || [];
  const gaps = explanation.gaps || [];
  const related = events.filter((event) => event.event_id !== explanation.target_event_id);
  const anchor = related.findLast((event) =>
    ["automation_triggered", "script_started", "call_service"].includes(event.kind)
  );

  if (gaps.length) {
    return {
      tone: "limited", title: "Part of the history is missing",
      detail: "The recorded links are shown below, but missing evidence prevents a full reconstruction.",
      relatedCount: related.length, anchor,
    };
  }
  if (!edges.length || !related.length) {
    return {
      tone: "neutral", title: "Cause not captured",
      detail: "Only this event is available. The recording does not show what triggered it.",
      relatedCount: related.length, anchor: null,
    };
  }
  if (edges.some((edge) => edge.evidence_type === "parent_context")) {
    return {
      tone: "linked", title: "Linked activity found",
      detail: "Home Assistant recorded a parent context link. These events are related; the link alone does not establish the full cause.",
      relatedCount: related.length, anchor,
    };
  }
  return {
    tone: "neutral", title: "Related events, cause unproven",
    detail: "These events share a Home Assistant context. Their order alone does not show which event caused the change.",
    relatedCount: related.length, anchor,
  };
}
