import { projectTrace, resolveTraceReference } from "./trace-projection.mjs";

class HAForensicLabPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._narrow = false;
    this._panel = null;
    this._data = {
      events: [],
      buffer_size: 0,
      buffer_capacity: 0,
    };
    this._filters = {
      entityId: "",
      kind: "",
    };
    this._loading = false;
    this._hasLoaded = false;
    this._error = null;
    this._requestId = 0;
    this._selectedEventId = null;
    this._explanation = null;
    this._explainLoading = false;
    this._explainError = null;
    this._explainRequestId = 0;
    this._traceProjection = null;
    this._traceLoading = false;
    this._traceError = null;
    this._traceRequestId = 0;
    this._incidents = [];
    this._incidentsLoaded = false;
    this._incidentsLoading = false;
    this._incidentsError = null;
    this._savingEventId = null;
    this._exportingIncidentId = null;
    this._deletingIncidentId = null;
    this._incidentNotice = null;
    this._reviewIncidentId = null;
    this._incidentReview = null;
    this._incidentReviewLoading = false;
    this._incidentReviewError = null;
    this._diagnostics = null;
    this._diagnosticsLoaded = false;
    this._diagnosticsLoading = false;
    this._diagnosticsError = null;
  }

  connectedCallback() {
    this._render();

    if (this._hass && !this._hasLoaded && !this._loading) {
      void this._loadTimeline();
    }
    if (this._hass && !this._incidentsLoaded && !this._incidentsLoading) {
      void this._loadIncidents();
    }
    if (
      this._hass &&
      !this._diagnosticsLoaded &&
      !this._diagnosticsLoading
    ) {
      void this._loadDiagnostics();
    }
  }

  set hass(value) {
    const firstConnection = !this._hass;
    this._hass = value;
    this._render();

    if (firstConnection && value && !this._hasLoaded && !this._loading) {
      void this._loadTimeline();
    }
    if (
      firstConnection &&
      value &&
      !this._incidentsLoaded &&
      !this._incidentsLoading
    ) {
      void this._loadIncidents();
    }
    if (
      firstConnection &&
      value &&
      !this._diagnosticsLoaded &&
      !this._diagnosticsLoading
    ) {
      void this._loadDiagnostics();
    }
  }

  set narrow(value) {
    this._narrow = value;
  }

  set panel(value) {
    this._panel = value;
  }

  async _loadTimeline() {
    if (!this._hass || this._loading) {
      return;
    }

    const requestId = ++this._requestId;
    const request = {
      type: "ha_forensic_lab/timeline",
      limit: 100,
    };

    if (this._filters.entityId) {
      request.entity_id = this._filters.entityId;
    }

    if (this._filters.kind) {
      request.kind = this._filters.kind;
    }

    this._loading = true;
    this._error = null;
    this._render();

    try {
      const data = await this._hass.callWS(request);
      if (requestId !== this._requestId) {
        return;
      }

      this._data = {
        events: Array.isArray(data.events) ? data.events : [],
        buffer_size: Number(data.buffer_size) || 0,
        buffer_capacity: Number(data.buffer_capacity) || 0,
      };
      this._hasLoaded = true;
    } catch (error) {
      if (requestId !== this._requestId) {
        return;
      }

      this._error =
        error && error.message ? String(error.message) : "Unable to load timeline";
      this._hasLoaded = true;
    } finally {
      if (requestId === this._requestId) {
        this._loading = false;
        this._render();
      }
    }
  }

  async _loadDiagnostics() {
    if (!this._hass || this._diagnosticsLoading) {
      return;
    }

    this._diagnosticsLoading = true;
    this._diagnosticsError = null;
    this._render();

    try {
      this._diagnostics = await this._hass.callWS({
        type: "ha_forensic_lab/diagnostics",
      });
      this._diagnosticsLoaded = true;
    } catch (error) {
      this._diagnosticsError =
        error && error.message
          ? String(error.message)
          : "Unable to read recorder diagnostics";
      this._diagnosticsLoaded = true;
    } finally {
      this._diagnosticsLoading = false;
      this._render();
    }
  }

  async _loadIncidents() {
    if (!this._hass || this._incidentsLoading) {
      return;
    }

    this._incidentsLoading = true;
    this._incidentsError = null;
    this._render();

    try {
      const data = await this._hass.callWS({
        type: "ha_forensic_lab/incidents/list",
      });
      this._incidents = Array.isArray(data) ? data : [];
      this._incidentsLoaded = true;
    } catch (error) {
      this._incidentsError =
        error && error.message
          ? String(error.message)
          : "Unable to load saved incidents";
      this._incidentsLoaded = true;
    } finally {
      this._incidentsLoading = false;
      this._render();
    }
  }


  _traceEvidenceForIncident(eventId) {
    const trace = this._traceProjection;

    if (
      this._selectedEventId !== eventId ||
      !trace ||
      trace.status !== "available"
    ) {
      return null;
    }

    return {
      reference: trace.reference,
      state: trace.state ?? null,
      script_execution: trace.script_execution ?? null,
      last_step: trace.last_step ?? null,
      steps: Array.isArray(trace.steps) ? trace.steps : [],
      truncated: Boolean(trace.truncated),
    };
  }

  async _saveIncident(eventId) {
    if (!this._hass || !eventId || this._savingEventId) {
      return;
    }

    this._savingEventId = eventId;
    this._incidentNotice = null;
    this._incidentsError = null;
    this._render();

    let saved = false;
    try {
      const request = {
        type: "ha_forensic_lab/incidents/create",
        target_event_id: eventId,
      };
      const traceEvidence = this._traceEvidenceForIncident(eventId);
      if (traceEvidence) {
        request.trace_evidence = traceEvidence;
      }

      const incident = await this._hass.callWS(request);
      this._incidentNotice =
        "Saved " +
        String(incident.event_count || 0) +
        " frozen events" +
        (incident.has_trace_evidence ? " + trace evidence" : "") +
        " as " +
        String(incident.title || "incident") +
        ".";
      saved = true;
    } catch (error) {
      this._incidentsError =
        error && error.message
          ? String(error.message)
          : "Unable to save incident";
    } finally {
      this._savingEventId = null;
    }

    if (saved) {
      await this._loadIncidents();
    } else {
      this._render();
    }
  }


  async _reviewIncident(incidentId) {
    if (!this._hass || !incidentId || this._incidentReviewLoading) {
      return;
    }

    this._reviewIncidentId = incidentId;
    this._incidentReview = null;
    this._incidentReviewError = null;
    this._incidentReviewLoading = true;
    this._render();

    try {
      this._incidentReview = await this._hass.callWS({
        type: "ha_forensic_lab/incidents/review",
        incident_id: incidentId,
        max_events: 100,
      });
    } catch (error) {
      this._incidentReviewError =
        error && error.message
          ? String(error.message)
          : "Unable to review saved incident";
    } finally {
      this._incidentReviewLoading = false;
      this._render();

      const reviewPanel =
        this.shadowRoot && this.shadowRoot.getElementById("saved-review-panel");
      if (reviewPanel) {
        reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  _closeIncidentReview() {
    this._reviewIncidentId = null;
    this._incidentReview = null;
    this._incidentReviewError = null;
    this._incidentReviewLoading = false;
    this._render();
  }

  async _exportIncident(incidentId) {
    if (!this._hass || !incidentId || this._exportingIncidentId) {
      return;
    }

    this._exportingIncidentId = incidentId;
    this._incidentNotice = null;
    this._render();

    try {
      const bundle = await this._hass.callWS({
        type: "ha_forensic_lab/incidents/export",
        incident_id: incidentId,
      });
      this._downloadExportBundle(bundle);
      const digest = bundle.sha256 ? String(bundle.sha256).slice(0, 12) : null;
      this._incidentNotice =
        "Safe export prepared" +
        (digest ? " · SHA-256 " + digest + "…" : "") +
        ".";
    } catch (error) {
      this._incidentsError =
        error && error.message
          ? String(error.message)
          : "Unable to export incident";
    } finally {
      this._exportingIncidentId = null;
      this._render();
    }
  }

  async _deleteIncident(incidentId) {
    if (!this._hass || !incidentId || this._deletingIncidentId) {
      return;
    }

    if (
      !globalThis.confirm(
        "Delete this saved incident? This removes its frozen evidence permanently."
      )
    ) {
      return;
    }

    this._deletingIncidentId = incidentId;
    this._incidentNotice = null;
    this._incidentsError = null;
    this._render();

    let deleted = false;
    try {
      await this._hass.callWS({
        type: "ha_forensic_lab/incidents/delete",
        incident_id: incidentId,
      });
      this._incidentNotice = "Saved incident deleted.";
      if (this._reviewIncidentId === incidentId) {
        this._reviewIncidentId = null;
        this._incidentReview = null;
        this._incidentReviewError = null;
      }
      deleted = true;
    } catch (error) {
      this._incidentsError =
        error && error.message
          ? String(error.message)
          : "Unable to delete incident";
    } finally {
      this._deletingIncidentId = null;
    }

    if (deleted) {
      await this._loadIncidents();
    } else {
      this._render();
    }
  }

  _downloadExportBundle(bundle) {
    if (!bundle || bundle.encoding !== "base64" || !bundle.data) {
      throw new Error("Export bundle has an unsupported encoding");
    }

    const binary = globalThis.atob(String(bundle.data));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob([bytes], {
      type: bundle.content_type || "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = bundle.filename || "ha-forensic-lab-incident.zip";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async _loadExplanation(eventId) {
    if (!this._hass || !eventId || this._explainLoading) {
      return;
    }

    const requestId = ++this._explainRequestId;
    this._selectedEventId = eventId;
    this._explanation = null;
    this._explainError = null;
    this._explainLoading = true;
    this._render();

    try {
      const data = await this._hass.callWS({
        type: "ha_forensic_lab/explain",
        event_id: eventId,
        max_events: 50,
      });

      if (requestId !== this._explainRequestId) {
        return;
      }

      this._explanation = data;
      void this._loadTraceForExplanation(data, eventId);
    } catch (error) {
      if (requestId !== this._explainRequestId) {
        return;
      }

      this._explainError =
        error && error.message
          ? String(error.message)
          : "Unable to reconstruct context evidence";
    } finally {
      if (requestId === this._explainRequestId) {
        this._explainLoading = false;
        this._render();

        const explanationPanel =
          this.shadowRoot && this.shadowRoot.getElementById("explanation-panel");
        if (explanationPanel) {
          explanationPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  }


  async _loadTraceForExplanation(explanation, eventId) {
    if (!this._hass || !explanation) {
      return;
    }

    const requestId = ++this._traceRequestId;
    this._traceProjection = null;
    this._traceError = null;
    this._traceLoading = true;
    this._render();

    try {
      const contexts = await this._hass.callWS({
        type: "trace/contexts",
      });

      if (requestId !== this._traceRequestId) {
        return;
      }

      const reference = resolveTraceReference(
        Array.isArray(explanation.events) ? explanation.events : [],
        eventId,
        contexts
      );

      if (!reference) {
        this._traceProjection = {
          status: "unavailable",
          reason:
            "No retained Home Assistant automation or script trace matched this context chain.",
        };
        return;
      }

      const rawTrace = await this._hass.callWS({
        type: "trace/get",
        domain: reference.domain,
        item_id: reference.item_id,
        run_id: reference.run_id,
      });

      if (requestId !== this._traceRequestId) {
        return;
      }

      this._traceProjection = {
        status: "available",
        ...projectTrace(rawTrace, reference),
      };
    } catch (error) {
      if (requestId !== this._traceRequestId) {
        return;
      }

      this._traceError =
        error && error.message
          ? String(error.message)
          : "Home Assistant trace data is unavailable";
    } finally {
      if (requestId === this._traceRequestId) {
        this._traceLoading = false;
        this._render();
      }
    }
  }

  _closeExplanation() {
    this._explainRequestId += 1;
    this._traceRequestId += 1;
    this._selectedEventId = null;
    this._explanation = null;
    this._explainError = null;
    this._explainLoading = false;
    this._traceProjection = null;
    this._traceLoading = false;
    this._traceError = null;
    this._render();
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const events = this._data.events || [];
    const status = this._statusView();
    const content = this._contentView(events);
    const explanation = this._explanationView();
    const incidents = this._incidentsView();
    const savedReview = this._savedIncidentReviewView();
    const recorderHealth = this._recorderHealthView();

    this.shadowRoot.innerHTML =
      this._styles() +
      '<main>' +
      '<header class="hero">' +
      '<div>' +
      '<div class="eyebrow">Runtime forensics for Home Assistant</div>' +
      '<h1>HA Forensic Lab</h1>' +
      '<p class="lead">Inspect the runtime evidence around state changes, service calls, automations and scripts.</p>' +
      '</div>' +
      status +
      '</header>' +
      this._statsView(events.length) +
      recorderHealth +
      this._filtersView() +
      incidents +
      savedReview +
      explanation +
      content +
      '<footer>Evidence-first by design. This view shows normalized runtime metadata only; raw event payloads are not exposed.</footer>' +
      '</main>';

    this._bindControls();
  }

  _statusView() {
    let label = "Capture active";
    let state = "ok";

    if (this._loading) {
      label = "Refreshing";
      state = "loading";
    } else if (this._error) {
      label = "Read error";
      state = "error";
    } else if (!this._hasLoaded) {
      label = "Connecting";
      state = "loading";
    }

    return (
      '<div class="status ' +
      state +
      '"><span class="dot"></span><span>' +
      this._escape(label) +
      "</span></div>"
    );
  }

  _statsView(returnedCount) {
    const size = this._data.buffer_size || 0;
    const capacity = this._data.buffer_capacity || 0;
    const utilization = capacity > 0 ? Math.round((size / capacity) * 100) : 0;

    return (
      '<section class="stats" aria-label="Capture status">' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(size) +
      '</span><span class="stat-label">Events buffered</span></div>' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(capacity || "—") +
      '</span><span class="stat-label">Buffer capacity</span></div>' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(utilization + "%") +
      '</span><span class="stat-label">Buffer used</span></div>' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(returnedCount) +
      '</span><span class="stat-label">Events shown</span></div>' +
      "</section>"
    );
  }

  _recorderHealthView() {
    const data = this._diagnostics;

    if (this._diagnosticsLoading && !this._diagnosticsLoaded) {
      return (
        '<section class="health-panel">' +
        '<div class="section-heading health-heading"><div><span class="section-kicker">Recorder health</span><h2>Runtime overhead</h2></div></div>' +
        '<div class="health-state"><div class="spinner" aria-hidden="true"></div><span>Reading aggregate recorder diagnostics…</span></div>' +
        "</section>"
      );
    }

    if (this._diagnosticsError) {
      return (
        '<section class="health-panel">' +
        '<div class="section-heading health-heading"><div><span class="section-kicker">Recorder health</span><h2>Runtime overhead</h2></div>' +
        '<button class="button button-small" id="refresh-diagnostics" type="button">Retry</button></div>' +
        '<div class="health-error">' +
        this._escape(this._diagnosticsError) +
        "</div></section>"
      );
    }

    if (!data) {
      return "";
    }

    const capture = data.capture || {};
    const persistence = data.persistence || {};
    const rolling = data.rolling_buffer || {};
    const dropped =
      Number(capture.normalization_drops || 0) +
      Number(capture.dropped_disabled_kind || 0) +
      Number(capture.dropped_excluded_entity || 0) +
      Number(capture.dropped_excluded_domain || 0) +
      Number(capture.dropped_excluded_targets || 0);
    const persistenceLabel =
      Number(persistence.failed_writes || 0) > 0
        ? String(persistence.failed_writes) + " failed writes"
        : persistence.pending_save
          ? "write pending"
          : "idle · no failures";

    return (
      '<section class="health-panel">' +
      '<div class="section-heading health-heading"><div><span class="section-kicker">Recorder health</span><h2>Runtime overhead</h2></div>' +
      '<button class="button button-small" id="refresh-diagnostics" type="button"' +
      (this._diagnosticsLoading ? " disabled" : "") +
      ">" +
      (this._diagnosticsLoading ? "Refreshing…" : "Refresh") +
      "</button></div>" +
      '<div class="health-grid">' +
      this._healthMetric(
        this._formatMetric(capture.handler_average_ms, 3) + " ms",
        "Callback average"
      ) +
      this._healthMetric(
        this._formatMetric(capture.handler_max_ms, 3) + " ms",
        "Callback maximum"
      ) +
      this._healthMetric(
        this._formatMetric(capture.retained_events, 0) +
          " / " +
          this._formatMetric(dropped, 0),
        "Retained / dropped"
      ) +
      this._healthMetric(
        this._formatMetric(rolling.utilization_percent, 1) + "%",
        "Rolling buffer used"
      ) +
      "</div>" +
      '<div class="health-foot"><span>Persistence: <strong>' +
      this._escape(persistenceLabel) +
      "</strong></span><span>" +
      this._escape(
        Number(persistence.completed_writes || 0) + " completed writes"
      ) +
      '</span><span class="health-privacy">Aggregate counters only · no forensic payloads</span></div>' +
      "</section>"
    );
  }

  _healthMetric(value, label) {
    return (
      '<div class="health-metric"><strong>' +
      this._escape(value) +
      '</strong><span>' +
      this._escape(label) +
      "</span></div>"
    );
  }

  _formatMetric(value, decimals) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "—";
    }
    return decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric));
  }

  _filtersView() {
    const kinds = [
      ["", "All event types"],
      ["state_changed", "State changes"],
      ["call_service", "Service calls"],
      ["automation_triggered", "Automations"],
      ["script_started", "Scripts"],
    ];

    const options = kinds
      .map(
        ([value, label]) =>
          '<option value="' +
          this._escape(value) +
          '"' +
          (this._filters.kind === value ? " selected" : "") +
          ">" +
          this._escape(label) +
          "</option>"
      )
      .join("");

    return (
      '<section class="toolbar">' +
      '<form id="timeline-filters">' +
      '<label class="field"><span>Entity</span><input id="entity-filter" type="text" autocomplete="off" spellcheck="false" placeholder="light.hallway" value="' +
      this._escape(this._filters.entityId) +
      '"></label>' +
      '<label class="field"><span>Event type</span><select id="kind-filter">' +
      options +
      "</select></label>" +
      '<div class="actions">' +
      '<button class="button primary" type="submit"' +
      (this._loading ? " disabled" : "") +
      ">Apply</button>" +
      '<button class="button" id="refresh-timeline" type="button"' +
      (this._loading ? " disabled" : "") +
      ">Refresh</button>" +
      '<button class="button quiet" id="clear-filters" type="button"' +
      (this._loading ? " disabled" : "") +
      ">Clear</button>" +
      "</div>" +
      "</form>" +
      "</section>"
    );
  }

  _contentView(events) {
    if (this._error) {
      return (
        '<section class="state-card error-card">' +
        "<strong>Could not read the forensic timeline.</strong>" +
        "<p>" +
        this._escape(this._error) +
        "</p>" +
        '<button class="button primary" id="retry-timeline" type="button">Try again</button>' +
        "</section>"
      );
    }

    if (this._loading && !this._hasLoaded) {
      return (
        '<section class="state-card">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        "<strong>Reading runtime evidence…</strong>" +
        "<p>The recorder stays bounded in memory while the timeline is queried.</p>" +
        "</section>"
      );
    }

    if (!events.length) {
      const filtered = this._filters.entityId || this._filters.kind;
      return (
        '<section class="state-card">' +
        "<strong>" +
        (filtered ? "No matching events." : "No runtime events captured yet.") +
        "</strong>" +
        "<p>" +
        (filtered
          ? "Try clearing the filters or generate some Home Assistant activity."
          : "Use Home Assistant normally, then refresh this view.") +
        "</p>" +
        "</section>"
      );
    }

    return (
      '<section class="timeline-section">' +
      '<div class="section-heading"><div><span class="section-kicker">Newest first</span><h2>Runtime timeline</h2></div>' +
      (this._loading ? '<span class="refresh-note">Refreshing…</span>' : "") +
      "</div>" +
      '<div class="timeline">' +
      events.map((event) => this._eventView(event)).join("") +
      "</div>" +
      "</section>"
    );
  }

  _eventView(event) {
    const kind = String(event.kind || "unknown");
    const title = this._eventTitle(event);
    const summary = this._eventSummary(event);
    const timestamp = this._formatTime(event.timestamp);
    const dateTime = this._formatDateTime(event.timestamp);
    const metadata = this._metadataView(event, dateTime);
    const selected = event.event_id === this._selectedEventId;
    const explainAction =
      event.kind === "state_changed"
        ? '<div class="event-actions">' +
          '<button class="button button-small explain-button" type="button" data-explain-id="' +
          this._escape(event.event_id) +
          '"' +
          (this._explainLoading && selected ? " disabled" : "") +
          ">" +
          (this._explainLoading && selected
            ? "Reconstructing…"
            : "Explain this change") +
          "</button>" +
          '<button class="button button-small save-incident-button" type="button" data-save-event-id="' +
          this._escape(event.event_id) +
          '"' +
          (this._savingEventId === event.event_id ||
          (selected && this._traceLoading)
            ? " disabled"
            : "") +
          ">" +
          (this._savingEventId === event.event_id
            ? "Saving…"
            : selected && this._traceLoading
              ? "Trace loading…"
              : "Save incident") +
          "</button></div>"
        : "";

    return (
      '<article class="event">' +
      '<div class="rail" aria-hidden="true"><span class="marker ' +
      this._escape(kind) +
      '"></span></div>' +
      '<div class="event-card' +
      (selected ? " selected" : "") +
      '">' +
      '<div class="event-head">' +
      '<div class="event-heading">' +
      '<span class="kind">' +
      this._escape(this._kindLabel(kind)) +
      "</span>" +
      '<strong class="event-title">' +
      title +
      "</strong>" +
      "</div>" +
      '<time class="time" title="' +
      this._escape(dateTime) +
      '">' +
      this._escape(timestamp) +
      "</time>" +
      "</div>" +
      (summary ? '<div class="event-summary">' + summary + "</div>" : "") +
      explainAction +
      metadata +
      "</div>" +
      "</article>"
    );
  }

  _eventTitle(event) {
    if (event.kind === "state_changed") {
      return this._code(event.entity_id || "unknown entity");
    }

    if (event.kind === "call_service") {
      const serviceName =
        event.domain && event.service
          ? event.domain + "." + event.service
          : event.service || event.domain || "service call";
      return this._code(serviceName);
    }

    if (event.kind === "automation_triggered") {
      return this._escape(event.name || event.entity_id || "Automation");
    }

    if (event.kind === "script_started") {
      return this._escape(event.name || event.entity_id || "Script");
    }

    return this._escape(event.entity_id || event.name || "Runtime event");
  }

  _eventSummary(event) {
    if (event.kind === "state_changed") {
      return (
        '<span class="state-value">' +
        this._escape(this._nullable(event.old_state)) +
        '</span><span class="arrow">→</span><span class="state-value">' +
        this._escape(this._nullable(event.new_state)) +
        "</span>"
      );
    }

    if (event.kind === "call_service") {
      const targets = Array.isArray(event.target_entity_ids)
        ? event.target_entity_ids
        : [];

      if (!targets.length) {
        return '<span class="muted">No entity target captured</span>';
      }

      return (
        '<span class="muted">Targets</span> ' +
        targets.map((target) => this._code(target)).join(" ")
      );
    }

    if (event.kind === "automation_triggered") {
      const identity =
        event.entity_id && event.name
          ? this._code(event.entity_id) + " "
          : "";
      const source = event.source
        ? '<span class="muted">Triggered by</span> ' + this._escape(event.source)
        : '<span class="muted">Automation triggered</span>';
      return identity + source;
    }

    if (event.kind === "script_started" && event.entity_id) {
      return this._code(event.entity_id);
    }

    return "";
  }

  _metadataView(event, dateTime) {
    const rows = [
      ["Event ID", event.event_id],
      ["Context", event.context_id],
      ["Parent context", event.parent_context_id],
      ["User", event.user_id],
      ["Timestamp", dateTime],
    ].filter(([, value]) => value !== null && value !== undefined && value !== "");

    if (!rows.length) {
      return "";
    }

    return (
      "<details>" +
      "<summary>Evidence metadata</summary>" +
      '<div class="metadata">' +
      rows
        .map(
          ([label, value]) =>
            '<div class="metadata-row"><span>' +
            this._escape(label) +
            "</span>" +
            this._code(value) +
            "</div>"
        )
        .join("") +
      "</div>" +
      "</details>"
    );
  }




  _savedIncidentReviewView() {
    if (!this._reviewIncidentId) {
      return "";
    }

    if (this._incidentReviewLoading) {
      return (
        '<section class="saved-review-panel" id="saved-review-panel">' +
        this._savedReviewHeader(null, null) +
        '<div class="trace-state"><div class="spinner" aria-hidden="true"></div>' +
        '<div><strong>Reconstructing frozen evidence…</strong><p>This review uses the saved incident only; it does not depend on the live rolling buffer.</p></div></div>' +
        "</section>"
      );
    }

    if (this._incidentReviewError) {
      return (
        '<section class="saved-review-panel" id="saved-review-panel">' +
        this._savedReviewHeader(null, null) +
        '<div class="trace-state"><div><strong>Could not review this incident.</strong><p>' +
        this._escape(this._incidentReviewError) +
        '</p><button class="button primary" id="retry-incident-review" type="button">Try again</button></div></div>' +
        "</section>"
      );
    }

    if (!this._incidentReview) {
      return "";
    }

    const review = this._incidentReview;
    const incident = review.incident || {};
    const explanation = review.explanation || {};
    const events = Array.isArray(explanation.events) ? explanation.events : [];
    const edges = Array.isArray(explanation.edges) ? explanation.edges : [];
    const gaps = Array.isArray(explanation.gaps) ? explanation.gaps : [];
    const targetEventId = explanation.target_event_id;

    const chain = events
      .map((event, index) => {
        const incoming =
          index === 0
            ? null
            : edges.find((edge) => edge.target_event_id === event.event_id);
        return (
          (index === 0 ? "" : this._evidenceConnectorView(incoming)) +
          this._explanationEventView(event, targetEventId)
        );
      })
      .join("");

    const gapView = gaps.length
      ? '<div class="evidence-gaps"><div class="gap-title">Frozen evidence gaps</div>' +
        gaps
          .map(
            (gap) =>
              '<div class="gap-row"><span class="gap-marker">!</span><span>' +
              this._escape(this._gapLabel(gap)) +
              "</span></div>"
          )
          .join("") +
        "</div>"
      : "";

    const status = {
      className: explanation.complete ? "complete" : "incomplete",
      label: explanation.complete
        ? "Frozen context evidence complete"
        : "Frozen evidence gap",
    };

    return (
      '<section class="saved-review-panel" id="saved-review-panel">' +
      this._savedReviewHeader(incident, status) +
      '<div class="evidence-note"><strong>Durable review</strong><p>This causality chain is reconstructed from the incident snapshot, so it remains reviewable after rolling-buffer eviction or a Home Assistant restart.</p></div>' +
      gapView +
      '<div class="chain-heading"><span class="section-kicker">Frozen · oldest to newest</span><h3>Context evidence chain</h3></div>' +
      '<div class="explain-chain">' +
      chain +
      "</div>" +
      this._frozenTraceView(review.trace_evidence) +
      "</section>"
    );
  }

  _savedReviewHeader(incident, status) {
    const title =
      incident && incident.title ? incident.title : "Saved incident";
    const meta =
      incident && incident.event_count
        ? '<div class="saved-review-meta"><span>' +
          this._escape(incident.event_count) +
          " frozen events</span>" +
          (incident.has_trace_evidence
            ? '<span class="incident-trace-badge">trace frozen</span>'
            : "") +
          "</div>"
        : "";
    const statusView = status
      ? '<span class="evidence-status ' +
        this._escape(status.className) +
        '">' +
        this._escape(status.label) +
        "</span>"
      : "";

    return (
      '<div class="explain-head"><div><span class="section-kicker">Saved incident review</span><h2>' +
      this._escape(title) +
      "</h2>" +
      meta +
      "</div>" +
      '<div class="explain-head-actions">' +
      statusView +
      '<button class="icon-button" id="close-incident-review" type="button" aria-label="Close saved incident review" title="Close saved incident review">×</button>' +
      "</div></div>"
    );
  }

  _frozenTraceView(trace) {
    if (!trace) {
      return (
        '<section class="trace-panel">' +
        '<div class="trace-head"><div><span class="section-kicker">Frozen trace evidence</span><h3>Execution trace</h3></div>' +
        '<span class="trace-badge muted-badge">Not captured</span></div>' +
        '<div class="trace-state"><div><strong>No frozen trace projection.</strong><p>The incident still contains its deterministic context evidence. The richer Home Assistant trace was not available when it was saved.</p></div></div>' +
        "</section>"
      );
    }

    const reference = trace.reference || {};
    const identity =
      reference.domain && reference.item_id
        ? reference.domain + "." + reference.item_id
        : "automation/script";
    const steps = Array.isArray(trace.steps) ? trace.steps : [];

    const facts = [
      ["Run", reference.run_id],
      ["State", trace.state],
      ["Execution", trace.script_execution],
      ["Last step", trace.last_step],
    ].filter(([, value]) => value);

    const factView = facts.length
      ? '<div class="trace-facts">' +
        facts
          .map(
            ([label, value]) =>
              '<div class="trace-fact"><span>' +
              this._escape(label) +
              "</span>" +
              this._code(value) +
              "</div>"
          )
          .join("") +
        "</div>"
      : "";

    const stepView = steps.length
      ? '<div class="trace-steps">' +
        steps.map((step, index) => this._traceStepView(step, index)).join("") +
        "</div>"
      : '<div class="trace-state"><div><strong>No structural steps were frozen.</strong></div></div>';

    return (
      '<section class="trace-panel">' +
      '<div class="trace-head"><div><span class="section-kicker">Frozen trace evidence</span><h3>Execution trace</h3><div class="trace-identity">' +
      this._code(identity) +
      "</div></div>" +
      '<span class="trace-badge">Durable skeleton</span></div>' +
      factView +
      (trace.truncated
        ? '<div class="trace-warning">This saved trace skeleton was truncated at its structural step limit.</div>'
        : "") +
      stepView +
      "</section>"
    );
  }

  _incidentsView() {
    const incidents = this._incidents || [];
    const notice = this._incidentNotice
      ? '<div class="incident-notice">' +
        this._escape(this._incidentNotice) +
        "</div>"
      : "";
    const error = this._incidentsError
      ? '<div class="incident-error">' +
        this._escape(this._incidentsError) +
        "</div>"
      : "";

    if (this._incidentsLoading && !this._incidentsLoaded) {
      return (
        '<section class="incidents-panel">' +
        '<div class="section-heading"><div><span class="section-kicker">Frozen evidence</span><h2>Saved incidents</h2></div></div>' +
        '<div class="incident-empty"><div class="spinner" aria-hidden="true"></div><span>Loading saved incidents…</span></div>' +
        "</section>"
      );
    }

    const cards = incidents.length
      ? '<div class="incident-list">' +
        incidents.map((incident) => this._incidentCard(incident)).join("") +
        "</div>"
      : '<div class="incident-empty"><strong>No saved incidents yet.</strong><span>Use Save incident on a state change to freeze evidence before the rolling buffer moves on.</span></div>';

    return (
      '<section class="incidents-panel">' +
      '<div class="section-heading incident-heading"><div><span class="section-kicker">Frozen evidence</span><h2>Saved incidents</h2></div>' +
      '<div class="incident-heading-actions"><span class="incident-count">' +
      this._escape(incidents.length) +
      " / 50</span>" +
      '<button class="button button-small" id="refresh-incidents" type="button"' +
      (this._incidentsLoading ? " disabled" : "") +
      ">Refresh</button></div></div>" +
      notice +
      error +
      cards +
      '<p class="incident-help">Exports always use the safe sanitizer profile. There is no raw-export option in v0.1.</p>' +
      "</section>"
    );
  }

  _incidentCard(incident) {
    const incidentId = String(incident.incident_id || "");
    const createdAt = this._formatDateTime(incident.created_at);
    const eventCount = Number(incident.event_count) || 0;
    const duration = Math.max(
      0,
      Number(incident.window_end || 0) - Number(incident.window_start || 0)
    );
    const exporting = this._exportingIncidentId === incidentId;
    const deleting = this._deletingIncidentId === incidentId;
    const traceBadge = incident.has_trace_evidence
      ? '<span class="incident-trace-badge">trace frozen</span>'
      : "";

    return (
      '<article class="incident-card"><div class="incident-main"><strong class="incident-title">' +
      this._escape(incident.title || "Saved incident") +
      "</strong>" +
      traceBadge +
      '<div class="incident-meta"><span>' +
      this._escape(eventCount) +
      " events</span><span>" +
      this._escape(Math.round(duration)) +
      ' s window</span><time title="' +
      this._escape(createdAt) +
      '">' +
      this._escape(this._formatIncidentDate(incident.created_at)) +
      "</time></div></div>" +
      '<div class="incident-actions">' +
      '<button class="button button-small review-incident-button" type="button" data-incident-id="' +
      this._escape(incidentId) +
      '"' +
      (this._incidentReviewLoading && this._reviewIncidentId === incidentId
        ? " disabled"
        : "") +
      ">" +
      (this._incidentReviewLoading && this._reviewIncidentId === incidentId
        ? "Opening…"
        : "Review") +
      "</button>" +
      '<button class="button button-small primary export-incident-button" type="button" data-incident-id="' +
      this._escape(incidentId) +
      '"' +
      (exporting ? " disabled" : "") +
      ">" +
      (exporting ? "Preparing ZIP…" : "Export safe ZIP") +
      "</button>" +
      '<button class="button button-small quiet delete-incident-button" type="button" data-incident-id="' +
      this._escape(incidentId) +
      '"' +
      (deleting ? " disabled" : "") +
      ">" +
      (deleting ? "Deleting…" : "Delete") +
      "</button></div></article>"
    );
  }

  _formatIncidentDate(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      return "Unknown date";
    }

    return new Date(value * 1000).toLocaleString();
  }

  _explanationView() {
    if (!this._selectedEventId) {
      return "";
    }

    const timelineTarget = (this._data.events || []).find(
      (event) => event.event_id === this._selectedEventId
    );

    if (this._explainLoading) {
      return (
        '<section class="explain-panel" id="explanation-panel">' +
        this._explanationHeader(timelineTarget, null) +
        '<div class="explain-loading"><div class="spinner" aria-hidden="true"></div>' +
        '<div><strong>Reconstructing context evidence…</strong>' +
        '<p>Only explicit Home Assistant context relationships are followed.</p></div></div>' +
        "</section>"
      );
    }

    if (this._explainError) {
      return (
        '<section class="explain-panel" id="explanation-panel">' +
        this._explanationHeader(timelineTarget, null) +
        '<div class="explain-error"><strong>Could not reconstruct this change.</strong><p>' +
        this._escape(this._explainError) +
        '</p><button class="button primary" id="retry-explanation" type="button">Try again</button></div>' +
        "</section>"
      );
    }

    if (!this._explanation) {
      return "";
    }

    const explanation = this._explanation;
    const events = Array.isArray(explanation.events) ? explanation.events : [];
    const edges = Array.isArray(explanation.edges) ? explanation.edges : [];
    const gaps = Array.isArray(explanation.gaps) ? explanation.gaps : [];
    const target =
      events.find((event) => event.event_id === explanation.target_event_id) ||
      timelineTarget;

    const chain = events
      .map((event, index) => {
        const incoming =
          index === 0
            ? null
            : edges.find((edge) => edge.target_event_id === event.event_id);
        return (
          (index === 0 ? "" : this._evidenceConnectorView(incoming)) +
          this._explanationEventView(event, explanation.target_event_id)
        );
      })
      .join("");

    const gapView = gaps.length
      ? '<div class="evidence-gaps"><div class="gap-title">Evidence gaps</div>' +
        gaps
          .map(
            (gap) =>
              '<div class="gap-row"><span class="gap-marker">!</span><span>' +
              this._escape(this._gapLabel(gap)) +
              "</span></div>"
          )
          .join("") +
        "</div>"
      : "";

    const statusClass = explanation.complete ? "complete" : "incomplete";
    const statusLabel = explanation.complete
      ? "Context evidence complete"
      : "Evidence gap";

    return (
      '<section class="explain-panel" id="explanation-panel">' +
      this._explanationHeader(target, {
        className: statusClass,
        label: statusLabel,
      }) +
      '<div class="evidence-note"><strong>What “confirmed” means here</strong><p>' +
      "Parent-context links come from Home Assistant context metadata. Same-context links confirm a shared change context and captured order, not direct event-to-event causation." +
      "</p></div>" +
      gapView +
      '<div class="chain-heading"><span class="section-kicker">Oldest to newest</span><h3>Context evidence chain</h3></div>' +
      '<div class="explain-chain">' +
      chain +
      "</div>" +
      this._traceView() +
      "</section>"
    );
  }


  _traceView() {
    if (this._traceLoading) {
      return (
        '<section class="trace-panel">' +
        '<div class="trace-head"><div><span class="section-kicker">Home Assistant trace</span><h3>Execution trace</h3></div>' +
        '<span class="trace-badge">Live only</span></div>' +
        '<div class="trace-state"><div class="spinner" aria-hidden="true"></div><div><strong>Resolving stored trace…</strong><p>Matching the reconstructed Home Assistant context to a retained automation or script run.</p></div></div>' +
        "</section>"
      );
    }

    if (this._traceError) {
      return (
        '<section class="trace-panel">' +
        '<div class="trace-head"><div><span class="section-kicker">Home Assistant trace</span><h3>Execution trace</h3></div>' +
        '<span class="trace-badge muted-badge">Unavailable</span></div>' +
        '<div class="trace-state"><div><strong>Trace could not be read.</strong><p>' +
        this._escape(this._traceError) +
        "</p><p>Home Assistant retains a limited number of traces per automation or script, so older runs may already be gone.</p></div></div>" +
        "</section>"
      );
    }

    if (!this._traceProjection) {
      return "";
    }

    if (this._traceProjection.status !== "available") {
      return (
        '<section class="trace-panel">' +
        '<div class="trace-head"><div><span class="section-kicker">Home Assistant trace</span><h3>Execution trace</h3></div>' +
        '<span class="trace-badge muted-badge">No retained trace</span></div>' +
        '<div class="trace-state"><div><strong>No matching stored run.</strong><p>' +
        this._escape(this._traceProjection.reason || "Trace unavailable") +
        "</p><p>The forensic context chain remains valid; this only means Home Assistant no longer has the richer execution trace for this run.</p></div></div>" +
        "</section>"
      );
    }

    const trace = this._traceProjection;
    const reference = trace.reference || {};
    const identity =
      reference.domain && reference.item_id
        ? reference.domain + "." + reference.item_id
        : "automation/script";
    const facts = [
      ["Run", reference.run_id],
      ["State", trace.state],
      ["Execution", trace.script_execution],
      ["Last step", trace.last_step],
    ].filter(([, value]) => value);

    const factView = facts.length
      ? '<div class="trace-facts">' +
        facts
          .map(
            ([label, value]) =>
              '<div class="trace-fact"><span>' +
              this._escape(label) +
              "</span>" +
              this._code(value) +
              "</div>"
          )
          .join("") +
        "</div>"
      : "";

    const steps = Array.isArray(trace.steps) ? trace.steps : [];
    const stepView = steps.length
      ? '<div class="trace-steps">' +
        steps.map((step, index) => this._traceStepView(step, index)).join("") +
        "</div>"
      : '<div class="trace-state"><div><strong>No projected steps.</strong><p>The trace exists, but it did not expose any safe structural steps.</p></div></div>';

    const truncation = trace.truncated
      ? '<div class="trace-warning">Only the first ' +
        this._escape(steps.length) +
        " safe trace steps are shown.</div>"
      : "";

    return (
      '<section class="trace-panel">' +
      '<div class="trace-head"><div><span class="section-kicker">Home Assistant trace</span><h3>Execution trace</h3><div class="trace-identity">' +
      this._code(identity) +
      "</div></div>" +
      '<span class="trace-badge">Projected safely</span></div>' +
      factView +
      truncation +
      stepView +
      '<div class="trace-privacy"><strong>Privacy boundary</strong><span>HA Forensic Lab keeps only paths, safe branch outcomes and child-trace references in panel memory. Config, blueprint inputs, changed variables, error/template text and arbitrary result payloads are discarded and are not written to the Forensic Lab stores.</span></div>' +
      "</section>"
    );
  }

  _traceStepView(step, index) {
    const outcome = [];

    if (typeof step.result === "boolean") {
      outcome.push(
        '<span class="trace-outcome">' +
          (step.result ? "condition: true" : "condition: false") +
          "</span>"
      );
    }

    if (step.choice) {
      outcome.push(
        '<span class="trace-outcome">branch: ' +
          this._escape(step.choice) +
          "</span>"
      );
    }

    const child = step.child
      ? '<div class="trace-child"><span>child trace</span>' +
        this._code(step.child.domain + "." + step.child.item_id) +
        "</div>"
      : "";

    return (
      '<div class="trace-step"><span class="trace-index">' +
      this._escape(index + 1) +
      '</span><div class="trace-step-body"><div class="trace-path">' +
      this._code(step.path) +
      "</div>" +
      (outcome.length
        ? '<div class="trace-outcomes">' + outcome.join("") + "</div>"
        : "") +
      child +
      "</div></div>"
    );
  }

  _explanationHeader(target, status) {
    const targetIdentity =
      target && target.entity_id
        ? this._code(target.entity_id)
        : "<span>Selected state change</span>";
    const transition =
      target && target.kind === "state_changed"
        ? '<div class="explain-transition"><span class="state-value">' +
          this._escape(this._nullable(target.old_state)) +
          '</span><span class="arrow">→</span><span class="state-value">' +
          this._escape(this._nullable(target.new_state)) +
          "</span></div>"
        : "";

    const statusView = status
      ? '<span class="evidence-status ' +
        this._escape(status.className) +
        '">' +
        this._escape(status.label) +
        "</span>"
      : "";

    return (
      '<div class="explain-head"><div><span class="section-kicker">Deterministic reconstruction</span>' +
      '<h2>Explain this change</h2><div class="explain-target">' +
      targetIdentity +
      transition +
      "</div></div>" +
      '<div class="explain-head-actions">' +
      statusView +
      '<button class="icon-button" id="close-explanation" type="button" aria-label="Close explanation" title="Close explanation">×</button>' +
      "</div></div>"
    );
  }

  _explanationEventView(event, targetEventId) {
    const isTarget = event.event_id === targetEventId;
    const kind = String(event.kind || "unknown");
    const summary = this._eventSummary(event);
    const context = event.context_id
      ? '<span class="chain-context">Context ' + this._code(event.context_id) + "</span>"
      : '<span class="chain-context muted">No context ID</span>';

    return (
      '<article class="chain-node' +
      (isTarget ? " target" : "") +
      '">' +
      '<div class="chain-node-head"><div class="event-heading"><span class="kind">' +
      this._escape(this._kindLabel(kind)) +
      '</span><strong class="event-title">' +
      this._eventTitle(event) +
      "</strong></div><time class=\"time\">" +
      this._escape(this._formatTime(event.timestamp)) +
      "</time></div>" +
      (summary ? '<div class="event-summary">' + summary + "</div>" : "") +
      '<div class="chain-node-meta">' +
      context +
      (isTarget ? '<span class="target-label">Selected change</span>' : "") +
      "</div></article>"
    );
  }

  _evidenceConnectorView(edge) {
    if (!edge) {
      return (
        '<div class="evidence-connector gap"><span class="connector-line"></span>' +
        '<div><strong>Evidence gap</strong><span>No typed context edge captured between these anchors.</span></div></div>'
      );
    }

    if (edge.evidence_type === "parent_context") {
      return (
        '<div class="evidence-connector parent"><span class="connector-line"></span>' +
        '<div><strong>Parent context</strong><span>Confirmed: the child context explicitly points to this parent context.</span></div></div>'
      );
    }

    return (
      '<div class="evidence-connector same"><span class="connector-line"></span>' +
      '<div><strong>Same context</strong><span>Confirmed shared Home Assistant context and captured order. Not proof of direct causation.</span></div></div>'
    );
  }

  _gapLabel(gap) {
    const value = String(gap || "");

    if (value === "target_context_missing") {
      return "The selected event has no Home Assistant context ID, so the chain cannot be extended without guessing.";
    }
    if (value.startsWith("parent_context_not_in_buffer:")) {
      return "A parent context referenced by Home Assistant is no longer present in the bounded capture buffer.";
    }
    if (value.startsWith("context_not_in_buffer:")) {
      return "A referenced context is not present in the current capture buffer.";
    }
    if (value === "event_limit_reached") {
      return "The explanation hit its event limit before all captured context evidence could be included.";
    }
    if (value === "context_depth_limit_reached") {
      return "The explanation hit its context-depth safety limit.";
    }
    if (value === "context_cycle_detected") {
      return "A context cycle was detected, so reconstruction stopped safely.";
    }

    return value;
  }

  _bindControls() {
    const form = this.shadowRoot.getElementById("timeline-filters");
    const refresh = this.shadowRoot.getElementById("refresh-timeline");
    const clear = this.shadowRoot.getElementById("clear-filters");
    const retry = this.shadowRoot.getElementById("retry-timeline");
    const closeExplanation =
      this.shadowRoot.getElementById("close-explanation");
    const retryExplanation =
      this.shadowRoot.getElementById("retry-explanation");
    const refreshIncidents =
      this.shadowRoot.getElementById("refresh-incidents");
    const closeIncidentReview =
      this.shadowRoot.getElementById("close-incident-review");
    const retryIncidentReview =
      this.shadowRoot.getElementById("retry-incident-review");
    const refreshDiagnostics =
      this.shadowRoot.getElementById("refresh-diagnostics");

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const entityInput = this.shadowRoot.getElementById("entity-filter");
        const kindInput = this.shadowRoot.getElementById("kind-filter");

        this._filters = {
          entityId: entityInput ? entityInput.value.trim() : "",
          kind: kindInput ? kindInput.value : "",
        };

        void this._loadTimeline();
      });
    }

    if (refresh) {
      refresh.addEventListener("click", () => {
        void this._loadTimeline();
      });
    }

    if (clear) {
      clear.addEventListener("click", () => {
        this._filters = { entityId: "", kind: "" };
        void this._loadTimeline();
      });
    }

    if (retry) {
      retry.addEventListener("click", () => {
        void this._loadTimeline();
      });
    }

    if (closeExplanation) {
      closeExplanation.addEventListener("click", () => {
        this._closeExplanation();
      });
    }

    if (retryExplanation && this._selectedEventId) {
      retryExplanation.addEventListener("click", () => {
        void this._loadExplanation(this._selectedEventId);
      });
    }

    this.shadowRoot.querySelectorAll(".explain-button").forEach((button) => {
      button.addEventListener("click", () => {
        const eventId = button.dataset.explainId;
        if (eventId) {
          void this._loadExplanation(eventId);
        }
      });
    });

    this.shadowRoot
      .querySelectorAll(".save-incident-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const eventId = button.dataset.saveEventId;
          if (eventId) {
            void this._saveIncident(eventId);
          }
        });
      });

    this.shadowRoot
      .querySelectorAll(".review-incident-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const incidentId = button.dataset.incidentId;
          if (incidentId) {
            void this._reviewIncident(incidentId);
          }
        });
      });

    this.shadowRoot
      .querySelectorAll(".export-incident-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const incidentId = button.dataset.incidentId;
          if (incidentId) {
            void this._exportIncident(incidentId);
          }
        });
      });

    this.shadowRoot
      .querySelectorAll(".delete-incident-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const incidentId = button.dataset.incidentId;
          if (incidentId) {
            void this._deleteIncident(incidentId);
          }
        });
      });

    if (refreshIncidents) {
      refreshIncidents.addEventListener("click", () => {
        void this._loadIncidents();
      });
    }

    if (closeIncidentReview) {
      closeIncidentReview.addEventListener("click", () => {
        this._closeIncidentReview();
      });
    }

    if (retryIncidentReview && this._reviewIncidentId) {
      retryIncidentReview.addEventListener("click", () => {
        void this._reviewIncident(this._reviewIncidentId);
      });
    }

    if (refreshDiagnostics) {
      refreshDiagnostics.addEventListener("click", () => {
        void this._loadDiagnostics();
      });
    }
  }

  _kindLabel(kind) {
    const labels = {
      state_changed: "State",
      call_service: "Service",
      automation_triggered: "Automation",
      script_started: "Script",
    };

    return labels[kind] || "Event";
  }

  _formatTime(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      return "Unknown time";
    }

    const date = new Date(value * 1000);
    try {
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      });
    } catch (_error) {
      return date.toLocaleTimeString();
    }
  }

  _formatDateTime(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      return "Unknown timestamp";
    }

    return new Date(value * 1000).toISOString();
  }

  _nullable(value) {
    return value === null || value === undefined ? "unknown" : String(value);
  }

  _code(value) {
    return "<code>" + this._escape(value) + "</code>";
  }

  _escape(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]
    );
  }

  _styles() {
    return (
      "<style>" +
      ":host{display:block;min-height:100%;box-sizing:border-box;color:var(--primary-text-color);background:var(--primary-background-color);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif)}" +
      "main{max-width:1180px;margin:0 auto;padding:32px 24px 64px}" +
      ".hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:24px}" +
      ".eyebrow,.section-kicker{color:var(--secondary-text-color);font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}" +
      "h1{margin:7px 0 8px;font-size:clamp(2rem,5vw,3.35rem);line-height:1.02;letter-spacing:-.045em}" +
      ".lead{max-width:760px;margin:0;color:var(--secondary-text-color);font-size:1.02rem;line-height:1.55}" +
      ".status{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 11px;border:1px solid var(--divider-color);border-radius:999px;background:var(--card-background-color);font-size:.82rem;font-weight:650}" +
      ".dot{width:8px;height:8px;border-radius:50%;background:var(--success-color,#4caf50)}" +
      ".status.loading .dot{background:var(--warning-color,#ff9800)}.status.error .dot{background:var(--error-color,#db4437)}" +
      ".stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}" +
      ".stat{display:flex;flex-direction:column;gap:3px;padding:15px 16px;border:1px solid var(--divider-color);border-radius:14px;background:var(--card-background-color)}" +
      ".stat-value{font-size:1.25rem;font-weight:700;font-variant-numeric:tabular-nums}.stat-label{color:var(--secondary-text-color);font-size:.78rem}" +
      ".health-panel{margin:0 0 14px;padding:16px;border:1px solid var(--divider-color);border-radius:16px;background:var(--card-background-color)}.health-heading{align-items:center}.health-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.health-metric{display:grid;gap:3px;padding:10px 11px;border-radius:10px;background:var(--secondary-background-color)}.health-metric strong{font-size:.95rem;font-variant-numeric:tabular-nums}.health-metric span{color:var(--secondary-text-color);font-size:.7rem}.health-foot{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:10px;color:var(--secondary-text-color);font-size:.7rem}.health-foot strong{color:var(--primary-text-color)}.health-privacy{margin-left:auto}.health-state{display:flex;gap:9px;align-items:center;padding:11px;color:var(--secondary-text-color);font-size:.8rem}.health-error{padding:10px 11px;border-left:3px solid var(--error-color,#db4437);background:var(--secondary-background-color);font-size:.78rem}" +
      ".toolbar{margin-bottom:28px;padding:16px;border:1px solid var(--divider-color);border-radius:16px;background:var(--card-background-color)}" +
      "form{display:grid;grid-template-columns:minmax(240px,1fr) minmax(190px,.45fr) auto;gap:12px;align-items:end}" +
      ".field{display:grid;gap:6px;color:var(--secondary-text-color);font-size:.78rem;font-weight:650}" +
      "input,select{width:100%;box-sizing:border-box;min-height:42px;padding:0 12px;border:1px solid var(--divider-color);border-radius:10px;color:var(--primary-text-color);background:var(--primary-background-color);font:inherit;outline:none}" +
      "input:focus,select:focus{border-color:var(--primary-color)}" +
      ".actions{display:flex;gap:8px;align-items:center}.button{min-height:42px;padding:0 14px;border:1px solid var(--divider-color);border-radius:10px;color:var(--primary-text-color);background:var(--primary-background-color);font:inherit;font-weight:650;cursor:pointer}" +
      ".button:hover:not(:disabled){background:var(--secondary-background-color)}.button.primary{border-color:var(--primary-color);color:var(--text-primary-color,var(--primary-text-color));background:var(--primary-color)}" +
      ".button.quiet{color:var(--secondary-text-color)}.button:disabled{opacity:.55;cursor:default}" +
      ".timeline-section{margin-top:6px}.section-heading{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:0 0 12px}.section-heading h2{margin:4px 0 0;font-size:1.2rem}.refresh-note{color:var(--secondary-text-color);font-size:.82rem}" +
      ".timeline{display:grid}.event{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;min-width:0}.rail{position:relative;display:flex;justify-content:center}.rail:after{content:'';position:absolute;top:0;bottom:0;width:1px;background:var(--divider-color)}" +
      ".event:first-child .rail:after{top:17px}.event:last-child .rail:after{bottom:calc(100% - 17px)}.marker{position:relative;z-index:1;width:10px;height:10px;margin-top:17px;border:3px solid var(--primary-background-color);border-radius:50%;background:var(--secondary-text-color);box-shadow:0 0 0 1px var(--divider-color)}" +
      ".marker.state_changed{background:var(--primary-color)}.marker.call_service{background:var(--warning-color,#ff9800)}.marker.automation_triggered{background:var(--success-color,#4caf50)}.marker.script_started{background:var(--accent-color,var(--primary-color))}" +
      ".event-card{min-width:0;margin-bottom:10px;padding:14px 16px;border:1px solid var(--divider-color);border-radius:14px;background:var(--card-background-color);box-shadow:var(--ha-card-box-shadow,none)}" +
      ".event-card.selected{border-color:var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}" +
      ".event-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.event-heading{display:flex;min-width:0;gap:9px;align-items:center;flex-wrap:wrap}.kind{padding:4px 7px;border-radius:7px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:.68rem;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.event-title{min-width:0;font-size:.98rem;overflow-wrap:anywhere}" +
      ".time{white-space:nowrap;color:var(--secondary-text-color);font-size:.78rem;font-variant-numeric:tabular-nums}.event-summary{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px;line-height:1.45}.state-value{font-weight:650}.arrow,.muted{color:var(--secondary-text-color)}" +
      ".event-actions{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}.button-small{min-height:34px;padding:0 10px;font-size:.78rem}" +
      ".saved-review-panel{margin:0 0 28px;padding:20px;border:1px solid var(--divider-color);border-radius:18px;background:var(--card-background-color);box-shadow:var(--ha-card-box-shadow,none);scroll-margin-top:16px}.saved-review-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:7px;color:var(--secondary-text-color);font-size:.75rem}.incidents-panel{margin:0 0 28px;padding:18px;border:1px solid var(--divider-color);border-radius:18px;background:var(--card-background-color);box-shadow:var(--ha-card-box-shadow,none)}.incident-heading{align-items:center}.incident-heading-actions{display:flex;gap:8px;align-items:center}.incident-count{color:var(--secondary-text-color);font-size:.78rem;font-variant-numeric:tabular-nums}.incident-list{display:grid;gap:9px}.incident-card{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:13px 14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color)}.incident-main{min-width:0}.incident-title{display:inline;overflow-wrap:anywhere}.incident-trace-badge{display:inline-flex;margin-left:8px;padding:3px 6px;border-radius:999px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:.65rem;font-weight:750;text-transform:uppercase;letter-spacing:.04em}.incident-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:5px;color:var(--secondary-text-color);font-size:.75rem}.incident-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}.incident-empty{display:flex;gap:10px;align-items:center;padding:18px;border:1px dashed var(--divider-color);border-radius:12px;color:var(--secondary-text-color);font-size:.84rem}.incident-empty strong{color:var(--primary-text-color)}.incident-notice,.incident-error{margin:0 0 10px;padding:9px 11px;border-radius:9px;font-size:.8rem}.incident-notice{background:var(--secondary-background-color);border-left:3px solid var(--success-color,#4caf50)}.incident-error{background:var(--secondary-background-color);border-left:3px solid var(--error-color,#db4437)}.incident-help{margin:11px 0 0;color:var(--secondary-text-color);font-size:.74rem;line-height:1.45}" +
      "code{max-width:100%;padding:2px 5px;border-radius:5px;background:var(--secondary-background-color);font-family:var(--code-font-family,ui-monospace,SFMono-Regular,Consolas,monospace);font-size:.86em;overflow-wrap:anywhere}" +
      "details{margin-top:11px;padding-top:9px;border-top:1px solid var(--divider-color)}summary{width:max-content;color:var(--secondary-text-color);font-size:.78rem;cursor:pointer}.metadata{display:grid;gap:6px;margin-top:9px}.metadata-row{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px;align-items:baseline;font-size:.78rem}.metadata-row>span{color:var(--secondary-text-color)}" +
      ".explain-panel{margin:0 0 28px;padding:20px;border:1px solid var(--divider-color);border-radius:18px;background:var(--card-background-color);box-shadow:var(--ha-card-box-shadow,none);scroll-margin-top:16px}" +
      ".explain-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.explain-head h2{margin:4px 0 8px;font-size:1.35rem}.explain-target{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.explain-transition{display:flex;gap:7px;align-items:center}.explain-head-actions{display:flex;gap:8px;align-items:center}.icon-button{width:36px;height:36px;border:1px solid var(--divider-color);border-radius:10px;color:var(--primary-text-color);background:var(--primary-background-color);font-size:1.35rem;line-height:1;cursor:pointer}.evidence-status{padding:5px 8px;border-radius:999px;font-size:.72rem;font-weight:750}.evidence-status.complete{background:var(--success-color,#4caf50);color:var(--text-primary-color,#fff)}.evidence-status.incomplete{background:var(--warning-color,#ff9800);color:var(--text-primary-color,#fff)}" +
      ".evidence-note{margin:16px 0;padding:13px 14px;border-left:3px solid var(--primary-color);border-radius:8px;background:var(--secondary-background-color)}.evidence-note strong{font-size:.84rem}.evidence-note p{margin:4px 0 0;color:var(--secondary-text-color);font-size:.82rem;line-height:1.5}.evidence-gaps{display:grid;gap:7px;margin:14px 0;padding:12px 14px;border:1px solid var(--divider-color);border-radius:10px}.gap-title{font-size:.78rem;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--secondary-text-color)}.gap-row{display:grid;grid-template-columns:20px 1fr;gap:7px;align-items:start;font-size:.82rem;line-height:1.45}.gap-marker{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--warning-color,#ff9800);color:var(--text-primary-color,#fff);font-weight:800;font-size:.7rem}" +
      ".chain-heading{margin:20px 0 10px}.chain-heading h3{margin:3px 0 0;font-size:1rem}.explain-chain{display:grid;max-width:900px}.chain-node{padding:13px 14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color)}.chain-node.target{border-color:var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}.chain-node-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.chain-node-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px;color:var(--secondary-text-color);font-size:.75rem}.target-label{padding:3px 6px;border-radius:6px;background:var(--primary-color);color:var(--text-primary-color,#fff);font-weight:700}.evidence-connector{display:grid;grid-template-columns:18px 1fr;gap:9px;min-height:46px;align-items:center;padding:3px 10px;color:var(--secondary-text-color)}.connector-line{justify-self:center;width:2px;height:100%;min-height:34px;background:var(--divider-color)}.evidence-connector.parent .connector-line{background:var(--primary-color)}.evidence-connector strong{display:block;color:var(--primary-text-color);font-size:.78rem}.evidence-connector span:not(.connector-line){display:block;margin-top:2px;font-size:.74rem;line-height:1.35}.explain-loading,.explain-error{display:flex;gap:12px;align-items:center;margin-top:16px;padding:20px;border:1px dashed var(--divider-color);border-radius:12px}.explain-loading p,.explain-error p{margin:3px 0 0;color:var(--secondary-text-color);font-size:.82rem}" +
      ".trace-panel{margin-top:22px;padding-top:18px;border-top:1px solid var(--divider-color)}.trace-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.trace-head h3{margin:4px 0 5px;font-size:1rem}.trace-identity{margin-top:5px}.trace-badge{padding:5px 8px;border-radius:999px;background:var(--secondary-background-color);color:var(--primary-text-color);font-size:.7rem;font-weight:750;white-space:nowrap}.muted-badge{color:var(--secondary-text-color)}.trace-state{display:flex;gap:12px;align-items:center;margin-top:12px;padding:14px;border:1px dashed var(--divider-color);border-radius:11px}.trace-state p{margin:3px 0 0;color:var(--secondary-text-color);font-size:.8rem;line-height:1.45}.trace-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}.trace-fact{display:grid;grid-template-columns:80px minmax(0,1fr);gap:8px;align-items:baseline;padding:8px 10px;border-radius:9px;background:var(--secondary-background-color);font-size:.75rem}.trace-fact>span{color:var(--secondary-text-color)}.trace-steps{display:grid;gap:7px;margin-top:13px}.trace-step{display:grid;grid-template-columns:26px minmax(0,1fr);gap:9px;align-items:start;padding:10px 11px;border:1px solid var(--divider-color);border-radius:10px;background:var(--primary-background-color)}.trace-index{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:.68rem;font-weight:750}.trace-step-body{min-width:0}.trace-path{line-height:1.35}.trace-outcomes{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.trace-outcome{padding:3px 6px;border-radius:6px;background:var(--secondary-background-color);font-size:.68rem;color:var(--secondary-text-color)}.trace-child{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:7px;color:var(--secondary-text-color);font-size:.7rem}.trace-warning{margin-top:11px;padding:8px 10px;border-left:3px solid var(--warning-color,#ff9800);background:var(--secondary-background-color);font-size:.76rem}.trace-privacy{display:grid;gap:3px;margin-top:12px;padding:10px 11px;border-radius:9px;background:var(--secondary-background-color);font-size:.72rem;line-height:1.45}.trace-privacy span{color:var(--secondary-text-color)}" +
      ".state-card{display:grid;justify-items:center;gap:8px;padding:48px 24px;border:1px dashed var(--divider-color);border-radius:16px;text-align:center;background:var(--card-background-color)}.state-card p{max-width:580px;margin:0;color:var(--secondary-text-color);line-height:1.5}.error-card{border-style:solid}.spinner{width:24px;height:24px;border:3px solid var(--divider-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}" +
      "footer{margin-top:30px;color:var(--secondary-text-color);font-size:.78rem;line-height:1.5}" +
      "@media(max-width:820px){main{padding:24px 16px 48px}.hero{display:grid}.status{width:max-content}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.health-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.health-privacy{margin-left:0}form{grid-template-columns:1fr}.actions{flex-wrap:wrap}.event{grid-template-columns:20px minmax(0,1fr)}.event-head,.chain-node-head{display:grid;gap:7px}.time{order:-1}.metadata-row{grid-template-columns:1fr;gap:2px}.explain-head{display:grid}.explain-head-actions{justify-content:space-between;order:-1}.evidence-status{order:2}.incident-card{display:grid}.incident-actions{flex-wrap:wrap}.incident-heading{align-items:flex-start}.incident-heading-actions{flex-wrap:wrap}.trace-head{display:grid}.trace-facts{grid-template-columns:1fr}.trace-fact{grid-template-columns:70px minmax(0,1fr)}}" +
      "</style>"
    );
  }
}

customElements.define("ha-forensic-lab-panel", HAForensicLabPanel);
