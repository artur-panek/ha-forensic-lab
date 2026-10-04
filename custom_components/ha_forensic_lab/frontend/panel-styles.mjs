export const PANEL_STYLES = `<style>
:host {
  display: block;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  font-size: 14px;
  line-height: 1.5;
  font-family: var(--paper-font-body1_-_font-family,system-ui,sans-serif)
}

main {
  box-sizing: border-box;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 24px 40px
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px
}

.eyebrow,.section-kicker {
  color: var(--secondary-text-color);
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase
}

h1 {
  margin: 0 0 4px;
  font-size: 1.65rem;
  line-height: 1.2;
  letter-spacing: -.025em
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
  background: var(--secondary-text-color)
}

.status.loading .dot {
  background: var(--warning-color,#ff9800)
}

.status.error .dot {
  background: var(--error-color,#db4437)
}

.stats {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 10px;
  margin-bottom: 8px
}

.stat {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px;
  border-left: 2px solid var(--divider-color)
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums
}

.stat-label {
  color: var(--secondary-text-color);
  font-size: .84rem
}

.buffer-note {
  margin: 0 0 14px;
  color: var(--secondary-text-color);
  font-size: .84rem;
  line-height: 1.5
}

.buffer-note a {
  color: var(--primary-color)
}

.short-history {
  padding: 10px 12px;
  border-left: 3px solid var(--warning-color,#ff9800);
  border-radius: 6px;
  background: var(--card-background-color);
  color: var(--primary-text-color)
}

.workspace-nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider-color)
}

.view-button {
  padding: 9px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--secondary-text-color);
  font: inherit;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer
}

.view-button[aria-pressed="true"] {
  color: var(--primary-text-color);
  border-color: var(--divider-color);
  background: var(--card-background-color);
  box-shadow: inset 0 -2px var(--primary-color)
}

.investigation-layout {
  display: grid;
  grid-template-columns: minmax(300px,.9fr) minmax(0,1.1fr);
  gap: 18px;
  align-items: start
}

.event-browser,.investigation-detail {
  min-width: 0
}

.investigation-detail {
  position: sticky;
  top: 16px;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  scrollbar-gutter: stable;
  scroll-margin-top: 16px
}

.inspector-empty {
  padding: 28px;
  border: 1px dashed var(--divider-color);
  border-radius: 12px;
  background: var(--card-background-color)
}

.inspector-empty h2 {
  margin: 8px 0;
  font-size: 1.25rem
}

.inspector-empty p,.view-description,.filter-status,.action-hint {
  color: var(--secondary-text-color);
  font-size: .86rem;
  line-height: 1.5
}

.view-description {
  margin: 4px 0 0
}

.filter-status {
  margin: 10px 0 0
}

.list-count {
  margin-left: 6px;
  color: var(--secondary-text-color);
  font-size: .86rem;
  font-weight: 500
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
  font-size: .84rem
}

.health-foot {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
  color: var(--secondary-text-color);
  font-size: .84rem
}

.health-foot strong {
  color: var(--primary-text-color)
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
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--divider-color);
  border-radius: 16px;
  background: var(--card-background-color)
}

form {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(160px,.45fr) auto;
  gap: 12px;
  align-items: end
}

.field {
  display: grid;
  gap: 6px;
  color: var(--secondary-text-color);
  font-size: .86rem;
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
  display: grid;
  gap: 6px;
  max-height: max(340px,calc(100dvh - 385px));
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 2px
}

.event-row {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  text-align: left;
  color: var(--primary-text-color);
  background: var(--card-background-color);
  font: inherit;
  cursor: pointer
}

.event-row:hover {
  background: var(--secondary-background-color)
}

.event-row.selected {
  border-color: var(--primary-color);
  box-shadow: inset 3px 0 var(--primary-color)
}

.event-row-top,.event-row-bottom {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center
}

.event-row-name {
  display: block;
  margin-top: 4px;
  font-size: .95rem;
  overflow-wrap: anywhere
}

.entity-id {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--secondary-text-color);
  font-size: .78rem
}

.event-row-bottom {
  margin-top: 4px
}

.event-row .event-summary {
  margin: 0;
  min-width: 0;
  font-size: .9rem;
  overflow-wrap: anywhere
}

.inspect-label {
  flex-shrink: 0;
  font-size: .8rem;
  color: var(--primary-color)
}

button:focus-visible,summary:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px
}

.event-heading {
  display: flex;
  min-width: 0;
  gap: 9px;
  align-items: center;
  flex-wrap: wrap
}

.kind {
  padding: 2px 6px;
  border-radius: 7px;
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: .74rem;
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
  font-size: .82rem;
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

.event-actions .action-hint {
  flex: 1 1 160px;
  align-self: center
}

.selected-identity {
  overflow-wrap: anywhere;
  font-size: .82rem;
  color: var(--secondary-text-color)
}

.selected-transition {
  font-size: 1.05rem
}

.evidence-overview {
  margin: 18px 0;
  padding: 14px;
  border-left: 3px solid var(--divider-color);
  border-radius: 8px;
  background: var(--secondary-background-color)
}

.evidence-overview.limited {
  border-left-color: var(--warning-color,#ff9800)
}

.evidence-overview.linked {
  border-left-color: var(--primary-color)
}

.evidence-overview h3 {
  margin: 5px 0;
  font-size: 1.08rem
}

.evidence-overview p {
  margin: 5px 0 0;
  font-size: .9rem;
  color: var(--secondary-text-color)
}

.evidence-overview .linked-activity {
  color: var(--primary-text-color)
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

.incident-draft {
  grid-template-columns: minmax(0,1fr);
  margin: 0 0 16px;
  padding: 16px;
  border: 1px solid var(--primary-color);
  border-radius: 12px;
  scroll-margin-top: 16px
}

.incident-draft-heading {
  display: grid;
  gap: 6px;
  overflow-wrap: anywhere
}

.incident-draft-heading span {
  color: var(--secondary-text-color);
  font-size: .8rem
}

.incident-window-fields {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 12px
}

.incident-draft .actions {
  flex-wrap: wrap
}

.incident-draft .incident-help {
  margin: 0
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
  margin: 0;
  padding: 18px;
  border: 1px solid var(--divider-color);
  border-radius: 12px;
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
  font-size: 1.25rem;
  overflow-wrap: anywhere
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

@media(max-width:1000px) {
  .investigation-layout {
    grid-template-columns: minmax(0,1fr)
  }
  .investigation-detail {
    position: static;
    max-height: none;
    overflow: visible
  }
  .timeline {
    max-height: 460px
  }
}

@media(max-width:820px) {
  main {
    padding: 16px 12px 32px
  }
  .hero {
    display: grid
  }
  .status {
    width: max-content
  }
  .workspace-nav {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    overflow: visible;
    gap: 4px
  }
  .view-button {
    padding: 8px 6px;
    white-space: normal;
    font-size: .85rem
  }
  .stats {
    grid-template-columns: repeat(3,minmax(0,1fr))
  }
  .stat {
    padding: 4px 8px
  }
  .stat-value {
    font-size: 1rem
  }
  .health-grid {
    grid-template-columns: repeat(2,minmax(0,1fr))
  }
  form {
    grid-template-columns: 1fr
  }
  .actions {
    flex-wrap: wrap
  }
  .chain-node-head {
    display: grid;
    gap: 7px
  }
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 2px
  }
  .explain-head {
    gap: 8px
  }
  .explain-head-actions {
    justify-content: space-between;
    order: -1
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
