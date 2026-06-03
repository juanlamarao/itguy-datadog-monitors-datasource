import React, { useMemo, useState } from 'react';
import { css, cx } from '@emotion/css';
import { DataFrame, Field, PanelProps } from '@grafana/data';
import { Button, Icon, useStyles2 } from '@grafana/ui';

import { DatadogMonitorsPanelOptions, MonitorRow } from './types';

interface Props extends PanelProps<DatadogMonitorsPanelOptions> {}

const DEFAULT_TITLE = 'Datadog Monitors Overview';

const STATUS_ORDER: Record<string, number> = {
  alert: 0,
  warn: 1,
  'no data': 2,
  ok: 3,
  unknown: 4,
};

const PRIORITY_ORDER: Record<string, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
  p5: 4,
  not_defined: 5,
  unknown: 6,
};

export const DatadogMonitorsPanel = ({ data, width, height, options }: Props) => {
  const styles = useStyles2(getStyles);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return extractRowsFromDataFrames(data.series);
  }, [data.series]);

  const sortedRows = useMemo(() => {
    return [...rows].sort(sortRows);
  }, [rows]);

  const summary = useMemo(() => {
    return buildSummary(rows);
  }, [rows]);

  const toggleExpanded = (rowKey: string) => {
    setExpandedRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const title = options.title || DEFAULT_TITLE;
  const showSummaryCards = options.showSummaryCards ?? true;
  const showOkCard = options.showOkCard ?? true;
  const showMutedCard = options.showMutedCard ?? true;

  if (!rows.length) {
    return (
      <div className={styles.panel} style={{ width, height }}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
        </div>

        <div className={styles.emptyState}>
          Nenhum monitor encontrado. Verifique a query do datasource ou os campos retornados.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} style={{ width, height }}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{title}</div>
          <div className={styles.subtitle}>
            {rows.length} monitor(es) recebidos do datasource
          </div>
        </div>
      </div>

      {showSummaryCards && (
        <div className={styles.cards}>
          <SummaryCard label="Alert" value={summary.alert} className={styles.cardAlert} />
          <SummaryCard label="Warn" value={summary.warn} className={styles.cardWarn} />
          <SummaryCard label="No data" value={summary.noData} className={styles.cardNoData} />

          {showOkCard && (
            <SummaryCard label="OK" value={summary.ok} className={styles.cardOk} />
          )}

          {showMutedCard && (
            <SummaryCard label="Muted" value={summary.muted} className={styles.cardMuted} />
          )}

          <SummaryCard label="Total" value={summary.total} className={styles.cardTotal} />
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.expandColumn} />
              <th>Status</th>
              <th>Priority</th>
              <th>Name</th>
              <th>Duration</th>
              <th>Muted</th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row, index) => {
              const rowKey = buildRowKey(row, index);
              const expanded = Boolean(expandedRows[rowKey]);
              const status = normalizeStatus(row.status);
              const mutedInfo = getMutedInfo(row.mutedUntilTs);
              const duration = getProblemDurationLabel(row.status, row.lastTriggeredTs);

              return (
                <React.Fragment key={rowKey}>
                  <tr className={styles.row}>
                    <td className={styles.expandColumn}>
                      <button
                        className={styles.expandButton}
                        onClick={() => toggleExpanded(rowKey)}
                        aria-label={expanded ? 'Collapse row' : 'Expand row'}
                      >
                        <Icon name={expanded ? 'angle-down' : 'angle-right'} />
                      </button>
                    </td>

                    <td>
                      <StatusBadge status={status} />
                    </td>

                    <td>
                      <PriorityBadge priority={row.priority} />
                    </td>

                    <td>
                      {row.monitorUrl ? (
                        <a
                          className={styles.monitorLink}
                          href={row.monitorUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.name || row.id || 'Unnamed monitor'}
                        </a>
                      ) : (
                        <span>{row.name || row.id || 'Unnamed monitor'}</span>
                      )}
                    </td>

                    <td>{duration}</td>

                    <td>
                      {mutedInfo.isMuted ? (
                        <span className={cx(styles.badge, styles.badgeMuted)}>
                          {mutedInfo.label}
                        </span>
                      ) : (
                        <span className={styles.mutedNo}>No</span>
                      )}
                    </td>
                  </tr>

                  {expanded && (
                    <tr className={styles.detailsRow}>
                      <td />
                      <td colSpan={5}>
                        <MonitorDetails row={row} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={className}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = useStyles2(getStyles);

  const className = cx(styles.badge, {
    [styles.badgeAlert]: status === 'alert',
    [styles.badgeWarn]: status === 'warn',
    [styles.badgeNoData]: status === 'no data',
    [styles.badgeOk]: status === 'ok',
    [styles.badgeUnknown]: status === 'unknown',
  });

  return <span className={className}>{status.toUpperCase()}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = useStyles2(getStyles);
  const normalizedPriority = normalizePriority(priority);

  const className = cx(styles.badge, {
    [styles.priorityP1]: normalizedPriority === 'p1',
    [styles.priorityP2]: normalizedPriority === 'p2',
    [styles.priorityP3]: normalizedPriority === 'p3',
    [styles.priorityP4]: normalizedPriority === 'p4',
    [styles.priorityP5]: normalizedPriority === 'p5',
    [styles.priorityUndefined]: normalizedPriority === 'not_defined',
  });

  return <span className={className}>{normalizedPriority}</span>;
}

function MonitorDetails({ row }: { row: MonitorRow }) {
  const styles = useStyles2(getStyles);
  const mutedInfo = getMutedInfo(row.mutedUntilTs);

  return (
    <div className={styles.detailsBox}>
      <div className={styles.detailsGrid}>
        <DetailItem label="ID" value={row.id || '-'} />
        <DetailItem label="Type" value={row.type || '-'} />
        <DetailItem label="Multi" value={row.multi ? 'true' : 'false'} />
        <DetailItem label="Last triggered" value={formatTimestamp(row.lastTriggeredTs)} />
        <DetailItem label="Muted until" value={mutedInfo.detailLabel} />

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>Monitor URL</div>
          <div>
            {row.monitorUrl ? (
              <a href={row.monitorUrl} target="_blank" rel="noreferrer">
                Open in Datadog
              </a>
            ) : (
              '-'
            )}
          </div>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.detailLabel}>Tags</div>
        {row.tags.length > 0 ? (
          <div className={styles.tags}>
            {row.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div>-</div>
        )}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.detailLabel}>Message</div>
        <pre className={styles.pre}>{row.message || 'No message'}</pre>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.detailLabel}>Query</div>
        <pre className={styles.pre}>{row.query || 'No query'}</pre>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function extractRowsFromDataFrames(series: DataFrame[]): MonitorRow[] {
  const rows: MonitorRow[] = [];

  for (const frame of series) {
    const rowCount = frame.length;

    for (let index = 0; index < rowCount; index++) {
      const row = frameIndexToMonitorRow(frame, index);

      if (row) {
        rows.push(row);
      }
    }
  }

  return rows;
}

function frameIndexToMonitorRow(frame: DataFrame, index: number): MonitorRow | null {
  const orgUrl = getStringField(frame, 'org_url', index);
  const id = getStringField(frame, 'id', index);
  const type = getStringField(frame, 'type', index);
  const name = getStringField(frame, 'name', index);
  const message = getStringField(frame, 'message', index);
  const query = getStringField(frame, 'query', index);
  const multi = getBooleanField(frame, 'multi', index);
  const priority = normalizePriority(getStringField(frame, 'priority', index));
  const tags = getTagsField(frame, 'tags', index);
  const status = normalizeStatus(getStringField(frame, 'status', index));
  const lastTriggeredTs = getTimestampField(frame, 'last_triggered_ts', index);
  const mutedUntilTs = getTimestampField(frame, 'muted_until_ts', index);

  const monitorUrl = buildMonitorUrl(orgUrl, id);

  if (!id && !name) {
    return null;
  }

  return {
    orgUrl,
    id,
    type,
    name,
    message,
    query,
    multi,
    priority,
    tags,
    status,
    lastTriggeredTs,
    mutedUntilTs,
    monitorUrl,
  };
}

function getField(frame: DataFrame, name: string): Field | undefined {
  return frame.fields.find((field) => field.name === name);
}

function getFieldValue(field: Field | undefined, index: number): unknown {
  if (!field) {
    return undefined;
  }

  const values = field.values as any;

  if (values && typeof values.get === 'function') {
    return values.get(index);
  }

  return values?.[index];
}

function getStringField(frame: DataFrame, name: string, index: number): string {
  const value = getFieldValue(getField(frame, name), index);

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function getBooleanField(frame: DataFrame, name: string, index: number): boolean {
  const value = getFieldValue(getField(frame, name), index);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    return ['true', 'yes', '1', 'sim'].includes(value.toLowerCase());
  }

  return false;
}

function getTimestampField(frame: DataFrame, name: string, index: number): number | undefined {
  const value = getFieldValue(getField(frame, name), index);

  return normalizeTimestamp(value);
}

function getTagsField(frame: DataFrame, name: string, index: number): string[] {
  const value = getFieldValue(getField(frame, name), index);

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // fallback abaixo
  }

  return trimmed
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTimestamp(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined;
  }

  if (numericValue < 1000000000000) {
    return numericValue * 1000;
  }

  return numericValue;
}

function normalizeStatus(status: string): string {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'no_data' || normalized === 'nodata') {
    return 'no data';
  }

  if (['alert', 'warn', 'no data', 'ok'].includes(normalized)) {
    return normalized;
  }

  return normalized || 'unknown';
}

function normalizePriority(priority: string): string {
  const normalized = String(priority || '').trim().toLowerCase();

  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return 'not_defined';
  }

  if (normalized === 'not_definied') {
    return 'not_defined';
  }

  if (['p1', 'p2', 'p3', 'p4', 'p5', 'not_defined'].includes(normalized)) {
    return normalized;
  }

  return normalized || 'not_defined';
}

function buildMonitorUrl(orgUrl: string, id: string): string {
  if (!orgUrl || !id) {
    return '';
  }

  const cleanOrgUrl = orgUrl.replace(/\/+$/, '');

  return `${cleanOrgUrl}/monitors/${id}`;
}

function isOkStatus(status: string): boolean {
  return normalizeStatus(status) === 'ok';
}

function getProblemDurationLabel(status: string, lastTriggeredTs?: number): string {
  if (isOkStatus(status)) {
    return '-';
  }

  if (!lastTriggeredTs) {
    return 'Unknown';
  }

  const diffMs = Date.now() - lastTriggeredTs;

  if (diffMs <= 0) {
    return '0m';
  }

  return formatDuration(diffMs);
}

function formatDuration(diffMs: number): string {
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleString();
}

function getMutedInfo(mutedUntilTs?: number): {
  isMuted: boolean;
  label: string;
  detailLabel: string;
} {
  if (!mutedUntilTs) {
    return {
      isMuted: false,
      label: 'No',
      detailLabel: '-',
    };
  }

  const now = Date.now();

  if (mutedUntilTs > now) {
    return {
      isMuted: true,
      label: 'Muted',
      detailLabel: formatTimestamp(mutedUntilTs),
    };
  }

  return {
    isMuted: false,
    label: 'Expired',
    detailLabel: `Expired at ${formatTimestamp(mutedUntilTs)}`,
  };
}

function buildSummary(rows: MonitorRow[]) {
  const summary = {
    alert: 0,
    warn: 0,
    noData: 0,
    ok: 0,
    muted: 0,
    total: rows.length,
  };

  for (const row of rows) {
    const status = normalizeStatus(row.status);

    if (status === 'alert') {
      summary.alert++;
    } else if (status === 'warn') {
      summary.warn++;
    } else if (status === 'no data') {
      summary.noData++;
    } else if (status === 'ok') {
      summary.ok++;
    }

    if (getMutedInfo(row.mutedUntilTs).isMuted) {
      summary.muted++;
    }
  }

  return summary;
}

function sortRows(a: MonitorRow, b: MonitorRow): number {
  const statusA = STATUS_ORDER[normalizeStatus(a.status)] ?? STATUS_ORDER.unknown;
  const statusB = STATUS_ORDER[normalizeStatus(b.status)] ?? STATUS_ORDER.unknown;

  if (statusA !== statusB) {
    return statusA - statusB;
  }

  const priorityA = PRIORITY_ORDER[normalizePriority(a.priority)] ?? PRIORITY_ORDER.unknown;
  const priorityB = PRIORITY_ORDER[normalizePriority(b.priority)] ?? PRIORITY_ORDER.unknown;

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  if (!isOkStatus(a.status) && !isOkStatus(b.status)) {
    const triggeredA = a.lastTriggeredTs || Number.MAX_SAFE_INTEGER;
    const triggeredB = b.lastTriggeredTs || Number.MAX_SAFE_INTEGER;

    return triggeredA - triggeredB;
  }

  return a.name.localeCompare(b.name);
}

function buildRowKey(row: MonitorRow, index: number): string {
  return `${row.id || row.name || 'monitor'}-${index}`;
}

const getStyles = (theme: any) => {
  const borderColor = theme.colors.border.medium;
  const bgPrimary = theme.colors.background.primary;
  const bgSecondary = theme.colors.background.secondary;
  const bgCanvas = theme.colors.background.canvas;
  const textPrimary = theme.colors.text.primary;
  const textSecondary = theme.colors.text.secondary;

  return {
    panel: css({
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: theme.spacing(2),
      background: bgPrimary,
      color: textPrimary,
    }),

    header: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(2),
    }),

    title: css({
      fontSize: theme.typography.h4.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
    }),

    subtitle: css({
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginTop: theme.spacing(0.5),
    }),

    emptyState: css({
      border: `1px dashed ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(3),
      color: textSecondary,
      textAlign: 'center',
    }),

    cards: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
    }),

    cardBase: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1.25),
      background: bgSecondary,

      '.summary-label': {
        color: textSecondary,
        fontSize: theme.typography.bodySmall.fontSize,
        marginBottom: theme.spacing(0.5),
      },

      '.summary-value': {
        fontSize: 24,
        fontWeight: theme.typography.fontWeightMedium,
      },
    }),

    cardAlert: '',
    cardWarn: '',
    cardNoData: '',
    cardOk: '',
    cardMuted: '',
    cardTotal: '',

    tableWrapper: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      overflow: 'auto',
      background: bgCanvas,
    }),

    table: css({
      width: '100%',
      borderCollapse: 'collapse',

      th: {
        textAlign: 'left',
        padding: theme.spacing(1),
        color: textSecondary,
        fontSize: theme.typography.bodySmall.fontSize,
        borderBottom: `1px solid ${borderColor}`,
        whiteSpace: 'nowrap',
      },

      td: {
        padding: theme.spacing(1),
        borderBottom: `1px solid ${borderColor}`,
        verticalAlign: 'middle',
      },
    }),

    row: css({
      '&:hover': {
        background: bgSecondary,
      },
    }),

    expandColumn: css({
      width: 36,
      textAlign: 'center',
    }),

    expandButton: css({
      border: 'none',
      background: 'transparent',
      color: textSecondary,
      cursor: 'pointer',
      padding: 0,

      '&:hover': {
        color: textPrimary,
      },
    }),

    monitorLink: css({
      color: theme.colors.text.link,
      fontWeight: theme.typography.fontWeightMedium,
      textDecoration: 'none',

      '&:hover': {
        textDecoration: 'underline',
      },
    }),

    detailsRow: css({
      background: bgSecondary,
    }),

    detailsBox: css({
      padding: theme.spacing(1.5),
      borderRadius: theme.shape.radius.default,
    }),

    detailsGrid: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: theme.spacing(1.5),
      marginBottom: theme.spacing(2),
    }),

    detailItem: css({
      minWidth: 0,
    }),

    detailLabel: css({
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginBottom: theme.spacing(0.5),
      fontWeight: theme.typography.fontWeightMedium,
    }),

    detailSection: css({
      marginTop: theme.spacing(1.5),
    }),

    pre: css({
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      background: bgPrimary,
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1),
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: theme.typography.bodySmall.fontSize,
    }),

    tags: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(0.75),
    }),

    tag: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
      background: bgPrimary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),

    badge: css({
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: theme.shape.radius.default,
      padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      whiteSpace: 'nowrap',
      border: `1px solid ${borderColor}`,
    }),

    badgeAlert: css({
      color: theme.colors.error.text,
      background: theme.colors.error.transparent,
      borderColor: theme.colors.error.border,
    }),

    badgeWarn: css({
      color: theme.colors.warning.text,
      background: theme.colors.warning.transparent,
      borderColor: theme.colors.warning.border,
    }),

    badgeNoData: css({
      color: theme.colors.info.text,
      background: theme.colors.info.transparent,
      borderColor: theme.colors.info.border,
    }),

    badgeOk: css({
      color: theme.colors.success.text,
      background: theme.colors.success.transparent,
      borderColor: theme.colors.success.border,
    }),

    badgeUnknown: css({
      color: textSecondary,
      background: bgSecondary,
      borderColor,
    }),

    badgeMuted: css({
      color: theme.colors.info.text,
      background: theme.colors.info.transparent,
      borderColor: theme.colors.info.border,
    }),

    mutedNo: css({
      color: textSecondary,
    }),

    priorityP1: css({
      color: theme.colors.error.text,
      background: theme.colors.error.transparent,
      borderColor: theme.colors.error.border,
    }),

    priorityP2: css({
      color: theme.colors.warning.text,
      background: theme.colors.warning.transparent,
      borderColor: theme.colors.warning.border,
    }),

    priorityP3: css({
      color: theme.colors.text.primary,
      background: bgSecondary,
      borderColor,
    }),

    priorityP4: css({
      color: textSecondary,
      background: bgSecondary,
      borderColor,
    }),

    priorityP5: css({
      color: textSecondary,
      background: bgSecondary,
      borderColor,
    }),

    priorityUndefined: css({
      color: textSecondary,
      background: bgSecondary,
      borderColor,
    }),
  };
};