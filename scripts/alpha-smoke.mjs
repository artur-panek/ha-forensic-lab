#!/usr/bin/env node

const haUrl = process.env.HA_URL;
const haToken = process.env.HA_TOKEN;

if (!haUrl || !haToken) {
  console.error(
    "Usage: HA_URL=https://home.example HA_TOKEN=<long-lived-token> " +
      "node scripts/alpha-smoke.mjs"
  );
  process.exit(2);
}

if (typeof WebSocket === "undefined") {
  console.error("This smoke client requires Node.js 22 or newer.");
  process.exit(2);
}

function toWebSocketUrl(value) {
  const url = new URL(value);
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else {
    throw new Error("HA_URL must use http:// or https://");
  }

  url.pathname = url.pathname.replace(/\/$/, "") + "/api/websocket";
  url.search = "";
  url.hash = "";
  return url.toString();
}

const wsUrl = toWebSocketUrl(haUrl);
const socket = new WebSocket(wsUrl);
const pending = new Map();
let nextId = 1;
let authenticated = false;

function withTimeout(promise, label, timeoutMs = 10000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(label + " timed out after " + timeoutMs + " ms")),
      timeoutMs
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function callWS(command) {
  if (!authenticated) {
    return Promise.reject(new Error("WebSocket is not authenticated"));
  }

  const id = nextId++;
  return withTimeout(
    new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, ...command }));
    }),
    command.type
  );
}

const ready = withTimeout(
  new Promise((resolve, reject) => {
    socket.addEventListener("error", () => {
      reject(new Error("WebSocket connection failed"));
    });

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        reject(new Error("Home Assistant returned invalid WebSocket JSON"));
        return;
      }

      if (message.type === "auth_required") {
        socket.send(
          JSON.stringify({
            type: "auth",
            access_token: haToken,
          })
        );
        return;
      }

      if (message.type === "auth_ok") {
        authenticated = true;
        resolve();
        return;
      }

      if (message.type === "auth_invalid") {
        reject(new Error("Home Assistant rejected the access token"));
        return;
      }

      if (message.type !== "result" || !pending.has(message.id)) {
        return;
      }

      const request = pending.get(message.id);
      pending.delete(message.id);

      if (!message.success) {
        const error = message.error || {};
        request.reject(
          new Error(
            String(error.code || "websocket_error") +
              ": " +
              String(error.message || "Unknown Home Assistant error")
          )
        );
        return;
      }

      request.resolve(message.result);
    });
  }),
  "Home Assistant authentication"
);

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(label + " did not return an array");
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " did not return an object");
  }
}

try {
  await ready;
  console.log("PASS auth");

  const timeline = await callWS({
    type: "ha_forensic_lab/timeline",
    limit: 1,
  });
  assertObject(timeline, "timeline");
  assertArray(timeline.events, "timeline.events");
  console.log(
    "PASS timeline" +
      " · buffer " +
      String(timeline.buffer_size ?? "?") +
      "/" +
      String(timeline.buffer_capacity ?? "?") +
      " · returned " +
      String(timeline.events.length)
  );

  const incidents = await callWS({
    type: "ha_forensic_lab/incidents/list",
  });
  assertArray(incidents, "incidents/list");
  console.log("PASS incidents/list · saved " + String(incidents.length));

  const diagnostics = await callWS({
    type: "ha_forensic_lab/diagnostics",
  });
  assertObject(diagnostics, "diagnostics");

  const rolling = diagnostics.rolling_buffer || {};
  const capture = diagnostics.capture || {};
  const persistence = diagnostics.persistence || {};
  console.log(
    "PASS diagnostics" +
      " · buffer " +
      String(rolling.utilization_percent ?? "?") +
      "%" +
      " · callback avg " +
      String(capture.handler_average_ms ?? "?") +
      " ms" +
      " · persistence failures " +
      String(persistence.failed_writes ?? "?")
  );

  console.log("SMOKE PASS · read-only checks completed");
  socket.close();
} catch (error) {
  console.error("SMOKE FAIL · " + String(error.message || error));
  socket.close();
  process.exitCode = 1;
}
