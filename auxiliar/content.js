(() => {
  const CONFIG = {
    journeyName: context.grafana.replaceVariables("${jornada}") || "Pagamento",
    datadogDashboardUrl: context.grafana.replaceVariables("${dd_dashboard_url}") || "",
    maxMonitorsInTooltip: 8,
    technologyTagPrefix: "tecnologia:",
  };

  const STATUS_WEIGHT = {
    unknown: 0,
    ok: 1,
    warning: 2,
    critical: 3,
  };

  const STATUS_LABEL = {
    ok: "OK",
    warning: "ATENÇÃO",
    critical: "CRÍTICO",
    unknown: "INDEFINIDO",
  };

  const STATUS_ICON = {
    ok: "✓",
    warning: "!",
    critical: "!",
    unknown: "?",
  };

  const root = context.element.querySelector(".ftsj-root");
  if (!root) return;

  const card = root.querySelector(".ftsj-card");
  const journeyEl = root.querySelector('[data-role="journey-name"]');
  const badgeEl = root.querySelector('[data-role="overall-badge"]');
  const badgeIconEl = root.querySelector(".ftsj-badge-icon");
  const badgeLabelEl = root.querySelector(".ftsj-badge-label");
  const impactTextEl = root.querySelector('[data-role="impact-text"]');
  const techListEl = root.querySelector('[data-role="tech-list"]');

  const rows = getRows();
  const monitors = rows.map(normalizeMonitor).filter((monitor) => {
    return monitor.name || monitor.id || monitor.tags.length > 0;
  });

  const journeyFromData = getJourneyNameFromData(monitors);
  const journeyName = journeyFromData || CONFIG.journeyName || "Jornada";

  journeyEl.textContent = formatJourneyName(journeyName);

  const technologies = summarizeByTechnology(monitors);
  const overallStatus = getWorstStatus(technologies.map((tech) => tech.status));

  applyOverallStatus(overallStatus, monitors);
  renderTechnologyChips(technologies);
  setupCardClick(monitors);

  function getRows() {
    const series =
      context?.panel?.data?.series ||
      context?.panelData?.series ||
      context?.data?.series ||
      [];

    const rows = [];

    series.forEach((frame) => {
      const fields = frame.fields || [];
      const rowCount = fields[0]?.values?.length || 0;

      for (let i = 0; i < rowCount; i++) {
        const row = {};

        fields.forEach((field) => {
          row[field.name] = readValue(field.values, i);
        });

        rows.push(row);
      }
    });

    if (!rows.length && Array.isArray(context.data)) {
      return context.data;
    }

    return rows;
  }

  function readValue(values, index) {
    if (!values) return undefined;
    if (typeof values.get === "function") return values.get(index);
    return values[index];
  }

  function normalizeMonitor(row) {
    const rawJson = parseMaybeJson(pick(row, ["raw_json", "raw", "monitor", "json"]));
    const data = {
      ...(isObject(rawJson) ? rawJson : {}),
      ...(isObject(row) ? row : {}),
    };

    const tags = normalizeTags(pick(data, ["tags", "Tags", "tag", "monitor_tags"]));

    return {
      id: pick(data, ["id", "ID", "monitor_id", "monitorId"]) || "",
      name: pick(data, ["name", "Name", "monitor_name", "monitorName", "title"]) || "Monitor sem nome",
      status: normalizeStatus(pick(data, ["overall_state", "overallState", "status", "Status", "state", "State"])),
      originalStatus: pick(data, ["overall_state", "overallState", "status", "Status", "state", "State"]) || "",
      tags,
      monitorUrl: pick(data, ["monitor_url", "monitorUrl", "url", "URL", "link"]) || "",
      datadogDashboardUrl: pick(data, ["datadog_dashboard_url", "datadogDashboardUrl", "dashboard_url"]) || "",
      jornada: pick(data, ["jornada", "Jornada", "journey"]) || extractTagValue(tags, "jornada:") || "",
      raw: data,
    };
  }

  function pick(obj, keys) {
    if (!isObject(obj)) return undefined;

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      }
    }

    return undefined;
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function parseMaybeJson(value) {
    if (!value) return value;
    if (Array.isArray(value) || isObject(value)) return value;
    if (typeof value !== "string") return value;

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

  function normalizeTags(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map(String).map((tag) => tag.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      const parsed = parseMaybeJson(value);

      if (Array.isArray(parsed)) {
        return parsed.map(String).map((tag) => tag.trim()).filter(Boolean);
      }

      return value
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function normalizeStatus(status) {
    const value = String(status || "").trim().toLowerCase();

    if (["alert", "critical", "crit", "crítico", "critico", "error", "down"].includes(value)) {
      return "critical";
    }

    if (["warn", "warning", "atenção", "atencao", "degraded", "degradado"].includes(value)) {
      return "warning";
    }

    if (["ok", "normal", "up", "resolved"].includes(value)) {
      return "ok";
    }

    return "unknown";
  }

  function summarizeByTechnology(monitors) {
    const groups = new Map();

    monitors.forEach((monitor) => {
      const technology = extractTagValue(monitor.tags, CONFIG.technologyTagPrefix) || "sem-tecnologia";

      if (!groups.has(technology)) {
        groups.set(technology, []);
      }

      groups.get(technology).push(monitor);
    });

    const technologies = [];

    groups.forEach((groupMonitors, technology) => {
      const status = getWorstStatus(groupMonitors.map((monitor) => monitor.status));

      technologies.push({
        technology,
        label: formatTechnologyLabel(technology),
        status,
        monitors: groupMonitors.sort((a, b) => {
          return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
        }),
      });
    });

    return technologies.sort((a, b) => {
      const byStatus = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];

      if (byStatus !== 0) return byStatus;

      return a.label.localeCompare(b.label, "pt-BR");
    });
  }

  function extractTagValue(tags, prefix) {
    const normalizedPrefix = String(prefix).toLowerCase();

    const found = tags.find((tag) => {
      return String(tag).toLowerCase().startsWith(normalizedPrefix);
    });

    if (!found) return "";

    return String(found).slice(prefix.length).trim();
  }

  function getWorstStatus(statuses) {
    if (!statuses.length) return "unknown";

    return statuses.reduce((worst, current) => {
      return STATUS_WEIGHT[current] > STATUS_WEIGHT[worst] ? current : worst;
    }, "unknown");
  }

  function getJourneyNameFromData(monitors) {
    const first = monitors.find((monitor) => monitor.jornada);
    return first?.jornada || "";
  }

  function applyOverallStatus(status, monitors) {
    card.classList.remove(
      "ftsj-status-ok",
      "ftsj-status-warning",
      "ftsj-status-critical",
      "ftsj-status-unknown"
    );

    card.classList.add(`ftsj-status-${status}`);

    badgeIconEl.textContent = STATUS_ICON[status] || "?";
    badgeLabelEl.textContent = STATUS_LABEL[status] || "INDEFINIDO";

    const criticalCount = monitors.filter((monitor) => monitor.status === "critical").length;
    const warningCount = monitors.filter((monitor) => monitor.status === "warning").length;

    if (!monitors.length) {
      impactTextEl.textContent = "Sem monitores";
      return;
    }

    if (status === "critical") {
      impactTextEl.textContent =
        criticalCount === 1 ? "1 alerta crítico" : `${criticalCount} alertas críticos`;
      return;
    }

    if (status === "warning") {
      impactTextEl.textContent =
        warningCount === 1 ? "1 alerta ativo" : `${warningCount} alertas ativos`;
      return;
    }

    if (status === "ok") {
      impactTextEl.textContent = "Sem impacto";
      return;
    }

    impactTextEl.textContent = "Status indefinido";
  }

  function renderTechnologyChips(technologies) {
    if (!technologies.length) {
      techListEl.innerHTML = `
        <div class="ftsj-chip ftsj-chip-unknown">
          <span class="ftsj-chip-dot"></span>
          <span>Sem tecnologia</span>
        </div>
      `;
      return;
    }

    techListEl.innerHTML = technologies.map((tech) => {
      return `
        <div class="ftsj-chip ftsj-chip-${tech.status}">
          <span class="ftsj-chip-dot"></span>
          <span>${escapeHtml(tech.label)}</span>
          ${renderTooltip(tech)}
        </div>
      `;
    }).join("");
  }

  function renderTooltip(tech) {
    const visibleMonitors = tech.monitors.slice(0, CONFIG.maxMonitorsInTooltip);
    const hiddenCount = Math.max(tech.monitors.length - visibleMonitors.length, 0);

    const monitorRows = visibleMonitors.map((monitor) => {
      return `
        <div class="ftsj-tooltip-item ftsj-row-${monitor.status}">
          <span class="ftsj-chip-dot"></span>
          <span class="ftsj-tooltip-monitor">${escapeHtml(monitor.name)}</span>
          <span class="ftsj-tooltip-status">${escapeHtml(STATUS_LABEL[monitor.status] || "N/A")}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="ftsj-tooltip">
        <div class="ftsj-tooltip-title">
          <span>${escapeHtml(tech.label)}</span>
          <span class="ftsj-tooltip-count">${tech.monitors.length} monitor(es)</span>
        </div>

        <div class="ftsj-tooltip-list">
          ${monitorRows}
        </div>

        ${
          hiddenCount > 0
            ? `<div class="ftsj-tooltip-more">+ ${hiddenCount} monitor(es)</div>`
            : ""
        }
      </div>
    `;
  }

  function setupCardClick(monitors) {
    const url =
      CONFIG.datadogDashboardUrl ||
      monitors.find((monitor) => monitor.datadogDashboardUrl)?.datadogDashboardUrl ||
      "";

    if (!url || url.includes("${")) {
      card.style.cursor = "default";
      return;
    }

    card.addEventListener("click", () => {
      window.open(url, "_blank", "noopener,noreferrer");
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  }

  function formatTechnologyLabel(value) {
    const clean = String(value || "")
      .trim()
      .replace(/[-_]/g, " ");

    const key = clean
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const map = {
      api: "API",
      banco: "Banco",
      db: "Banco",
      database: "Banco",
      fila: "Fila",
      queue: "Fila",
      job: "Job",
      jobs: "Jobs",
      cache: "Cache",
      mensageria: "Mensageria",
      integracao: "Integração",
      integracoes: "Integrações",
      integration: "Integração",
      frontend: "Frontend",
      canal: "Canal",
      core: "Core",
      "sem tecnologia": "Sem tecnologia",
    };

    if (map[key]) return map[key];

    return clean.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatJourneyName(value) {
    return String(value || "Jornada")
      .trim()
      .replace(/[-_]/g, " ")
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