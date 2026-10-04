import { PANEL_STYLES } from "./panel-styles.mjs";
import { summarizeEvidence } from "./evidence-summary.mjs";
import { projectTrace, resolveTraceReference } from "./trace-projection.mjs";

class HAForensicLabPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._data = {
      events: [],
      buffer_size: 0,
      buffer_capacity: 0,
      retained_span_seconds: null,
    };
    this._filters = {
      entityId: "",
      kind: "",
    };
    this._filterDraft = { ...this._filters };
    this._activeView = "timeline";
    this._timelineUpdatedAt = null;
    this._diagnosticsUpdatedAt = null;
    this._viewScroll = {};
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
    this._incidentDraft = null;
    this._incidentPreviewRequestId = 0;
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
  }

  set hass(value) {
    const firstConnection = !this._hass;
    this._hass = value;

    // HA updates this object for unrelated state changes. Rebuilding the panel
    // here would discard focus, draft filter values and expanded event details.
    if (!firstConnection || !value) {
      return;
    }

    if (!this._hasLoaded && !this._loading) {
      void this._loadTimeline();
    }
    if (!this._incidentsLoaded && !this._incidentsLoading) {
      void this._loadIncidents();
    }
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
        retained_span_seconds: data.retained_span_seconds ?? null,
      };
      this._hasLoaded = true;
      this._timelineUpdatedAt = Date.now() / 1000;
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
      this._diagnosticsUpdatedAt = Date.now() / 1000;
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

  async _openIncidentDraft(eventId) {
    if (!this._hass || !eventId || this._savingEventId) {
      return;
    }

    this._activeView = "timeline";
    const target =
      (this._data.events || []).find((event) => event.event_id === eventId) ||
      (this._explanation?.events || []).find((event) => event.event_id === eventId);
    this._incidentDraft = {
      eventId,
      targetLabel: target
        ? (target.entity_id || this._kindLabel(target.kind)) +
          " · " + this._formatTime(target.timestamp)
        : eventId,
      beforeSeconds: "300",
      afterSeconds: "60",
      title: "",
      traceEvidence: this._traceEvidenceForIncident(eventId),
      preview: null,
      previewLoading: false,
      error: null,
    };
    this._incidentNotice = null;
    this._render();
    this.shadowRoot.getElementById("incident-draft")?.scrollIntoView({
      behavior: "smooth", block: "start",
    });
    this.shadowRoot.getElementById("incident-title")?.focus({ preventScroll: true });
    await this._previewIncident();
  }

  _closeIncidentDraft() {
    if (this._savingEventId) {
      return;
    }
    this._incidentDraft = null;
    this._incidentPreviewRequestId += 1;
    this._render();
  }

  _updateIncidentDraft(field, value) {
    const draft = this._incidentDraft;
    if (!draft || this._savingEventId) {
      return;
    }
    draft[field] = value;
    if (field !== "title") {
      this._incidentPreviewRequestId += 1;
      draft.preview = null;
      draft.previewLoading = false;
      draft.error = null;
      this._updateIncidentDraftStatus();
    }
  }

  async _previewIncident() {
    const draft = this._incidentDraft;
    if (!this._hass || !draft || this._savingEventId) {
      return;
    }
    const requestId = ++this._incidentPreviewRequestId;
    draft.preview = null;
    draft.error = null;
    const before = Number(draft.beforeSeconds);
    const after = Number(draft.afterSeconds);
    if (
      draft.beforeSeconds.trim() === "" || draft.afterSeconds.trim() === "" ||
      !Number.isFinite(before) || !Number.isFinite(after) ||
      before < 0 || after < 0 || before > 3600 || after > 3600
    ) {
      draft.previewLoading = false;
      draft.error = "Enter a time from 0 to 3600 seconds on each side.";
      this._updateIncidentDraftStatus();
      return;
    }
    draft.previewLoading = true;
    this._updateIncidentDraftStatus();
    try {
      const preview = await this._hass.callWS({
        type: "ha_forensic_lab/incidents/preview",
        target_event_id: draft.eventId,
        before_seconds: before,
        after_seconds: after,
      });
      if (
        this._incidentDraft === draft && requestId === this._incidentPreviewRequestId
      ) {
        draft.preview = preview;
      }
    } catch (error) {
      if (
        this._incidentDraft === draft && requestId === this._incidentPreviewRequestId
      ) {
        draft.error = error?.message
          ? String(error.message) : "Unable to preview incident";
      }
    } finally {
      if (
        this._incidentDraft === draft && requestId === this._incidentPreviewRequestId
      ) {
        draft.previewLoading = false;
        this._updateIncidentDraftStatus();
      }
    }
  }

  _incidentPreviewText() {
    const draft = this._incidentDraft;
    if (!draft) return "";
    if (draft.error) return draft.error;
    if (draft.previewLoading) return "Counting events in this window…";
    if (!draft.preview) return "Preview this window to check its event count before saving.";
    const preview = draft.preview;
    return `${preview.event_count} / ${preview.max_events} events` +
      (preview.can_save
        ? " · Ready to save. The count is checked again when saving."
        : " · Shorten the before/after times, then preview again. No events will be silently discarded.");
  }

  _updateIncidentDraftStatus() {
    // Updating just the status preserves focus and partially typed field values.
    const status = this.shadowRoot.getElementById("incident-preview-status");
    if (status) status.textContent = this._incidentPreviewText();
    const save = this.shadowRoot.getElementById("confirm-save-incident");
    if (save) {
      save.disabled = Boolean(this._savingEventId) || !this._incidentDraft?.preview?.can_save;
    }
    const preview = this.shadowRoot.getElementById("preview-incident");
    if (preview) {
      preview.disabled = Boolean(this._savingEventId) || Boolean(this._incidentDraft?.previewLoading);
    }
  }

  async _saveIncident() {
    const draft = this._incidentDraft;
    if (!this._hass || !draft?.preview?.can_save || this._savingEventId) {
      return;
    }
    const eventId = draft.eventId;
    this._savingEventId = eventId;
    this._incidentNotice = null;
    draft.error = null;
    this._render();

    let saved = false;
    try {
      const request = {
        type: "ha_forensic_lab/incidents/create",
        target_event_id: eventId,
        before_seconds: Number(draft.beforeSeconds),
        after_seconds: Number(draft.afterSeconds),
        title: draft.title,
      };
      const traceEvidence = draft.traceEvidence;
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
      this._incidentDraft = null;
      this._activeView = "incidents";
    } catch (error) {
      draft.preview = null;
      draft.error =
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
    if (!this._hass || !eventId) {
      return;
    }

    const requestId = ++this._explainRequestId;
    this._activeView = "timeline";
    this._traceRequestId += 1;
    this._traceProjection = null;
    this._traceError = null;
    this._traceLoading = false;
    this._selectedEventId = eventId;
    this._explanation = null;
    this._explainError = null;
    this._explainLoading = true;
    this._render();
    const inspector = this.shadowRoot.getElementById("investigation-detail");
    if (inspector) {
      inspector.scrollTop = 0;
      if (globalThis.matchMedia?.("(max-width: 1000px)").matches) {
        inspector.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

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
    const eventId = this._selectedEventId;
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
    const row = this.shadowRoot.getElementById("event-" + eventId);
    row?.focus({ preventScroll: true });
    if (globalThis.matchMedia?.("(max-width: 1000px)").matches) {
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const focused = this.shadowRoot.activeElement;
    const focusId = focused?.id;
    const selection = focused?.selectionStart == null
      ? null : [focused.selectionStart, focused.selectionEnd];
    for (const node of this.shadowRoot.querySelectorAll("[data-preserve-scroll]")) {
      this._viewScroll[node.id] = node.scrollTop;
    }
    const openDetails = new Set(
      Array.from(this.shadowRoot.querySelectorAll("details[id][open]"), (node) => node.id)
    );
    let content;
    if (this._activeView === "incidents") {
      content = this._incidentsView() + this._savedIncidentReviewView();
    } else if (this._activeView === "diagnostics") {
      content = this._recorderHealthView();
    } else {
      const events = this._data.events || [];
      const emptyInspector = '<section class="inspector-empty"><span class="section-kicker">Investigate a change</span><h2>Select an event</h2><p>Choose a row to see what changed, which activity is linked, and where evidence is missing.</p><p>You can then save the evidence before it leaves the rolling buffer.</p></section>';
      content = this._statsView(events.length) + this._filtersView() +
        '<div class="investigation-layout"><div class="event-browser">' +
        this._contentView(events) + '</div>' +
        '<aside id="investigation-detail" class="investigation-detail" data-preserve-scroll aria-label="Selected event">' +
        this._incidentDraftView() + (this._explanationView() || emptyInspector) +
        '</aside></div>';
    }

    this.shadowRoot.innerHTML =
      PANEL_STYLES +
      '<main>' +
      '<header class="hero">' +
      '<div>' +
      '<h1>HA Forensic Lab</h1>' +
      '</div>' +
      (this._activeView === "timeline" ? this._statusView() : "") +
      '</header>' +
      this._navigationView() +
      content +
      '</main>';

    this._bindControls();
    for (const node of this.shadowRoot.querySelectorAll("[data-preserve-scroll]")) {
      node.scrollTop = this._viewScroll[node.id] || 0;
    }
    for (const id of openDetails) {
      const node = this.shadowRoot.getElementById(id);
      if (node) node.open = true;
    }
    if (focusId) {
      const input = this.shadowRoot.getElementById(focusId);
      if (input && !input.disabled) {
        input.focus({ preventScroll: true });
        if (selection) input.setSelectionRange(...selection);
      }
    }
  }

  _navigationView() {
    return '<nav class="workspace-nav" aria-label="Forensic views">' + [
      ["timeline", "Timeline"],
      ["incidents", "Saved incidents" + (this._incidentsLoaded ? ` (${this._incidents.length})` : "")],
      ["diagnostics", "Recorder"],
    ].map(([view, label]) =>
      `<button id="view-${view}" type="button" class="view-button" data-view="${view}" aria-pressed="${view === this._activeView}">${label}</button>`
    ).join("") + '</nav>';
  }

  _setView(view) {
    if (!["timeline", "incidents", "diagnostics"].includes(view)) return;
    this._activeView = view;
    this._render();
    if (view === "diagnostics") void this._loadDiagnostics();
    if (view === "incidents") void this._loadIncidents();
  }

  _statusView() {
    let label = this._timelineUpdatedAt
      ? "Snapshot · " + this._formatTime(this._timelineUpdatedAt, false) : "Snapshot";
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
    const full = capacity > 0 && size >= capacity;
    const span = this._data.retained_span_seconds;
    const shortHistory = full && Number.isFinite(span) && span < 60;

    return (
      '<section class="stats" aria-label="Timeline snapshot">' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(size + " / " + (capacity || "—")) +
      '</span><span class="stat-label">Stored events</span></div>' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(size ? this._formatSpan(this._data.retained_span_seconds) : "—") +
      '</span><span class="stat-label">History available</span></div>' +
      '<div class="stat"><span class="stat-value">' +
      this._escape(returnedCount) +
      '</span><span class="stat-label">Events shown</span></div>' +
      '</section><p class="buffer-note' + (shortHistory ? ' short-history' : '') + '">' +
      (shortHistory
        ? '<strong>Only ' + this._escape(this._formatSpan(span)) + ' of history remains.</strong> Exclude noisy entities or increase capacity in capture settings. '
        : full ? 'Buffer full: new events replace the oldest. ' : 'Oldest events are replaced when the buffer fills. ') +
      '<a href="/config/integrations/integration/ha_forensic_lab">Capture settings</a></p>'
    );
  }

  _formatSpan(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const total = Math.floor(seconds);
    if (total < 60) return `${total}s`;
    const minutes = Math.floor(total / 60);
    if (minutes < 60) return `${minutes}m ${total % 60}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
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
      Number(capture.dropped_excluded_targets || 0) +
      Number(capture.dropped_unchanged_state || 0);
    const persistenceLabel =
      Number(persistence.failed_writes || 0) > 0
        ? String(persistence.failed_writes) + " save errors reported"
        : persistence.pending_save
          ? "write pending"
          : "idle";

    return (
      '<section class="health-panel">' +
      '<div class="section-heading health-heading"><div><h2>Recorder health</h2><p class="view-description">Technical counters since the last integration start. Restored events are not new captures.</p></div>' +
      '<button class="button button-small" id="refresh-diagnostics" type="button"' +
      (this._diagnosticsLoading ? " disabled" : "") +
      ">" +
      (this._diagnosticsLoading ? "Refreshing…" : "Refresh") +
      "</button></div>" +
      '<p class="view-description">Snapshot taken ' + this._escape(this._diagnosticsUpdatedAt ? this._formatTime(this._diagnosticsUpdatedAt, false) : "—") + '. Refresh to update these counters.</p>' +
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
        "Accepted / filtered this session"
      ) +
      this._healthMetric(
        this._formatMetric(rolling.utilization_percent, 1) + "%",
        "Buffer used at this snapshot"
      ) +
      "</div>" +
      '<div class="health-foot"><span>Persistence: <strong>' +
      this._escape(persistenceLabel) +
      "</strong></span><span>" +
      this._escape(
        Number(persistence.completed_writes || 0) + " save calls returned"
      ) +
      '</span><span>' +
      this._escape(Number(capture.evicted_events || 0)) +
      ' evicted this session</span><span>' +
      this._escape(Number(capture.dropped_unchanged_state || 0)) +
      ' unchanged updates skipped</span></div>' +
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
          (this._filterDraft.kind === value ? " selected" : "") +
          ">" +
          this._escape(label) +
          "</option>"
      )
      .join("");

    return (
      '<section class="toolbar">' +
      '<form id="timeline-filters">' +
      '<label class="field"><span>Entity ID</span><input id="entity-filter" type="text" list="entity-options" autocomplete="off" spellcheck="false" placeholder="All entities — choose or enter an ID" value="' +
      this._escape(this._filterDraft.entityId) +
      '"></label><datalist id="entity-options">' +
      Object.values(this._hass?.states || {}).map((state) =>
        '<option value="' + this._escape(state.entity_id) + '" label="' +
        this._escape(state.attributes?.friendly_name || state.entity_id) + '"></option>'
      ).join("") + '</datalist>' +
      '<label class="field"><span>Event type</span><select id="kind-filter">' +
      options +
      "</select></label>" +
      '<div class="actions">' +
      '<button class="button primary" type="submit"' +
      (this._loading ? " disabled" : "") +
      ">Apply</button>" +
      '<button class="button" id="refresh-timeline" type="button"' +
      (this._loading ? " disabled" : "") +
      ">Refresh events</button>" +
      '<button class="button quiet" id="clear-filters" type="button"' +
      (this._loading ? " disabled" : "") +
      ">Clear</button>" +
      "</div>" +
      "</form>" +
      '<p id="filter-status" class="filter-status" role="status">' + this._escape(this._filterStatusText()) + '</p>' +
      "</section>"
    );
  }

  _filterStatusText() {
    if (this._filterDraft.entityId.trim() !== this._filters.entityId ||
        this._filterDraft.kind !== this._filters.kind) {
      return "Filters changed — press Apply to update the list.";
    }
    const selected = [this._filters.entityId, this._filters.kind ? this._kindLabel(this._filters.kind) : ""].filter(Boolean);
    return (selected.length ? "Showing " + selected.join(" · ") : "Showing all entities and event types") +
      ". Manual refresh; filters affect this view only, not capture.";
  }

  _updateFilterDraft(field, value) {
    this._filterDraft[field] = value;
    const status = this.shadowRoot.getElementById("filter-status");
    if (status) status.textContent = this._filterStatusText();
  }

  async _applyFilters() {
    if (this._loading) return;
    this._filters = { entityId: this._filterDraft.entityId.trim(), kind: this._filterDraft.kind };
    this._filterDraft = { ...this._filters };
    await this._loadTimeline();
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
      '<div class="section-heading"><div><h2>Events <span class="list-count">' + this._escape(events.length) + '</span></h2></div>' +
      '<span class="refresh-note">' + (this._loading ? 'Refreshing…' : 'Newest first') + '</span>' +
      "</div>" +
      '<div class="timeline" id="timeline-list" data-preserve-scroll>' +
      events.map((event) => this._eventView(event)).join("") +
      "</div>" +
      "</section>"
    );
  }

  _eventView(event) {
    const summary = this._eventSummary(event);
    const selected = event.event_id === this._selectedEventId;
    return `<button id="event-${this._escape(event.event_id)}" class="event-row explain-button${selected ? " selected" : ""}" type="button"
      data-explain-id="${this._escape(event.event_id)}" aria-pressed="${selected}">
      <span class="event-row-top"><span class="kind">${this._escape(this._kindLabel(event.kind))}</span>
      <time class="time" title="${this._escape(this._formatDateTime(event.timestamp))}">${this._escape(this._formatTime(event.timestamp))}</time></span>
      <strong class="event-row-name">${this._eventTitle(event)}</strong>
      ${event.entity_id ? '<span class="entity-id">' + this._escape(event.entity_id) + '</span>' : ''}
      <span class="event-row-bottom"><span class="event-summary">${summary}</span><span class="inspect-label">${selected ? "Selected" : "Inspect →"}</span></span>
      </button>`;
  }

  _eventTitle(event) {
    return this._escape(this._eventName(event));
  }

  _eventName(event) {
    if (event.kind === "call_service") {
      return event.domain && event.service
        ? event.domain + "." + event.service : event.service || "Service call";
    }
    const friendlyName = this._hass?.states?.[event.entity_id]?.attributes?.friendly_name;
    return event.name || friendlyName || event.entity_id || this._kindLabel(event.kind);
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
      const source = event.source
        ? '<span class="muted">Triggered by</span> ' + this._escape(event.source)
        : '<span class="muted">Automation triggered</span>';
      return source;
    }

    if (event.kind === "script_started" && event.entity_id) {
      return '<span class="muted">Script started</span>';
    }

    return "";
  }

  _metadataView(event, dateTime) {
    const rows = [
      ["Entity ID", event.entity_id],
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
      '<details id="metadata-' + this._escape(event.event_id) + '">' +
      "<summary>Technical details · IDs and context</summary>" +
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
        this._savedReviewHeader(null) +
        '<div class="trace-state"><div class="spinner" aria-hidden="true"></div>' +
        '<div><strong>Reconstructing frozen evidence…</strong><p>This review uses the saved incident only; it does not depend on the live rolling buffer.</p></div></div>' +
        "</section>"
      );
    }

    if (this._incidentReviewError) {
      return (
        '<section class="saved-review-panel" id="saved-review-panel">' +
        this._savedReviewHeader(null) +
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

    return (
      '<section class="saved-review-panel" id="saved-review-panel">' +
      this._savedReviewHeader(incident) +
      '<p class="view-description">Reviewing saved evidence. This view does not depend on the current rolling buffer.</p>' +
      this._evidenceOverviewView(explanation) +
      gapView +
      '<div class="chain-heading"><span class="section-kicker">Frozen · oldest to newest</span><h3>Context evidence chain</h3></div>' +
      '<div class="explain-chain">' +
      chain +
      "</div>" +
      '<details id="frozen-trace-details"><summary>Saved automation / script trace · ' +
      (review.trace_evidence ? 'available' : 'not captured') + '</summary>' +
      this._frozenTraceView(review.trace_evidence) + '</details>' +
      "</section>"
    );
  }

  _savedReviewHeader(incident) {
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
    return (
      '<div class="explain-head"><div><span class="section-kicker">Saved incident review</span><h2>' +
      this._escape(title) +
      "</h2>" +
      meta +
      "</div>" +
      '<div class="explain-head-actions">' +
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
      : '<div class="incident-empty"><strong>No saved incidents yet.</strong><span>Open Timeline, select an event, then choose Save incident to keep its evidence.</span></div>';

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
      '<p class="incident-help">Exports pseudonymize identifiers and redact free text. Review before sharing.</p>' +
      "</section>"
    );
  }

  _incidentDraftView() {
    const draft = this._incidentDraft;
    if (!draft) return "";
    const disabled = this._savingEventId ? " disabled" : "";
    return `
      <form id="incident-draft" class="incident-draft">
        <div class="incident-draft-heading"><strong>Save incident</strong>
          <span>${this._escape(draft.targetLabel)}</span></div>
        <label class="field">Title (optional)
          <input id="incident-title" maxlength="120" value="${this._escape(draft.title)}" placeholder="Automatic title if left blank"${disabled}>
        </label>
        <div class="incident-window-fields">
          <label class="field">Seconds before
            <input id="incident-before" type="number" min="0" max="3600" step="any" required value="${this._escape(draft.beforeSeconds)}"${disabled}>
          </label>
          <label class="field">Seconds after
            <input id="incident-after" type="number" min="0" max="3600" step="any" required value="${this._escape(draft.afterSeconds)}"${disabled}>
          </label>
        </div>
        <p id="incident-preview-status" class="incident-help" role="status">${this._escape(this._incidentPreviewText())}</p>
        <div class="actions">
          <button id="preview-incident" class="button" type="button"${this._savingEventId || draft.previewLoading ? " disabled" : ""}>Preview window</button>
          <button id="confirm-save-incident" class="button primary" type="submit"${this._savingEventId || !draft.preview?.can_save ? " disabled" : ""}>${this._savingEventId ? "Saving…" : "Save incident"}</button>
          <button id="cancel-incident" class="button quiet" type="button"${disabled}>Cancel</button>
        </div>
        <p class="incident-help">Counts all retained events in this window, regardless of timeline filters. Saving does not wait for future events.${draft.traceEvidence ? " Matching structural trace evidence will also be saved." : ""}</p>
      </form>`;
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
        this._explanationHeader(timelineTarget) +
        '<div class="explain-loading"><div class="spinner" aria-hidden="true"></div>' +
        '<div><strong>Reconstructing context evidence…</strong>' +
        '<p>Only explicit Home Assistant context relationships are followed.</p></div></div>' +
        "</section>"
      );
    }

    if (this._explainError) {
      return (
        '<section class="explain-panel" id="explanation-panel">' +
        this._explanationHeader(timelineTarget) +
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

    return (
      '<section class="explain-panel" id="explanation-panel">' +
      this._explanationHeader(target) +
      this._evidenceOverviewView(explanation) +
      gapView +
      '<div class="chain-heading"><h3>Recorded sequence</h3><p class="view-description">Oldest first · ' + this._escape(events.length) + ' event(s)</p></div>' +
      '<div class="explain-chain">' +
      chain +
      "</div>" +
      '<details id="trace-details-' + this._escape(this._selectedEventId) + '"><summary>Automation / script trace · ' +
      (this._traceLoading ? 'checking' : this._traceProjection?.status === "available" ? 'available' : 'unavailable') +
      '</summary>' + this._traceView() + '</details>' +
      "</section>"
    );
  }

  _evidenceOverviewView(explanation) {
    const summary = summarizeEvidence(explanation);
    return '<section class="evidence-overview ' + summary.tone + '" aria-label="Evidence summary">' +
      '<span class="section-kicker">What the recording shows</span><h3>' + this._escape(summary.title) +
      '</h3><p>' + this._escape(summary.detail) + '</p>' +
      (summary.anchor ? '<p class="linked-activity"><strong>Related activity:</strong> ' +
        this._eventTitle(summary.anchor) + '</p>' : '') + '</section>';
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
        "</p><p>No additional run details are available. This does not prove that no automation or script was involved.</p></div></div>" +
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

  _explanationHeader(target) {
    const saving = Boolean(this._savingEventId);
    const disabled = saving || this._traceLoading || this._explainLoading || !this._explanation;
    return '<div class="explain-head"><div><span class="section-kicker">Selected event' +
      (target ? ' · ' + this._escape(this._formatTime(target.timestamp)) : '') + '</span><h2>' +
      (target ? this._eventTitle(target) : 'Event details') + '</h2>' +
      (target?.entity_id ? '<div class="selected-identity">' + this._code(target.entity_id) + '</div>' : '') +
      '<div class="event-summary selected-transition">' + (target ? this._eventSummary(target) : '') +
      '</div></div><button class="icon-button" id="close-explanation" type="button" aria-label="Close explanation" title="Close explanation">×</button></div>' +
      '<div class="event-actions"><button class="button primary save-incident-button" type="button" data-save-event-id="' +
      this._escape(this._selectedEventId) + '"' + (disabled ? ' disabled' : '') + '>' +
      (saving ? 'Saving…' : this._traceLoading ? 'Checking trace…' : 'Save incident') +
      '</button><span class="action-hint">Keep this evidence after the buffer moves on.</span></div>';
  }

  _explanationEventView(event, targetEventId) {
    const isTarget = event.event_id === targetEventId;
    const kind = String(event.kind || "unknown");
    const summary = this._eventSummary(event);

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
      (isTarget ? '<span class="target-label">Selected event</span>' : "") +
      "</div>" + this._metadataView(event, this._formatDateTime(event.timestamp)) + '</article>'
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
        '<div><strong>Parent context link</strong><span>Home Assistant explicitly links the child context to its parent.</span></div></div>'
      );
    }

    return (
      '<div class="evidence-connector same"><span class="connector-line"></span>' +
      '<div><strong>Shared context</strong><span>Related activity; sequence alone does not prove causation.</span></div></div>'
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
    this.shadowRoot.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => this._setView(button.dataset.view));
    });
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

        void this._applyFilters();
      });
      this.shadowRoot.getElementById("entity-filter").addEventListener("input", (event) => {
        this._updateFilterDraft("entityId", event.target.value);
      });
      this.shadowRoot.getElementById("kind-filter").addEventListener("change", (event) => {
        this._updateFilterDraft("kind", event.target.value);
      });
    }

    if (refresh) {
      refresh.addEventListener("click", () => {
        void this._loadTimeline();
      });
    }

    if (clear) {
      clear.addEventListener("click", () => {
        this._filterDraft = { entityId: "", kind: "" };
        void this._applyFilters();
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
            void this._openIncidentDraft(eventId);
          }
        });
      });

    const incidentForm = this.shadowRoot.getElementById("incident-draft");
    if (incidentForm) {
      incidentForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void this._saveIncident();
      });
      for (const [id, field] of [
        ["incident-title", "title"],
        ["incident-before", "beforeSeconds"],
        ["incident-after", "afterSeconds"],
      ]) {
        this.shadowRoot.getElementById(id).addEventListener("input", (event) => {
          this._updateIncidentDraft(field, event.target.value);
        });
      }
      this.shadowRoot.getElementById("preview-incident").addEventListener("click", () => {
        void this._previewIncident();
      });
      this.shadowRoot.getElementById("cancel-incident").addEventListener("click", () => {
        this._closeIncidentDraft();
      });
    }

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

  _formatTime(timestamp, precise = true) {
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
        ...(precise ? { fractionalSecondDigits: 3 } : {}),
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
    return value === null || value === undefined ? "Not recorded" : String(value);
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
}

customElements.define("ha-forensic-lab-panel", HAForensicLabPanel);
