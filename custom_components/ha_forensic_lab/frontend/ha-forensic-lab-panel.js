class HAForensicLabPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  set narrow(value) {
    this._narrow = value;
  }

  set panel(value) {
    this._panel = value;
  }

  _render() {
    if (this._rendered || !this.shadowRoot) {
      return;
    }

    this._rendered = true;
    this.shadowRoot.innerHTML = \`
      <style>
        :host {
          display: block;
          min-height: 100%;
          box-sizing: border-box;
          color: var(--primary-text-color);
          background: var(--primary-background-color);
          font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
        }

        main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px 56px;
        }

        .eyebrow {
          color: var(--secondary-text-color);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1 {
          margin: 8px 0 8px;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 1.02;
          letter-spacing: -0.04em;
        }

        .lead {
          max-width: 760px;
          margin: 0 0 28px;
          color: var(--secondary-text-color);
          font-size: 1.05rem;
          line-height: 1.6;
        }

        .status {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 32px;
          padding: 7px 11px;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          background: var(--card-background-color);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--warning-color, #f6a623);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .card {
          padding: 22px;
          border: 1px solid var(--divider-color);
          border-radius: 16px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, none);
        }

        .card h2 {
          margin: 0 0 10px;
          font-size: 1rem;
        }

        .card p {
          margin: 0;
          color: var(--secondary-text-color);
          line-height: 1.55;
        }

        .evidence {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .evidence-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 12px;
          align-items: baseline;
        }

        .evidence-row strong {
          font-size: 0.9rem;
        }

        footer {
          margin-top: 28px;
          color: var(--secondary-text-color);
          font-size: 0.9rem;
        }

        @media (max-width: 720px) {
          main {
            padding: 24px 16px 40px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .evidence-row {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      </style>

      <main>
        <div class="eyebrow">Runtime forensics for Home Assistant</div>
        <h1>HA Forensic Lab</h1>
        <p class="lead">
          Reconstruct what happened, in what order, and why. The project records
          evidence first and interprets it second.
        </p>

        <div class="status">
          <span class="dot"></span>
          Pre-alpha foundation build
        </div>

        <section class="grid">
          <article class="card">
            <h2>Recorder</h2>
            <p>
              Not enabled in this build. v0.1 will add bounded runtime capture
              for state changes, service calls, automation triggers and scripts.
            </p>
          </article>

          <article class="card">
            <h2>Explain this change</h2>
            <p>
              The target workflow starts with an entity change and reconstructs
              the strongest available causal chain around it.
            </p>
          </article>

          <article class="card">
            <h2>Evidence classes</h2>
            <div class="evidence">
              <div class="evidence-row">
                <strong>Confirmed</strong>
                <span>Backed by context, parent context, trace or another direct link.</span>
              </div>
              <div class="evidence-row">
                <strong>Correlated</strong>
                <span>Associated by timing or surrounding evidence, but not proven causal.</span>
              </div>
            </div>
          </article>

          <article class="card">
            <h2>Privacy boundary</h2>
            <p>
              The forensic workspace is admin-only. Future incident exports will
              be sanitized by default before leaving the Home Assistant instance.
            </p>
          </article>
        </section>

        <footer>
          Foundation only. No runtime events are persisted by this build.
        </footer>
      </main>
    \`;
  }
}

customElements.define("ha-forensic-lab-panel", HAForensicLabPanel);
