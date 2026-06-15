Perfeito. Abaixo está uma primeira versão funcional para usar no Business Text / Dynamic Text.

A lógica será:

1 card = 1 jornada
entrada = lista bruta de monitores Datadog
JS = agrupa por tag tecnologia
chip = pior status daquela tecnologia
card = pior status geral da jornada
hover chip = lista de monitores daquela tecnologia
click card = abre dashboard Datadog em nova aba

O Business Text suporta Markdown, HTML, CSS, Handlebars e JavaScript, além de acesso aos dados via context nas versões mais novas. A opção Render Template deve ser usada como All rows para que o template receba todos os registros de uma vez.

1. Configuração recomendada do Business Text

No painel:

Plugin:
Business Text / Dynamic Text

Render Template:
All rows

Content:
HTML

Styles:
CSS

JavaScript:
After Content Ready

Panel title:
vazio ou nome da jornada

Transparent background:
opcional, eu recomendo ON

No padding:
se existir essa opção na sua versão, recomendo ON

Sanitize HTML:
pode manter habilitado inicialmente

O JavaScript do Business Text acessa os dados pelo objeto context, incluindo context.data, context.element e context.grafana.replaceVariables().

2. Variáveis recomendadas no dashboard

Eu criaria estas variáveis no Grafana:

jornada
dd_dashboard_url

Exemplo:

jornada = Pagamento
dd_dashboard_url = https://app.datadoghq.com/dashboard/abc-123

Se você preferir, pode deixar hardcoded no HTML de cada painel.

3. Query do painel

Cada card deve receber somente os monitores daquela jornada.

Exemplo conceitual:

tags:jornada:pagamento

Ou, se sua query já vier do banco/datasource:

WHERE tags LIKE '%jornada:pagamento%'

O importante é o painel receber uma tabela com campos parecidos com:

id
name
status ou overall_state
tags
monitor_url opcional

Exemplo de linha:

{
  "id": 123,
  "name": "Pagamento - API - Erro 5xx",
  "overall_state": "Alert",
  "tags": ["jornada:pagamento", "tecnologia:api", "env:prod"]
}
4. Content / HTML

Cole isso na área Content do Business Text:

<div
  class="fts-card-root"
  data-journey="${jornada}"
  data-datadog-url="${dd_dashboard_url}"
  data-subtitle="Fluxo de negócio"
>
  <div class="fts-card fts-status-loading" role="button" tabindex="0">
    <div class="fts-card-glow"></div>

    <div class="fts-card-header">
      <div class="fts-left">
        <div class="fts-icon-wrap" aria-hidden="true">
          <svg class="fts-icon" viewBox="0 0 24 24">
            <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"></path>
            <path d="M7 9h10"></path>
            <path d="M7 14h5"></path>
          </svg>
        </div>

        <div class="fts-title-area">
          <div class="fts-title js-journey-name">Jornada</div>
          <div class="fts-subtitle js-subtitle">Fluxo de negócio</div>
        </div>
      </div>

      <div class="fts-right">
        <div class="fts-badge js-overall-badge">
          <span class="fts-badge-icon">○</span>
          <span class="fts-badge-label">CARREGANDO</span>
        </div>

        <div class="fts-impact-line js-impact-line">
          <span class="fts-impact-dot"></span>
          <span>Carregando monitores</span>
        </div>
      </div>
    </div>

    <div class="fts-tech-list js-tech-list">
      <div class="fts-empty">Carregando tecnologias...</div>
    </div>
  </div>
</div>
5. CSS / Styles

Cole isso na área Styles:

:root {
  --fts-bg: #071018;
  --fts-card-bg: linear-gradient(135deg, rgba(17, 28, 39, 0.98), rgba(10, 17, 25, 0.98));
  --fts-border: rgba(148, 163, 184, 0.18);
  --fts-text: #f8fafc;
  --fts-muted: #94a3b8;

  --fts-ok: #42d96b;
  --fts-ok-rgb: 66, 217, 107;

  --fts-warning: #facc15;
  --fts-warning-rgb: 250, 204, 21;

  --fts-critical: #ff5148;
  --fts-critical-rgb: 255, 81, 72;

  --fts-unknown: #94a3b8;
  --fts-unknown-rgb: 148, 163, 184;
}

