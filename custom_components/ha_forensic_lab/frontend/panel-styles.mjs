export const PANEL_STYLES = `<style>
:host {
  display: block;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  font-family: var(--paper-font-body1_-_font-family,system-ui,sans-serif)
}

main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 64px
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px
}

.eyebrow,.section-kicker {
  color: var(--secondary-text-color);
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase
}

h1 {
  margin: 7px 0 8px;
  font-size: clamp(2rem,5vw,3.35rem);
  line-height: 1.02;
  letter-spacing: -.045em
}

.lead {
  max-width: 760px;
  margin: 0;
  color: var(--secondary-text-color);
  font-size: 1.02rem;
  line-height: 1.55
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  padding: 8px 11px;
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  background: var(--card-background-color);
  font-size: .82rem;
  font-weight: 650
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color,#4caf50)
}

.status.loading .dot {
  background: var(--warning-color,#ff9800)
}

.status.error .dot {
  background: var(--error-color,#db4437)
}

.stats {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 10px;
  margin-bottom: 14px
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 15px 16px;
  border: 1px solid var(--divider-color);
  border-radius: 14px;
  background: var(--card-background-color)
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums
}

.stat-label {
  color: var(--secondary-text-color);
  font-size: .78rem
}

.health-panel {
  margin: 0 0 14px;
  padding: 16px;
  border: 1px solid var(--divider-color);
  border-radius: 16px;
  background: var(--card-background-color)
}

.health-heading {
  align-items: center
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 8px
}

.health-metric {
  display: grid;
  gap: 3px;
  padding: 10px 11px;
  border-radius: 10px;
  background: var(--secondary-background-color)
}

.health-metric strong {
  font-size: .95rem;
  font-variant-numeric: tabular-nums
}

.health-metric span {
  color: var(--secondary-text-color);
  font-size: .7rem
}

.health-foot {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
  color: var(--secondary-text-color);
  font-size: .7rem
}

.health-foot strong {
  color: var(--primary-text-color)
}

.health-privacy {
  margin-left: auto
}

.health-state {
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 11px;
  color: var(--secondary-text-color);
  font-size: .8rem
}

.health-error {
  padding: 10px 11px;
  border-left: 3px solid var(--error-color,#db4437);
  background: var(--secondary-background-color);
  font-size: .78rem
}

.toolbar {
  margin-bottom: 28px;
  padding: 16px;
  border: 1px solid var(--divider-color);
  border-radius: 16px;
  background: var(--card-background-color)
}

form {
  display: grid;
  grid-template-columns: minmax(240px,1fr) minmax(190px,.45fr) auto;
  gap: 12px;
  align-items: end
}

.field {
  display: grid;
  gap: 6px;
  color: var(--secondary-text-color);
  font-size: .78rem;
  font-weight: 650
}

input,select {
  width: 100%;
  box-sizing: border-box;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  font: inherit;
  outline: none
}

input:focus,select:focus {
  border-color: var(--primary-color)
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center
}

.button {
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  font: inherit;
  font-weight: 650;
  cursor: pointer
}

.button:hover:not(:disabled) {
  background: var(--secondary-background-color)
}

.button.primary {
  border-color: var(--primary-color);
  color: var(--text-primary-color,var(--primary-text-color));
  background: var(--primary-color)
}

.button.quiet {
  color: var(--secondary-text-color)
}

.button:disabled {
  opacity: .55;
  cursor: default
}

.timeline-section {
  margin-top: 6px
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin: 0 0 12px
}

.section-heading h2 {
  margin: 4px 0 0;
  font-size: 1.2rem
}

.refresh-note {
  color: var(--secondary-text-color);
  font-size: .82rem
}

.timeline {
  display: grid
}

.event {
  display: grid;
  grid-template-columns: 28px minmax(0,1fr);
  gap: 10px;
  min-width: 0
}

.rail {
  position: relative;
  display: flex;
  justify-content: center
}

.rail:after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--divider-color)
}

.event:first-child .rail:after {
  top: 17px
}

.event:last-child .rail:after {
  bottom: calc(100% - 17px)
}

.marker {
  position: relative;
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 17px;
  border: 3px solid var(--primary-background-color);
  border-radius: 50%;
  background: var(--secondary-text-color);
  box-shadow: 0 0 0 1px var(--divider-color)
}

.marker.state_changed {
  background: var(--primary-color)
}

.marker.call_service {
  background: var(--warning-color,#ff9800)
}

.marker.automation_triggered {
  background: var(--success-color,#4caf50)
}

.marker.script_started {
  background: var(--accent-color,var(--primary-color))
}

.event-card {
  min-width: 0;
  margin-bottom: 10px;
  padding: 14px 16px;
  border: 1px solid var(--divider-color);
  border-radius: 14px;
  background: var(--card-background-color);
  box-shadow: var(--ha-card-box-shadow,none)
}

.event-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color)
}

.event-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start
}

.event-heading {
  display: flex;
  min-width: 0;
  gap: 9px;
  align-items: center;
  flex-wrap: wrap
}

.kind {
  padding: 4px 7px;
  border-radius: 7px;
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: .68rem;
  font-weight: 750;
  letter-spacing: .05em;
  text-transform: uppercase
}

.event-title {
  min-width: 0;
  font-size: .98rem;
  overflow-wrap: anywhere
}

.time {
  white-space: nowrap;
  color: var(--secondary-text-color);
  font-size: .78rem;
  font-variant-numeric: tabular-nums
}

.event-summary {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 9px;
  line-height: 1.45
}

.state-value {
  font-weight: 650
}

.arrow,.muted {
  color: var(--secondary-text-color)
}

.event-actions {
  display: flex;
  gap: 8px;
  margin-top: 11px;
  flex-wrap: wrap
}

.button-small {
  min-height: 34px;
  padding: 0 10px;
  font-size: .78rem
}

.saved-review-panel {
  margin: 0 0 28px;
  padding: 20px;
  border: 1px solid var(--divider-color);
  border-radius: 18px;
  background: var(--card-background-color);
  box-shadow: var(--ha-card-box-shadow,none);
  scroll-margin-top: 16px
}

.saved-review-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 7px;
  color: var(--secondary-text-color);
  font-size: .75rem
}

.incidents-panel {
  margin: 0 0 28px;
  padding: 18px;
  border: 1px solid var(--divider-color);
  border-radius: 18px;
  background: var(--card-background-color);
  box-shadow: var(--ha-card-box-shadow,none)
}

.incident-heading {
  align-items: center
}

.incident-heading-actions {
  display: flex;
  gap: 8px;
  align-items: center
}

.incident-count {
  color: var(--secondary-text-color);
  font-size: .78rem;
  font-variant-numeric: tabular-nums
}

.incident-list {
  display: grid;
  gap: 9px
}

.incident-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 13px 14px;
  border: 1px solid var(--divider-color);
  border-radius: 12px;
  background: var(--primary-background-color)
}

.incident-main {
  min-width: 0
}

.incident-title {
  display: inline;
  overflow-wrap: anywhere
}

.incident-trace-badge {
  display: inline-flex;
  margin-left: 8px;
  padding: 3px 6px;
  border-radius: 999px;
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: .65rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: .04em
}

.incident-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 5px;
  color: var(--secondary-text-color);
  font-size: .75rem
}

.incident-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0
}

.incident-empty {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 18px;
  border: 1px dashed var(--divider-color);
  border-radius: 12px;
  color: var(--secondary-text-color);
  font-size: .84rem
}

.incident-empty strong {
  color: var(--primary-text-color)
}

.incident-notice,.incident-error {
  margin: 0 0 10px;
  padding: 9px 11px;
  border-radius: 9px;
  font-size: .8rem
}

.incident-notice {
  background: var(--secondary-background-color);
  border-left: 3px solid var(--success-color,#4caf50)
}

.incident-error {
  background: var(--secondary-background-color);
  border-left: 3px solid var(--error-color,#db4437)
}

.incident-help {
  margin: 11px 0 0;
  color: var(--secondary-text-color);
  font-size: .74rem;
  line-height: 1.45
}

code {
  max-width: 100%;
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--secondary-background-color);
  font-family: var(--code-font-family,ui-monospace,SFMono-Regular,Consolas,monospace);
  font-size: .86em;
  overflow-wrap: anywhere
}

details {
  margin-top: 11px;
  padding-top: 9px;
  border-top: 1px solid var(--divider-color)
}

summary {
  width: max-content;
  color: var(--secondary-text-color);
  font-size: .78rem;
  cursor: pointer
}

.metadata {
  display: grid;
  gap: 6px;
  margin-top: 9px
}

.metadata-row {
  display: grid;
  grid-template-columns: 110px minmax(0,1fr);
  gap: 10px;
  align-items: baseline;
  font-size: .78rem
}

.metadata-row>span {
  color: var(--secondary-text-color)
}

.explain-panel {
  margin: 0 0 28px;
  padding: 20px;
  border: 1px solid var(--divider-color);
  border-radius: 18px;
  background: var(--card-background-color);
  box-shadow: var(--ha-card-box-shadow,none);
  scroll-margin-top: 16px
}

.explain-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start
}

.explain-head h2 {
  margin: 4px 0 8px;
  font-size: 1.35rem
}

.explain-target {
  display: flex;
  gap: 9px;
  align-items: center;
  flex-wrap: wrap
}

.explain-transition {
  display: flex;
  gap: 7px;
  align-items: center
}

.explain-head-actions {
  display: flex;
  gap: 8px;
  align-items: center
}

.icon-button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer
}

.evidence-status {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 750
}

.evidence-status.complete {
  background: var(--success-color,#4caf50);
  color: var(--text-primary-color,#fff)
}

.evidence-status.incomplete {
  background: var(--warning-color,#ff9800);
  color: var(--text-primary-color,#fff)
}

.evidence-note {
  margin: 16px 0;
  padding: 13px 14px;
  border-left: 3px solid var(--primary-color);
  border-radius: 8px;
  background: var(--secondary-background-color)
}

.evidence-note strong {
  font-size: .84rem
}

.evidence-note p {
  margin: 4px 0 0;
  color: var(--secondary-text-color);
  font-size: .82rem;
  line-height: 1.5
}

.evidence-gaps {
  display: grid;
  gap: 7px;
  margin: 14px 0;
  padding: 12px 14px;
  border: 1px solid var(--divider-color);
  border-radius: 10px
}

.gap-title {
  font-size: .78rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--secondary-text-color)
}

.gap-row {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 7px;
  align-items: start;
  font-size: .82rem;
  line-height: 1.45
}

.gap-marker {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--warning-color,#ff9800);
  color: var(--text-primary-color,#fff);
  font-weight: 800;
  font-size: .7rem
}

.chain-heading {
  margin: 20px 0 10px
}

.chain-heading h3 {
  margin: 3px 0 0;
  font-size: 1rem
}

.explain-chain {
  display: grid;
  max-width: 900px
}

.chain-node {
  padding: 13px 14px;
  border: 1px solid var(--divider-color);
  border-radius: 12px;
  background: var(--primary-background-color)
}

.chain-node.target {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color)
}

.chain-node-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start
}

.chain-node-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 9px;
  color: var(--secondary-text-color);
  font-size: .75rem
}

.target-label {
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--primary-color);
  color: var(--text-primary-color,#fff);
  font-weight: 700
}

.evidence-connector {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 9px;
  min-height: 46px;
  align-items: center;
  padding: 3px 10px;
  color: var(--secondary-text-color)
}

.connector-line {
  justify-self: center;
  width: 2px;
  height: 100%;
  min-height: 34px;
  background: var(--divider-color)
}

.evidence-connector.parent .connector-line {
  background: var(--primary-color)
}

.evidence-connector strong {
  display: block;
  color: var(--primary-text-color);
  font-size: .78rem
}

.evidence-connector span:not(.connector-line) {
  display: block;
  margin-top: 2px;
  font-size: .74rem;
  line-height: 1.35
}

.explain-loading,.explain-error {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
  padding: 20px;
  border: 1px dashed var(--divider-color);
  border-radius: 12px
}

.explain-loading p,.explain-error p {
  margin: 3px 0 0;
  color: var(--secondary-text-color);
  font-size: .82rem
}

.trace-panel {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--divider-color)
}

.trace-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start
}

.trace-head h3 {
  margin: 4px 0 5px;
  font-size: 1rem
}

.trace-identity {
  margin-top: 5px
}

.trace-badge {
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--secondary-background-color);
  color: var(--primary-text-color);
  font-size: .7rem;
  font-weight: 750;
  white-space: nowrap
}

.muted-badge {
  color: var(--secondary-text-color)
}

.trace-state {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 14px;
  border: 1px dashed var(--divider-color);
  border-radius: 11px
}

.trace-state p {
  margin: 3px 0 0;
  color: var(--secondary-text-color);
  font-size: .8rem;
  line-height: 1.45
}

.trace-facts {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 7px;
  margin-top: 12px
}

.trace-fact {
  display: grid;
  grid-template-columns: 80px minmax(0,1fr);
  gap: 8px;
  align-items: baseline;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--secondary-background-color);
  font-size: .75rem
}

.trace-fact>span {
  color: var(--secondary-text-color)
}

.trace-steps {
  display: grid;
  gap: 7px;
  margin-top: 13px
}

.trace-step {
  display: grid;
  grid-template-columns: 26px minmax(0,1fr);
  gap: 9px;
  align-items: start;
  padding: 10px 11px;
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  background: var(--primary-background-color)
}

.trace-index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: .68rem;
  font-weight: 750
}

.trace-step-body {
  min-width: 0
}

.trace-path {
  line-height: 1.35
}

.trace-outcomes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 7px
}

.trace-outcome {
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--secondary-background-color);
  font-size: .68rem;
  color: var(--secondary-text-color)
}

.trace-child {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 7px;
  color: var(--secondary-text-color);
  font-size: .7rem
}

.trace-warning {
  margin-top: 11px;
  padding: 8px 10px;
  border-left: 3px solid var(--warning-color,#ff9800);
  background: var(--secondary-background-color);
  font-size: .76rem
}

.trace-privacy {
  display: grid;
  gap: 3px;
  margin-top: 12px;
  padding: 10px 11px;
  border-radius: 9px;
  background: var(--secondary-background-color);
  font-size: .72rem;
  line-height: 1.45
}

.trace-privacy span {
  color: var(--secondary-text-color)
}

.state-card {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 48px 24px;
  border: 1px dashed var(--divider-color);
  border-radius: 16px;
  text-align: center;
  background: var(--card-background-color)
}

.state-card p {
  max-width: 580px;
  margin: 0;
  color: var(--secondary-text-color);
  line-height: 1.5
}

.error-card {
  border-style: solid
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--divider-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin .8s linear infinite
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

footer {
  margin-top: 30px;
  color: var(--secondary-text-color);
  font-size: .78rem;
  line-height: 1.5
}

@media(max-width:820px) {
  main {
    padding: 24px 16px 48px
  }
  .hero {
    display: grid
  }
  .status {
    width: max-content
  }
  .stats {
    grid-template-columns: repeat(2,minmax(0,1fr))
  }
  .health-grid {
    grid-template-columns: repeat(2,minmax(0,1fr))
  }
  .health-privacy {
    margin-left: 0
  }
  form {
    grid-template-columns: 1fr
  }
  .actions {
    flex-wrap: wrap
  }
  .event {
    grid-template-columns: 20px minmax(0,1fr)
  }
  .event-head,.chain-node-head {
    display: grid;
    gap: 7px
  }
  .time {
    order: -1
  }
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 2px
  }
  .explain-head {
    display: grid
  }
  .explain-head-actions {
    justify-content: space-between;
    order: -1
  }
  .evidence-status {
    order: 2
  }
  .incident-card {
    display: grid
  }
  .incident-actions {
    flex-wrap: wrap
  }
  .incident-heading {
    align-items: flex-start
  }
  .incident-heading-actions {
    flex-wrap: wrap
  }
  .trace-head {
    display: grid
  }
  .trace-facts {
    grid-template-columns: 1fr
  }
  .trace-fact {
    grid-template-columns: 70px minmax(0,1fr)
  }
}
</style>`;
