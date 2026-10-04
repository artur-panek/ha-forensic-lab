import assert from "node:assert/strict";
import {
  projectTrace,
  resolveTraceReference,
} from "../../custom_components/ha_forensic_lab/frontend/trace-projection.mjs";

const contexts = {
  "ctx-root": {
    domain: "automation",
    item_id: "hallway_lights",
    run_id: "run-root",
  },
  "ctx-script": {
    domain: "script",
    item_id: "movie_mode",
    run_id: "run-script",
  },
};

{
  const events = [
    {
      event_id: "trigger",
      context_id: "ctx-trigger",
      parent_context_id: null,
    },
    {
      event_id: "target",
      context_id: "ctx-root",
      parent_context_id: "ctx-trigger",
    },
  ];

  assert.deepEqual(
    resolveTraceReference(events, "target", contexts),
    {
      context_id: "ctx-root",
      domain: "automation",
      item_id: "hallway_lights",
      run_id: "run-root",
    }
  );
}

{
  const events = [
    {
      event_id: "automation",
      context_id: "ctx-root",
      parent_context_id: null,
    },
    {
      event_id: "target",
      context_id: "ctx-child-without-trace",
      parent_context_id: "ctx-root",
    },
  ];

  assert.equal(
    resolveTraceReference(events, "target", contexts).run_id,
    "run-root"
  );
}

{
  const raw = {
    state: "stopped",
    script_execution: "finished",
    last_step: "action/1",
    config: {
      secret: "DO-NOT-LEAK-CONFIG",
    },
    blueprint_inputs: {
      password: "DO-NOT-LEAK-BLUEPRINT",
    },
    error: "DO-NOT-LEAK-ERROR",
    trace: {
      "condition/0": [
        {
          path: "condition/0",
          changed_variables: {
            token: "DO-NOT-LEAK-VARIABLE",
          },
          template_errors: ["DO-NOT-LEAK-TEMPLATE"],
          result: {
            result: true,
            event_data: {
              message: "DO-NOT-LEAK-RESULT",
            },
          },
        },
      ],
      "action/0/choose/1": [
        {
          path: "action/0/choose/1",
          result: {
            choice: "then",
            service_response: "DO-NOT-LEAK-SERVICE",
          },
          child_id: {
            domain: "script",
            item_id: "movie_mode",
            run_id: "child-run",
          },
        },
      ],
    },
  };

  const projected = projectTrace(raw, {
    context_id: "ctx-root",
    domain: "automation",
    item_id: "hallway_lights",
    run_id: "run-root",
  });

  assert.equal(projected.state, "stopped");
  assert.equal(projected.script_execution, "finished");
  assert.equal(projected.last_step, "action/1");
  assert.equal(projected.steps.length, 2);
  assert.equal(projected.steps[0].result, true);
  assert.equal(projected.steps[1].choice, "then");
  assert.deepEqual(projected.steps[1].child, {
    domain: "script",
    item_id: "movie_mode",
    run_id: "child-run",
  });

  const serialized = JSON.stringify(projected);
  for (const secret of [
    "DO-NOT-LEAK-CONFIG",
    "DO-NOT-LEAK-BLUEPRINT",
    "DO-NOT-LEAK-ERROR",
    "DO-NOT-LEAK-VARIABLE",
    "DO-NOT-LEAK-TEMPLATE",
    "DO-NOT-LEAK-RESULT",
    "DO-NOT-LEAK-SERVICE",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
}

{
  const trace = {};
  for (let index = 0; index < 220; index += 1) {
    trace["action/" + index] = [{ path: "action/" + index }];
  }

  const projected = projectTrace(
    { trace },
    {
      context_id: "ctx-root",
      domain: "automation",
      item_id: "many_steps",
      run_id: "run-many",
    }
  );

  assert.equal(projected.steps.length, 200);
  assert.equal(projected.truncated, true);
}

console.log("trace projection tests passed");

{
  const projected = projectTrace({
    state: "SECRET_TOKEN_123",
    script_execution: "SECRET_TOKEN_123",
    last_step: "action/SECRET_TOKEN_123",
    trace: {
      "action/0": [{ path: "action/0", result: { choice: "SECRET_TOKEN_123" } }],
      "action/1": [{ path: "action/1", result: { choice: 0 } }],
      "SECRET_TOKEN_123": [{ path: "SECRET_TOKEN_123" }],
    },
  }, { context_id: "ctx-root", domain: "automation", item_id: "test", run_id: "run" });
  assert.equal(JSON.stringify(projected).includes("SECRET_TOKEN_123"), false);
  assert.equal(projected.steps.length, 2);
  assert.equal(projected.steps[1].choice, "0");
}