.fts-card-root {
  width: 100%;
  height: 100%;
  min-height: 150px;
  box-sizing: border-box;
  font-family:
    Inter,
    Roboto,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.fts-card-root * {
  box-sizing: border-box;
}

.fts-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 150px;
  padding: 18px 20px;
  overflow: visible;
  cursor: pointer;
  border-radius: 18px;
  border: 1px solid var(--fts-border);
  background: var(--fts-card-bg);
  color: var(--fts-text);
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.035);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.fts-card:hover {
  transform: translateY(-1px);
}

.fts-card:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.85);
  outline-offset: 3px;
}

.fts-card-glow {
  position: absolute;
  inset: -1px;
  z-index: 0;
  pointer-events: none;
  border-radius: 18px;
  opacity: 0.8;
}

.fts-card-header,
.fts-tech-list {
  position: relative;
  z-index: 1;
}

.fts-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.fts-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}

.fts-icon-wrap {
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(var(--status-rgb), 0.55);
  background:
    radial-gradient(circle at 50% 50%, rgba(var(--status-rgb), 0.22), rgba(var(--status-rgb), 0.05) 62%, transparent 72%);
  box-shadow:
    0 0 22px rgba(var(--status-rgb), 0.25),
    inset 0 0 18px rgba(var(--status-rgb), 0.08);
}

.fts-icon {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: rgb(var(--status-rgb));
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fts-title-area {
  min-width: 0;
}

.fts-title {
  overflow: hidden;
  max-width: 330px;
  color: #ffffff;
  font-size: clamp(21px, 1.75vw, 30px);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fts-subtitle {
  margin-top: 8px;
  color: var(--fts-muted);
  font-size: clamp(13px, 1vw, 16px);
  font-weight: 500;
}

.fts-right {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.fts-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  min-height: 44px;
  padding: 8px 15px;
  gap: 8px;
  border-radius: 11px;
  border: 1px solid rgba(var(--status-rgb), 0.75);
  background: rgba(var(--status-rgb), 0.14);
  color: rgb(var(--status-rgb));
  font-size: clamp(14px, 1vw, 18px);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  box-shadow:
    0 0 22px rgba(var(--status-rgb), 0.14),
    inset 0 0 16px rgba(var(--status-rgb), 0.05);
}

.fts-badge-icon {
  font-size: 18px;
  line-height: 1;
}

.fts-impact-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d1d5db;
  font-size: clamp(12px, 0.9vw, 15px);
  white-space: nowrap;
}

.fts-impact-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--status-rgb));
  box-shadow: 0 0 12px rgba(var(--status-rgb), 0.65);
}

.fts-tech-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.fts-tech-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  max-width: 170px;
  padding: 8px 13px;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.92));
  color: #e5e7eb;
  font-size: clamp(12px, 0.9vw, 15px);
  font-weight: 600;
  line-height: 1;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 6px 18px rgba(0, 0, 0, 0.18);
}

.fts-tech-chip:hover {
  z-index: 25;
  border-color: rgba(var(--chip-rgb), 0.8);
  box-shadow:
    0 0 20px rgba(var(--chip-rgb), 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.fts-tech-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
  background: rgb(var(--chip-rgb));
  box-shadow: 0 0 12px rgba(var(--chip-rgb), 0.65);
}

.fts-tech-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fts-tooltip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 12px);
  z-index: 40;
  width: min(360px, 80vw);
  max-height: 290px;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  padding: 12px;
  pointer-events: none;
  border-radius: 12px;
  border: 1px solid rgba(var(--chip-rgb), 0.65);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98));
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.45),
    0 0 26px rgba(var(--chip-rgb), 0.15);
  transform: translateY(7px);
  transition:
    opacity 140ms ease,
    visibility 140ms ease,
    transform 140ms ease;
}

.fts-tech-chip:hover .fts-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.fts-tooltip-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.fts-tooltip-count {
  color: var(--fts-muted);
  font-size: 11px;
  font-weight: 600;
}

.fts-tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-height: 210px;
  overflow: hidden;
}

.fts-tooltip-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.25;
}

