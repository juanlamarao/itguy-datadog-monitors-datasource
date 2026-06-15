(() => {
  /*
   * ============================================================
   * CONFIGURAÇÕES DO WIDGET
   * Altere somente este bloco em cada card.
   * ============================================================
   */
  const CONFIG = {
    journeyName: "Pagamento",
    subtitle: "Fluxo de negócio",

    applicationUrl: "https://app.datadoghq.com/dashboard/pagamento-fts",
    infrastructureUrl: "https://seu-link-de-infraestrutura-aqui",

    /*
     * iconType:
     * - "svg"      => usa ícone interno pelo iconName
     * - "emoji"    => usa emoji/texto definido em iconName
     * - "external" => usa imagem externa definida em externalIconUrl
     */
    iconType: "svg",
    iconName: "payment",
    externalIconUrl: "",

    maxEventsInTooltip: 2,

    technologyTagPrefix: "tecnologia:",

    /*
     * RefIds esperados das queries.
     * Recomendo renomear as queries para datadog e zabbix.
     * Também deixei A e B como fallback.
     */
    datadogRefIds: ["datadog", "a"],
    zabbixRefIds: ["zabbix", "b"],

    /*
     * infraMode:
     * - "auto"   => mostra Infra somente se existir query/frame Zabbix
     * - "always" => sempre mostra Infra, mesmo sem query Zabbix
     * - "never"  => nunca mostra Infra
     */
    infraMode: "auto",
  };

/*exemplo
  const CONFIG = {
    journeyName: "Pagamento",
    subtitle: "Fluxo de negócio",
    applicationUrl: "https://app.datadoghq.com/dashboard/pagamento-fts",
    infrastructureUrl: "https://seu-link-de-infraestrutura-aqui",
  
    // exemplo de icones existentes: default, api, rocket, document, pix, search, user, payment
    iconType: "svg",        // "emoji"   // "external"
    iconName: "payment",    // "💳"     // ""
    externalIconUrl: "",    // ""       // "https://site.com/icone.svg"
  
    maxEventsInTooltip: 2,
    technologyTagPrefix: "tecnologia:",
  
    datadogRefIds: ["datadog", "a"],
    zabbixRefIds: ["zabbix", "b"],
  
    infraMode: "auto",
  };
*/

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
  const subtitleEl = root.querySelector('[data-role="journey-subtitle"]');
  const badgeIconEl = root.querySelector(".ftsj-badge-icon");
  const badgeLabelEl = root.querySelector(".ftsj-badge-label");
  const impactTextEl = root.querySelector('[data-role="impact-text"]');
  const techListEl = root.querySelector('[data-role="tech-list"]');

  renderJourneyBaseInfo();
  renderJourneyIcon();

  const frames = getFrames();
  const rows = getRows(frames);

  const events = rows
    .map(normalizeEvent)
    .filter((event) => event !== null);

  const datadogEvents = events.filter((event) => event.source === "datadog");
  const zabbixEvents = events.filter((event) => event.source === "zabbix");

  const technologies = summarizeDatadogByTechnology(datadogEvents);

  if (shouldShowInfra(zabbixEvents)) {
    technologies.push(buildInfraTechnology(zabbixEvents));
  }

  technologies.sort((a, b) => {
    const byStatus = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];

    if (byStatus !== 0) {
      return byStatus;
    }

    return a.label.localeCompare(b.label, "pt-BR");
  });

  const overallStatus = getWorstStatus(technologies.map((tech) => tech.status));

  applyOverallStatus(overallStatus, technologies, events);
  renderTechnologyChips(technologies);
//   setupCardClick();
  renderActionIcons();

  /*
   * ============================================================
   * Renderização base
   * ============================================================
   */
  function renderJourneyBaseInfo() {
    journeyEl.textContent = formatDisplayName(CONFIG.journeyName || "Jornada");

    if (subtitleEl) {
      subtitleEl.textContent = CONFIG.subtitle || "Fluxo de negócio";
    }
  }

  function renderJourneyIcon() {
    const iconEl = root.querySelector('[data-role="journey-icon"]');

    if (!iconEl) return;

    if (CONFIG.iconType === "external" && CONFIG.externalIconUrl) {
      iconEl.innerHTML = `
        <img
          class="ftsj-external-icon"
          src="${escapeHtml(CONFIG.externalIconUrl)}"
          alt=""
        />
      `;
      return;
    }

    if (CONFIG.iconType === "emoji" && CONFIG.iconName) {
      iconEl.innerHTML = `
        <span class="ftsj-emoji-icon">${escapeHtml(CONFIG.iconName)}</span>
      `;
      return;
    }

    iconEl.innerHTML = getSvgIcon(CONFIG.iconName);
  }

  function renderActionIcons() {
    const actionIconsEl = root.querySelector('[data-role="action-icons"]');
  
    if (!actionIconsEl) {
      return;
    }
  
    const actions = [];
  
    if (CONFIG.infrastructureUrl) {
      actions.push({
        type: "infra",
        label: "Infraestrutura",
        url: CONFIG.infrastructureUrl,
        icon: getActionIcon("server"),
      });
    }
  
    if (CONFIG.applicationUrl) {
      actions.push({
        type: "app",
        label: "Aplicação",
        url: CONFIG.applicationUrl,
        icon: getActionIcon("api"),
      });
    }
  
    if (!actions.length) {
      actionIconsEl.innerHTML = "";
      return;
    }
  
    actionIconsEl.innerHTML = actions
      .map((action, index) => {
        return `
          <div
            class="ftsj-action ftsj-action-${escapeHtml(action.type)}"
            data-action-index="${index}"
            role="button"
            tabindex="0"
            aria-label="${escapeHtml(action.label)}"
          >
            ${action.icon}
            <div class="ftsj-action-tooltip">${escapeHtml(action.label)}</div>
          </div>
        `;
      })
      .join("");
  
    actionIconsEl.querySelectorAll("[data-action-index]").forEach((actionEl) => {
      const index = Number(actionEl.dataset.actionIndex);
      const action = actions[index];
  
      actionEl.addEventListener("click", (event) => {
        event.stopPropagation();
        openUrl(action.url);
      });
  
      actionEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openUrl(action.url);
        }
      });
    });
  }

  /*
   * ============================================================
   * Leitura de dados do Grafana
   * ============================================================
   */
  function getFrames() {
    return (
      context?.panelData?.series ||
      context?.panel?.data?.series ||
      context?.panel?.panelData?.series ||
      context?.data?.series ||
      []
    );
  }

  function getRows(frames) {
    const rows = [];

    frames.forEach((frame) => {
      const fields = frame.fields || [];
      const rowCount = getFrameRowCount(fields);

      for (let i = 0; i < rowCount; i++) {
        const row = {};

        fields.forEach((field) => {
          row[field.name] = readValue(field.values, i);
        });

        rows.push(row);
      }
    });

    return rows;
  }

  function getFrameRowCount(fields) {
    if (!fields || !fields.length) return 0;

    const firstValues = fields[0]?.values;

    if (!firstValues) return 0;

    if (typeof firstValues.length === "number") {
      return firstValues.length;
    }

    if (typeof firstValues.toArray === "function") {
      return firstValues.toArray().length;
    }

    return 0;
  }

  function readValue(values, index) {
    if (!values) return undefined;

    if (typeof values.get === "function") {
      return values.get(index);
    }

    return values[index];
  }

  /*
   * ============================================================
   * Normalização dos eventos
   * ============================================================
   */
  function normalizeEvent(row) {
    const rawJson = parseMaybeJson(
      pick(row, [
        "raw_json",
        "raw",
        "monitor",
        "json",
        "value",
        "Value",
        "data",
        "Data",
        "result",
        "Result",
        "body",
        "Body",
        "payload",
        "Payload",
      ])
    );

    const data = {
      ...(isObject(rawJson) ? rawJson : {}),
      ...(isObject(row) ? row : {}),
    };

    const source = detectSource(data);

    if (!source) {
      if (CONFIG.debugUnmatchedRows) {
        console.log("[FTS Journey Card] Linha ignorada: source não identificado", data);
      }

      return null;
    }

    const tags = normalizeTags(pick(data, ["tags", "Tags", "tag", "monitor_tags"]));

    const status =
      source === "zabbix"
        ? normalizeZabbixSeverity(pick(data, ["severity", "Severity"]))
        : normalizeDatadogStatus(
            pick(data, ["status", "Status", "overall_state", "overallState"])
          );

    return {
      source,
      id: pick(data, ["id", "ID"]) || "",
      triggerid: pick(data, ["triggerid", "triggerId", "TriggerID", "TRIGGERID"]) || "",
      name: pick(data, ["name", "Name"]) || "Evento sem nome",
      status,
      originalStatus:
        source === "zabbix"
          ? pick(data, ["severity", "Severity"]) || ""
          : pick(data, ["status", "Status", "overall_state", "overallState"]) || "",
      severity: pick(data, ["severity", "Severity"]) || "",
      tags,
      raw: data,
    };
  }

  function detectSource(data) {
    const sourceValue = String(pick(data, ["source", "Source"]) || "")
      .trim()
      .toLowerCase();

    if (sourceValue === "datadog") {
      return "datadog";
    }

    const triggerid = pick(data, [
      "triggerid",
      "triggerId",
      "TriggerID",
      "TRIGGERID",
    ]);

    if (isNumericTriggerId(triggerid)) {
      return "zabbix";
    }

    return "";
  }

  function isNumericTriggerId(value) {
    if (value === null || value === undefined) {
      return false;
    }

    const text = String(value).trim();

    if (text === "") {
      return false;
    }

    return /^[0-9]+$/.test(text);
  }

  function normalizeDatadogStatus(status) {
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

  function normalizeZabbixSeverity(severity) {
    const value = String(severity || "").trim();

    if (["5", "4"].includes(value)) {
      return "critical";
    }

    if (["3", "2"].includes(value)) {
      return "warning";
    }

    return "ok";
  }

  /*
   * ============================================================
   * Consolidação
   * ============================================================
   */
  function summarizeDatadogByTechnology(events) {
    const groups = new Map();

    events.forEach((event) => {
      const technology =
        extractTagValue(event.tags, CONFIG.technologyTagPrefix) || "sem-tecnologia";

      if (!groups.has(technology)) {
        groups.set(technology, []);
      }

      groups.get(technology).push(event);
    });

    const technologies = [];

    groups.forEach((groupEvents, technology) => {
      const status = getWorstStatus(groupEvents.map((event) => event.status));

      technologies.push({
        technology,
        label: formatTechnologyLabel(technology),
        status,
        events: groupEvents.sort((a, b) => {
          return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
        }),
      });
    });

    return technologies;
  }

  function buildInfraTechnology(zabbixEvents) {
    const realEvents = zabbixEvents.filter((event) => {
      return event.name && event.name !== "Evento sem nome";
    });

    const status = realEvents.length
      ? getWorstStatus(realEvents.map((event) => event.status))
      : "ok";

    const sortedEvents = [...realEvents].sort((a, b) => {
      return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
    });

    return {
      technology: "infra",
      label: "Infra",
      status,
      events: sortedEvents.length
        ? sortedEvents
        : [
            {
              name: "Sem alertas ativos de infraestrutura",
              status: "ok",
              source: "zabbix",
              severity: "",
              tags: [],
            },
          ],
    };
  }

  function shouldShowInfra(zabbixEvents) {
    if (CONFIG.infraMode === "always") {
      return true;
    }

    if (CONFIG.infraMode === "never") {
      return false;
    }

    return zabbixEvents.length > 0;
  }

  function getWorstStatus(statuses) {
    if (!statuses || !statuses.length) {
      return "unknown";
    }

    return statuses.reduce((worst, current) => {
      return STATUS_WEIGHT[current] > STATUS_WEIGHT[worst] ? current : worst;
    }, "unknown");
  }

  /*
   * ============================================================
   * Renderização do card
   * ============================================================
   */
  function applyOverallStatus(status, technologies, events) {
    card.classList.remove(
      "ftsj-status-ok",
      "ftsj-status-warning",
      "ftsj-status-critical",
      "ftsj-status-unknown"
    );

    card.classList.add(`ftsj-status-${status}`);

    badgeIconEl.textContent = STATUS_ICON[status] || "?";
    badgeLabelEl.textContent = STATUS_LABEL[status] || "INDEFINIDO";

    const allEvents = technologies.flatMap((tech) => tech.events || []);
    const criticalCount = allEvents.filter((event) => event.status === "critical").length;
    const warningCount = allEvents.filter((event) => event.status === "warning").length;

    if (!events.length && !technologies.length) {
      impactTextEl.textContent = "Sem dados";
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

  /*
  function renderTechnologyChips(technologies) {
    if (!technologies.length) {
      techListEl.innerHTML = `
        <div class="ftsj-chip ftsj-chip-unknown">
          <span class="ftsj-chip-dot"></span>
          <span>Sem tecnologias</span>
        </div>
      `;
      return;
    }

    techListEl.innerHTML = technologies
      .map((tech) => {
        return `
          <div class="ftsj-chip ftsj-chip-${tech.status}">
            <span class="ftsj-chip-dot"></span>
            <span>${escapeHtml(tech.label)}</span>
            ${renderTooltip(tech)}
          </div>
        `;
      })
      .join("");
  }
  */
  function renderTechnologyChips(technologies) {
    if (!technologies.length) {
      techListEl.innerHTML = `
        <div class="ftsj-chip ftsj-chip-unknown">
          <span class="ftsj-chip-dot"></span>
          <span>Sem tecnologias</span>
        </div>
      `;
      return;
    }
  
    techListEl.innerHTML = technologies
      .map((tech, index) => {
        const chipUrl = getChipUrl(tech);
        const clickableClass = chipUrl ? "ftsj-chip-clickable" : "";
  
        return `
          <div
            class="ftsj-chip ftsj-chip-${tech.status} ${clickableClass}"
            data-tech-index="${index}"
          >
            <span class="ftsj-chip-dot"></span>
            <span>${escapeHtml(tech.label)}</span>
            ${renderTooltip(tech)}
          </div>
        `;
      })
      .join("");
  
    techListEl.querySelectorAll("[data-tech-index]").forEach((chipEl) => {
      const index = Number(chipEl.dataset.techIndex);
      const tech = technologies[index];
      const chipUrl = getChipUrl(tech);
  
      if (!chipUrl) {
        return;
      }
  
      chipEl.addEventListener("click", (event) => {
        event.stopPropagation();
        openUrl(chipUrl);
      });
    });
  }

  function getChipUrl(tech) {
    if (!tech) {
      return "";
    }
  
    if (tech.technology === "infra") {
      return CONFIG.infrastructureUrl || "";
    }
  
    return CONFIG.applicationUrl || "";
  }

  function renderTooltip(tech) {
    const visibleEvents = tech.events.slice(0, CONFIG.maxEventsInTooltip);
    const hiddenCount = Math.max(tech.events.length - visibleEvents.length, 0);

    const rows = visibleEvents
      .map((event) => {
        return `
          <div class="ftsj-tooltip-item ftsj-row-${event.status}">
            <span class="ftsj-chip-dot"></span>
            <span class="ftsj-tooltip-monitor">${escapeHtml(event.name)}</span>
            <span class="ftsj-tooltip-status">${escapeHtml(STATUS_LABEL[event.status] || "N/A")}</span>
          </div>
        `;
      })
      .join("");

    return `
      <div class="ftsj-tooltip">
        <div class="ftsj-tooltip-title">
          <span>${escapeHtml(tech.label)}</span>
          <span class="ftsj-tooltip-count">${tech.events.length} evento(s)</span>
        </div>

        <div class="ftsj-tooltip-list">
          ${rows}
        </div>

        ${
          hiddenCount > 0
            ? `<div class="ftsj-tooltip-more">+ ${hiddenCount} evento(s)</div>`
            : ""
        }
      </div>
    `;
  }

  /*
  function setupCardClick() {
    const url = CONFIG.dashboardUrl || "";

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
  */

  /*
   * ============================================================
   * Ícones internos
   * ============================================================
   */
  function getActionIcon(iconName) {
    const icons = {
      server: `
        <svg viewBox="0 0 24 24" class="ftsj-action-svg">
          <rect x="4" y="4" width="16" height="6" rx="1.5"></rect>
          <rect x="4" y="14" width="16" height="6" rx="1.5"></rect>
          <path d="M7 7h.01"></path>
          <path d="M10 7h.01"></path>
          <path d="M7 17h.01"></path>
          <path d="M10 17h.01"></path>
          <path d="M16 7h1"></path>
          <path d="M16 17h1"></path>
        </svg>
      `,
  
      api: `
        <svg viewBox="0 0 24 24" class="ftsj-action-svg">
          <path d="M7 7h10v10H7V7Z"></path>
          <path d="M3 9h4"></path>
          <path d="M17 9h4"></path>
          <path d="M3 15h4"></path>
          <path d="M17 15h4"></path>
          <path d="M9 3v4"></path>
          <path d="M15 3v4"></path>
          <path d="M9 17v4"></path>
          <path d="M15 17v4"></path>
        </svg>
      `,
    };
  
    return icons[iconName] || icons.api;
  }

  function getSvgIcon(iconName) {
    const icons = {
      payment: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <rect x="4" y="6" width="16" height="12" rx="2"></rect>
          <path d="M7 10h10"></path>
          <path d="M7 14h6"></path>
        </svg>
      `,

      user: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <circle cx="12" cy="8" r="3.5"></circle>
          <path d="M5 20a7 7 0 0 1 14 0"></path>
        </svg>
      `,

      search: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <circle cx="10.5" cy="10.5" r="6.5"></circle>
          <path d="M16 16l4 4"></path>
        </svg>
      `,

      pix: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <path d="M12 3l4.5 4.5L12 12 7.5 7.5 12 3Z"></path>
          <path d="M12 12l4.5 4.5L12 21l-4.5-4.5L12 12Z"></path>
          <path d="M3 12l4.5-4.5L12 12l-4.5 4.5L3 12Z"></path>
          <path d="M21 12l-4.5-4.5L12 12l4.5 4.5L21 12Z"></path>
        </svg>
      `,

      document: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <path d="M7 3h7l4 4v14H7V3Z"></path>
          <path d="M14 3v5h5"></path>
          <path d="M9 12h6"></path>
          <path d="M9 16h6"></path>
        </svg>
      `,

      rocket: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <path d="M14 4c3.5.5 5.5 2.5 6 6l-5 5-6-6 5-5Z"></path>
          <path d="M9 9l-4 1 3 3"></path>
          <path d="M15 15l-1 4-3-3"></path>
          <circle cx="15" cy="9" r="1.5"></circle>
        </svg>
      `,

      api: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <path d="M7 7h10v10H7V7Z"></path>
          <path d="M3 9h4"></path>
          <path d="M17 9h4"></path>
          <path d="M3 15h4"></path>
          <path d="M17 15h4"></path>
          <path d="M9 3v4"></path>
          <path d="M15 3v4"></path>
          <path d="M9 17v4"></path>
          <path d="M15 17v4"></path>
        </svg>
      `,

      default: `
        <svg viewBox="0 0 24 24" class="ftsj-svg">
          <rect x="4" y="6" width="16" height="12" rx="2"></rect>
          <path d="M7 10h10"></path>
          <path d="M7 14h6"></path>
        </svg>
      `,
    };

    return icons[iconName] || icons.default;
  }

  /*
   * ============================================================
   * Helpers
   * ============================================================
   */
  function pick(obj, keys) {
    if (!isObject(obj)) return undefined;

    for (const key of keys) {
      if (hasOwn(obj, key)) {
        return obj[key];
      }
    }

    return undefined;
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
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

  function extractTagValue(tags, prefix) {
    const normalizedPrefix = String(prefix).toLowerCase();

    const found = tags.find((tag) => {
      return String(tag).toLowerCase().startsWith(normalizedPrefix);
    });

    if (!found) return "";

    return String(found).slice(prefix.length).trim();
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
      infra: "Infra",
      "sem tecnologia": "Sem tecnologia",
    };

    if (map[key]) return map[key];

    return clean.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDisplayName(value) {
    return String(value || "")
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

  function openUrl(url) {
    if (!url || url.includes("${")) {
      return;
    }
  
    window.open(url, "_blank", "noopener,noreferrer");
  }
})();