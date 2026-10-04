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
  }

  connectedCallback() {
    this._render();

    if (this._hass && !this._hasLoaded && !this._loading) {
      void this._loadTimeline();
    }
  }

  set hass(value) {
    const firstConnection = !this._hass;
    this._hass = value;
    this._render();

    if (firstConnection && value && !this._hasLoaded && !this._loading) {
      void this._loadTimeline();
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

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const events = this._data.events || [];
    const status = this._statusView();
    const content = this._contentView(events);

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
      this._filtersView() +
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

    return (
      '<article class="event">' +
      '<div class="rail" aria-hidden="true"><span class="marker ' +
      this._escape(kind) +
      '"></span></div>' +
      '<div class="event-card">' +
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

  _bindControls() {
    const form = this.shadowRoot.getElementById("timeline-filters");
    const refresh = this.shadowRoot.getElementById("refresh-timeline");
    const clear = this.shadowRoot.getElementById("clear-filters");
    const retry = this.shadowRoot.getElementById("retry-timeline");

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
      ".event-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.event-heading{display:flex;min-width:0;gap:9px;align-items:center;flex-wrap:wrap}.kind{padding:4px 7px;border-radius:7px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:.68rem;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.event-title{min-width:0;font-size:.98rem;overflow-wrap:anywhere}" +
      ".time{white-space:nowrap;color:var(--secondary-text-color);font-size:.78rem;font-variant-numeric:tabular-nums}.event-summary{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px;line-height:1.45}.state-value{font-weight:650}.arrow,.muted{color:var(--secondary-text-color)}" +
      "code{max-width:100%;padding:2px 5px;border-radius:5px;background:var(--secondary-background-color);font-family:var(--code-font-family,ui-monospace,SFMono-Regular,Consolas,monospace);font-size:.86em;overflow-wrap:anywhere}" +
      "details{margin-top:11px;padding-top:9px;border-top:1px solid var(--divider-color)}summary{width:max-content;color:var(--secondary-text-color);font-size:.78rem;cursor:pointer}.metadata{display:grid;gap:6px;margin-top:9px}.metadata-row{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px;align-items:baseline;font-size:.78rem}.metadata-row>span{color:var(--secondary-text-color)}" +
      ".state-card{display:grid;justify-items:center;gap:8px;padding:48px 24px;border:1px dashed var(--divider-color);border-radius:16px;text-align:center;background:var(--card-background-color)}.state-card p{max-width:580px;margin:0;color:var(--secondary-text-color);line-height:1.5}.error-card{border-style:solid}.spinner{width:24px;height:24px;border:3px solid var(--divider-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}" +
      "footer{margin-top:30px;color:var(--secondary-text-color);font-size:.78rem;line-height:1.5}" +
      "@media(max-width:820px){main{padding:24px 16px 48px}.hero{display:grid}.status{width:max-content}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}form{grid-template-columns:1fr}.actions{flex-wrap:wrap}.event{grid-template-columns:20px minmax(0,1fr)}.event-head{display:grid;gap:7px}.time{order:-1}.metadata-row{grid-template-columns:1fr;gap:2px}}" +
      "</style>"
    );
  }
}

customElements.define("ha-forensic-lab-panel", HAForensicLabPanel);