.fts-tooltip-monitor-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fts-tooltip-status {
  color: var(--fts-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.fts-tooltip-more {
  margin-top: 8px;
  color: var(--fts-muted);
  font-size: 11px;
  font-weight: 600;
}

.fts-empty {
  width: 100%;
  padding: 10px 12px;
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 10px;
  color: var(--fts-muted);
  font-size: 13px;
}

.fts-status-ok {
  --status-rgb: var(--fts-ok-rgb);
  border-color: rgba(var(--fts-ok-rgb), 0.42);
}

.fts-status-ok .fts-card-glow {
  box-shadow:
    inset 4px 0 0 rgba(var(--fts-ok-rgb), 0.95),
    0 0 28px rgba(var(--fts-ok-rgb), 0.08);
}

.fts-status-warning {
  --status-rgb: var(--fts-warning-rgb);
  border-color: rgba(var(--fts-warning-rgb), 0.48);
}

.fts-status-warning .fts-card-glow {
  box-shadow:
    inset 4px 0 0 rgba(var(--fts-warning-rgb), 0.95),
    0 0 34px rgba(var(--fts-warning-rgb), 0.11);
}

.fts-status-critical {
  --status-rgb: var(--fts-critical-rgb);
  border-color: rgba(var(--fts-critical-rgb), 0.52);
}

.fts-status-critical .fts-card-glow {
  box-shadow:
    inset 4px 0 0 rgba(var(--fts-critical-rgb), 0.95),
    0 0 38px rgba(var(--fts-critical-rgb), 0.13);
}

.fts-status-unknown,
.fts-status-loading {
  --status-rgb: var(--fts-unknown-rgb);
}

.fts-chip-ok {
  --chip-rgb: var(--fts-ok-rgb);
}

.fts-chip-warning {
  --chip-rgb: var(--fts-warning-rgb);
}

.fts-chip-critical {
  --chip-rgb: var(--fts-critical-rgb);
}

.fts-chip-unknown {
  --chip-rgb: var(--fts-unknown-rgb);
}

@media (max-width: 720px) {
  .fts-card {
    padding: 16px;
  }

  .fts-card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .fts-right {
    align-items: flex-start;
  }

  .fts-badge {
    min-width: 112px;
  }

  .fts-tooltip {
    width: min(330px, 88vw);
  }
}
6. JavaScript / After Content Ready

Cole isso na área JavaScript > After Content Ready:

(() => {
  const CONFIG = {
    journeyName: context.grafana.replaceVariables("${jornada}") || "Jornada",
    datadogDashboardUrl: context.grafana.replaceVariables("${dd_dashboard_url}") || "",
    subtitle: "Fluxo de negócio",
    maxMonitorsInTooltip: 8,
    technologyTagPrefix: "tecnologia:",
    openInNewTab: true,
  };

  const STATUS_WEIGHT = {
    ok: 1,
    warning: 2,
    critical: 3,
    unknown: 0,
  };

  const STATUS_LABEL = {
    ok: "OK",
    warning: "ATENÇÃO",
    critical: "CRÍTICO",
    unknown: "INDEFINIDO",
  };

  const STATUS_ICON = {
    ok: "✓",
    warning: "⚠",
    critical: "!",
    unknown: "?",
  };

  const STATUS_CLASS = {
    ok: "fts-status-ok",
    warning: "fts-status-warning",
    critical: "fts-status-critical",
    unknown: "fts-status-unknown",
  };

  const CHIP_CLASS = {
    ok: "fts-chip-ok",
    warning: "fts-chip-warning",
    critical: "fts-chip-critical",
    unknown: "fts-chip-unknown",
  };

  const root = context.element.querySelector(".fts-card-root");

  if (!root) {
    return;
  }

  const card = root.querySelector(".fts-card");
  const journeyNameEl = root.querySelector(".js-journey-name");
  const subtitleEl = root.querySelector(".js-subtitle");
  const badgeEl = root.querySelector(".js-overall-badge");
  const badgeIconEl = root.querySelector(".fts-badge-icon");
  const badgeLabelEl = root.querySelector(".fts-badge-label");
  const impactLineEl = root.querySelector(".js-impact-line");
  const techListEl = root.querySelector(".js-tech-list");

  const journeyName =
    root.dataset.journey && root.dataset.journey !== "${jornada}"
      ? root.dataset.journey
      : CONFIG.journeyName;

  const datadogUrl =
    root.dataset.datadogUrl && root.dataset.datadogUrl !== "${dd_dashboard_url}"
      ? root.dataset.datadogUrl
      : CONFIG.datadogDashboardUrl;

  const subtitle = root.dataset.subtitle || CONFIG.subtitle;

  journeyNameEl.textContent = normalizeDisplayText(journeyName || "Jornada");
  subtitleEl.textContent = subtitle;

  const monitors = getRowsFromBusinessTextContext(context).map(normalizeMonitor);

  const validMonitors = monitors.filter((monitor) => {
    return monitor.name || monitor.id || monitor.tags.length > 0;
  });

  const groupedByTech = groupMonitorsByTechnology(validMonitors);
  const technologies = buildTechnologySummary(groupedByTech);
  const overallStatus = getWorstStatus(technologies.map((tech) => tech.status));

  renderCardStatus(overallStatus, validMonitors);
  renderTechnologyChips(technologies);

  setupCardClick(datadogUrl);

  function getRowsFromBusinessTextContext(context) {
    if (Array.isArray(context.data)) {
      return context.data;
    }

    if (context.data && Array.isArray(context.data.data)) {
      return context.data.data;
    }

    const series = context?.panel?.panelData?.series || context?.panelData?.series || [];

    return series.flatMap((frame) => {
      const fields = frame.fields || [];
      const rowCount = fields[0]?.values?.length || 0;
      const rows = [];

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const row = {};

        fields.forEach((field) => {
          row[field.name] = getFieldValue(field.values, rowIndex);
        });

        rows.push(row);
      }

      return rows;
    });
  }

  function getFieldValue(values, index) {
    if (!values) {
      return undefined;
    }

    if (typeof values.get === "function") {
      return values.get(index);
    }

    return values[index];
  }

  function normalizeMonitor(row) {
    const raw = parseMaybeJson(
      pickField(row, [
        "raw_json",
        "raw",
        "monitor",
        "monitor_json",
        "json",
      ])
    );

    const merged = {
      ...(isObject(raw) ? raw : {}),
      ...(isObject(row) ? row : {}),
    };

    const tags = normalizeTags(
      pickField(merged, [
        "tags",
        "Tags",
        "tag",
        "monitor_tags",
        "Monitor Tags",
      ])
    );

    const status = normalizeStatus(
      pickField(merged, [
        "overall_state",
        "overallState",
        "status",
        "Status",
        "state",
        "State",
      ])
    );

    return {
      id: pickField(merged, ["id", "ID", "monitor_id", "monitorId"]) || "",
      name:
        pickField(merged, ["name", "Name", "monitor_name", "monitorName", "title"]) ||
        "Monitor sem nome",
      status,
      originalStatus:
        pickField(merged, [
          "overall_state",
          "overallState",
          "status",
          "Status",
          "state",
          "State",
        ]) || "",
      tags,
      url:
        pickField(merged, [
          "monitor_url",
          "monitorUrl",
          "url",
          "URL",
          "link",
        ]) || "",
      raw: merged,
    };
  }

  function pickField(obj, candidates) {
    if (!isObject(obj)) {
      return undefined;
    }

    for (const name of candidates) {
      if (Object.prototype.hasOwnProperty.call(obj, name)) {
        return obj[name];
      }
    }

    return undefined;
  }

  function parseMaybeJson(value) {
    if (!value) {
      return value;
    }

    if (isObject(value) || Array.isArray(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeTags(tagsValue) {
    if (!tagsValue) {
      return [];
    }

    if (Array.isArray(tagsValue)) {
      return tagsValue.map(String).map((tag) => tag.trim()).filter(Boolean);
    }

    if (typeof tagsValue === "string") {
      const parsed = parseMaybeJson(tagsValue);

      if (Array.isArray(parsed)) {
        return parsed.map(String).map((tag) => tag.trim()).filter(Boolean);
      }

      return tagsValue
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function normalizeStatus(status) {
    const value = String(status || "").trim().toLowerCase();

    if (
      [
        "alert",
        "critical",
        "crit",
        "crítico",
        "critico",
        "error",
        "down",
      ].includes(value)
    ) {
      return "critical";
    }

    if (
      [
        "warn",
        "warning",
        "atenção",
        "atencao",
        "degraded",
        "degradado",
      ].includes(value)
    ) {
      return "warning";
    }

    if (["ok", "normal", "up", "resolved"].includes(value)) {
      return "ok";
    }

    return "unknown";
  }

  function groupMonitorsByTechnology(monitors) {
    const groups = new Map();

    monitors.forEach((monitor) => {
      const technology = extractTechnology(monitor.tags);

      if (!groups.has(technology)) {
        groups.set(technology, []);
      }

      groups.get(technology).push(monitor);
    });

    return groups;
  }

  function extractTechnology(tags) {
    const prefix = CONFIG.technologyTagPrefix.toLowerCase();

    const techTag = tags.find((tag) => {
      return String(tag).toLowerCase().startsWith(prefix);
    });

    if (!techTag) {
      return "sem-tecnologia";
    }

    const value = techTag.slice(CONFIG.technologyTagPrefix.length).trim();

    return value || "sem-tecnologia";
  }

  function buildTechnologySummary(groupedByTech) {
    const technologies = [];

    groupedByTech.forEach((monitors, technologyKey) => {
      const status = getWorstStatus(monitors.map((monitor) => monitor.status));

      const sortedMonitors = [...monitors].sort((a, b) => {
        return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
      });

      technologies.push({
        key: technologyKey,
        label: formatTechnologyLabel(technologyKey),
        status,
        monitors: sortedMonitors,
      });
    });

    return technologies.sort((a, b) => {
      const bySeverity = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];

      if (bySeverity !== 0) {
        return bySeverity;
      }

      return a.label.localeCompare(b.label, "pt-BR");
    });
  }

  function getWorstStatus(statuses) {
    if (!statuses || statuses.length === 0) {
      return "unknown";
    }

    return statuses.reduce((worst, current) => {
      return STATUS_WEIGHT[current] > STATUS_WEIGHT[worst] ? current : worst;
    }, "unknown");
  }

  function renderCardStatus(status, monitors) {
    const activeCritical = monitors.filter((monitor) => monitor.status === "critical").length;
    const activeWarning = monitors.filter((monitor) => monitor.status === "warning").length;

    card.classList.remove(
      "fts-status-loading",
      "fts-status-ok",
      "fts-status-warning",
      "fts-status-critical",
      "fts-status-unknown"
    );

    card.classList.add(STATUS_CLASS[status] || STATUS_CLASS.unknown);

    badgeIconEl.textContent = STATUS_ICON[status] || STATUS_ICON.unknown;
    badgeLabelEl.textContent = STATUS_LABEL[status] || STATUS_LABEL.unknown;

    const impactText = getImpactText(status, activeCritical, activeWarning, monitors.length);

    impactLineEl.innerHTML = `
      <span class="fts-impact-dot"></span>
      <span>${escapeHtml(impactText)}</span>
    `;
  }

  function getImpactText(status, criticalCount, warningCount, totalCount) {
    if (totalCount === 0) {
      return "Sem monitores retornados";
    }

    if (status === "critical") {
      return criticalCount === 1 ? "1 alerta crítico" : `${criticalCount} alertas críticos`;
    }

    if (status === "warning") {
      return warningCount === 1 ? "1 alerta em atenção" : `${warningCount} alertas em atenção`;
    }

    if (status === "ok") {
      return "Sem impacto";
    }

    return "Status indefinido";
  }

  function renderTechnologyChips(technologies) {
    if (!technologies.length) {
      techListEl.innerHTML = `
        <div class="fts-empty">
          Nenhuma tecnologia encontrada. Verifique a tag <strong>tecnologia:&lt;valor&gt;</strong>.
        </div>
      `;
      return;
    }

    techListEl.innerHTML = technologies
      .map((technology) => {
        const tooltip = buildTooltipHtml(technology);

        return `
          <div
            class="fts-tech-chip ${CHIP_CLASS[technology.status] || CHIP_CLASS.unknown}"
            title="${escapeHtml(buildNativeTitle(technology))}"
          >
            <span class="fts-tech-dot"></span>
            <span class="fts-tech-label">${escapeHtml(technology.label)}</span>
            ${tooltip}
          </div>
        `;
      })
      .join("");
  }

  function buildTooltipHtml(technology) {
    const monitors = technology.monitors.slice(0, CONFIG.maxMonitorsInTooltip);
    const hiddenCount = Math.max(technology.monitors.length - monitors.length, 0);

    const rows = monitors
      .map((monitor) => {
        return `
          <div class="fts-tooltip-item">
            <span class="fts-tech-dot ${CHIP_CLASS[monitor.status] || CHIP_CLASS.unknown}"></span>
            <span class="fts-tooltip-monitor-name">${escapeHtml(monitor.name)}</span>
            <span class="fts-tooltip-status">${escapeHtml(STATUS_LABEL[monitor.status] || "N/A")}</span>
          </div>
        `;
      })
      .join("");

    return `
      <div class="fts-tooltip">
        <div class="fts-tooltip-title">
          <span>${escapeHtml(technology.label)}</span>
          <span class="fts-tooltip-count">${technology.monitors.length} monitor(es)</span>
        </div>
        <div class="fts-tooltip-list">
          ${rows}
        </div>
        ${
          hiddenCount > 0
            ? `<div class="fts-tooltip-more">+ ${hiddenCount} monitor(es)</div>`
            : ""
        }
      </div>
    `;
  }

  function buildNativeTitle(technology) {
    const lines = [
      technology.label,
      "",
      ...technology.monitors.map((monitor) => {
        return `${STATUS_LABEL[monitor.status] || "N/A"} - ${monitor.name}`;
      }),
    ];

    return lines.join("\n");
  }

  function setupCardClick(url) {
    if (!url || url === "${dd_dashboard_url}") {
      card.style.cursor = "default";
      return;
    }

    card.addEventListener("click", () => {
      if (CONFIG.openInNewTab) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  }

  function formatTechnologyLabel(value) {
    const normalized = String(value || "").trim();

    const knownLabels = {
      api: "API",
      banco: "Banco",
      database: "Banco",
      db: "Banco",
      fila: "Fila",
      queue: "Fila",
      mensageria: "Mensageria",
      messaging: "Mensageria",
      job: "Job",
      jobs: "Jobs",
      batch: "Batch",
      cache: "Cache",
      integracao: "Integração",
      integracoes: "Integrações",
      integration: "Integração",
      integrations: "Integrações",
      frontend: "Frontend",
      canal: "Canal",
      core: "Core",
      "sem-tecnologia": "Sem tecnologia",
    };

    const key = normalized
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (knownLabels[key]) {
      return knownLabels[key];
    }

    return normalized
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function normalizeDisplayText(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
7. Default Content

Na opção de Default Content, use algo simples:

<div class="fts-empty">
  Nenhum monitor retornado para esta jornada.
</div>
8. Como montar vários cards no dashboard
Opção manual

Você cria um painel por jornada:

Card 1:
jornada = Pagamento
dd_dashboard_url = dashboard Datadog de Pagamento

Card 2:
jornada = Cadastro
dd_dashboard_url = dashboard Datadog de Cadastro

Card 3:
jornada = Consulta
dd_dashboard_url = dashboard Datadog de Consulta

Em cada painel, a query filtra a respectiva jornada.

Opção com repeat panel

Você cria uma variável:

jornada

Com valores:

Pagamento
Cadastro
Consulta
Onboarding
Pix
Extrato

Depois usa repeat panel por jornada.

Nesse caso, o painel Business Text usa:

${jornada}

E a query também usa:

jornada:${jornada}

Para o link do Datadog por jornada, existem três caminhos:

1. hardcoded em uma coluna retornada pela query
2. variável custom no Grafana
3. mapeamento dentro do JavaScript

Eu prefiro o caminho 1: a query já retornar datadog_dashboard_url.

9. Pequeno ajuste se o link vier pela query

Se o link do Datadog vier como campo da query, por exemplo:

datadog_dashboard_url

Você pode alterar este trecho:

const datadogUrl =
  root.dataset.datadogUrl && root.dataset.datadogUrl !== "${dd_dashboard_url}"
    ? root.dataset.datadogUrl
    : CONFIG.datadogDashboardUrl;

Para:

const datadogUrl =
  validMonitors[0]?.raw?.datadog_dashboard_url ||
  root.dataset.datadogUrl ||
  CONFIG.datadogDashboardUrl;

Mas, para a primeira versão, eu manteria a URL via variável ou hardcoded por painel.

10. Observação importante sobre HTML sanitization

Se algum elemento ou comportamento não aparecer corretamente, valide a configuração de sanitização do Grafana. A documentação informa que a sanitização de HTML é habilitada por padrão e que pode bloquear alguns elementos; em Docker/Compose, o parâmetro citado é GF_PANELS_DISABLE_SANITIZE_HTML=true.

Como esta versão usa o JavaScript na área própria do plugin, e não inline dentro do HTML, a tendência é funcionar sem mexer nisso.