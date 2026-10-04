const TRACE_DOMAINS = new Set(["automation", "script"]);
const SAFE_PATH = /^[A-Za-z0-9_/-]{1,180}$/;
const SAFE_TOKEN = /^[A-Za-z0-9_.:-]{1,96}$/;
const MAX_PROJECTED_STEPS = 200;

export function resolveTraceReference(events, targetEventId, contextMap) {
  if (!contextMap || typeof contextMap !== "object") {
    return null;
  }

  const eventList = Array.isArray(events) ? events : [];
  const target = eventList.find((event) => event.event_id === targetEventId);
  const candidates = [];

  const addContext = (value) => {
    if (
      typeof value === "string" &&
      value &&
      !candidates.includes(value)
    ) {
      candidates.push(value);
    }
  };

  if (target) {
    addContext(target.context_id);
    addContext(target.parent_context_id);
  }

  [...eventList].reverse().forEach((event) => {
    addContext(event.context_id);
    addContext(event.parent_context_id);
  });

  for (const contextId of candidates) {
    const reference = contextMap[contextId];
    if (!reference || typeof reference !== "object") {
      continue;
    }

    if (
      !TRACE_DOMAINS.has(reference.domain) ||
      typeof reference.item_id !== "string" ||
      !reference.item_id ||
      typeof reference.run_id !== "string" ||
      !reference.run_id
    ) {
      continue;
    }

    return {
      context_id: contextId,
      domain: reference.domain,
      item_id: reference.item_id,
      run_id: reference.run_id,
    };
  }

  return null;
}

export function projectTrace(rawTrace, reference) {
  const trace =
    rawTrace && typeof rawTrace === "object" ? rawTrace : {};
  const steps = [];
  let truncated = false;
  const traceMap =
    trace.trace && typeof trace.trace === "object" ? trace.trace : {};

  for (const [mapPath, elements] of Object.entries(traceMap)) {
    if (!Array.isArray(elements)) {
      continue;
    }

    for (const element of elements) {
      if (steps.length >= MAX_PROJECTED_STEPS) {
        truncated = true;
        break;
      }

      if (!element || typeof element !== "object") {
        continue;
      }

      const path = safePath(element.path) || safePath(mapPath);
      if (!path) {
        continue;
      }

      const projected = { path };
      const child = projectChild(element.child_id);
      if (child) {
        projected.child = child;
      }

      if (element.result && typeof element.result === "object") {
        if (typeof element.result.result === "boolean") {
          projected.result = element.result.result;
        }

        const choice = safeToken(element.result.choice);
        if (choice) {
          projected.choice = choice;
        }
      }

      steps.push(projected);
    }

    if (truncated) {
      break;
    }
  }

  return {
    reference: {
      context_id: reference.context_id,
      domain: reference.domain,
      item_id: reference.item_id,
      run_id: reference.run_id,
    },
    state: safeToken(trace.state),
    script_execution: safeToken(trace.script_execution),
    last_step: safePath(trace.last_step),
    steps,
    truncated,
  };
}

function projectChild(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    !TRACE_DOMAINS.has(value.domain) ||
    typeof value.item_id !== "string" ||
    !value.item_id ||
    typeof value.run_id !== "string" ||
    !value.run_id
  ) {
    return null;
  }

  return {
    domain: value.domain,
    item_id: value.item_id,
    run_id: value.run_id,
  };
}

function safePath(value) {
  if (typeof value !== "string" || !SAFE_PATH.test(value)) {
    return null;
  }
  return value;
}

function safeToken(value) {
  if (typeof value !== "string" || !SAFE_TOKEN.test(value)) {
    return null;
  }
  return value;
}
