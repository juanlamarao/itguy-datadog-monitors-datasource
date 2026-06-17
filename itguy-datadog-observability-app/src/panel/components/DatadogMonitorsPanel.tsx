import React, { useEffect, useMemo, useState } from 'react';
import { css, cx } from '@emotion/css';
import { DataFrame, Field, PanelProps } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';

import {
  DatadogMonitorsPanelOptions,
  MonitorRow,
  PriorityColors,
  SortDirection,
  SortField,
  StatusColors,
  TagColors,
} from '../types';

interface Props extends PanelProps<DatadogMonitorsPanelOptions> {}

type ColumnKey = 'status' | 'priority' | 'name' | 'scope';

type SelectFilterColumn = 'status' | 'priority' | 'scope';

type ColumnFilters = Partial<Record<ColumnKey, string>>;

type ColumnFilterOptions = Partial<Record<SelectFilterColumn, string[]>>;

type SortState = {
  field: SortField;
  direction: SortDirection;
};

const DEFAULT_TITLE = 'Datadog Monitors Overview';

const STATUS_ORDER: Record<string, number> = {
  critical: 0,
  alert: 1,
  warn: 2,
  'no data': 3,
  ok: 4,
  unknown: 5,
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

const DEFAULT_STATUS_COLORS: Required<StatusColors> = {
  critical: '#E02F44',
  alert: '#F2495C',
  warn: '#FFB357',
  noData: '#5794F2',
  ok: '#73BF69',
  unknown: '#8E8E8E',
  muted: '#FF8A00',
};

const DEFAULT_PRIORITY_COLORS: Required<PriorityColors> = {
  p1: '#E02F44',
  p2: '#FF9830',
  p3: '#FFB357',
  p4: '#5794F2',
  p5: '#8E8E8E',
  notDefined: '#8E8E8E',
};

const DEFAULT_TAG_COLORS: Required<TagColors> = {
  color1: '#5794F2',
  color2: '#73BF69',
  color3: '#FFB357',
  color4: '#B877D9',
  color5: '#FF7383',
  color6: '#56A64B',
  color7: '#FADE2A',
  color8: '#8AB8FF',
};

export const DatadogMonitorsPanel = ({ data, width, height, options }: Props) => {
  const styles = useStyles2(getStyles);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [activePriorityFilter, setActivePriorityFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<ColumnKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(normalizePageSize(options.pageSize));
  const [sortState, setSortState] = useState<SortState>({
    field: options.defaultSortField || 'problem_recent',
    direction: options.defaultSortDirection || 'desc',
  });

  const statusColors = buildStatusColors(options.statusColors);
  const priorityColors = buildPriorityColors(options.priorityColors);
  const tagColors = buildTagColors(options.tagColors);

  const rows = useMemo(() => extractRowsFromDataFrames(data.series), [data.series]);

  const columnFilterOptions = useMemo<ColumnFilterOptions>(() => {
    return {
      status: uniqueValues(rows.map((row) => normalizeStatus(row.status))),
      priority: uniqueValues(rows.map((row) => normalizePriority(row.priority))),
      scope: uniqueValues(rows.map((row) => row.scope || '-')),
    };
  }, [rows]);

  useEffect(() => {
    setPageSize(normalizePageSize(options.pageSize));
  }, [options.pageSize]);

  useEffect(() => {
    setSortState({
      field: options.defaultSortField || 'problem_recent',
      direction: options.defaultSortDirection || 'desc',
    });
  }, [options.defaultSortField, options.defaultSortDirection]);

  useEffect(() => {
    setPage(1);
  }, [activeStatusFilter, activePriorityFilter, columnFilters, pageSize, rows.length]);

  const statusSummary = useMemo(() => buildStatusSummary(rows), [rows]);
  const prioritySummary = useMemo(() => buildPrioritySummary(rows), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeStatusFilter && normalizeStatus(row.status) !== activeStatusFilter) {
        return false;
      }

      if (activePriorityFilter && normalizePriority(row.priority) !== activePriorityFilter) {
        return false;
      }

      return matchesColumnFilters(row, columnFilters);
    });
  }, [rows, activeStatusFilter, activePriorityFilter, columnFilters]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => sortRows(a, b, sortState, options.prioritizeProblemRows ?? true));
  }, [filteredRows, sortState, options.prioritizeProblemRows]);

  const enablePagination = options.enablePagination ?? true;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = enablePagination ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize) : sortedRows;

  const title = options.title === undefined ? DEFAULT_TITLE : options.title;
  const shouldShowHeaderInfo = title.trim() !== '';
  const shouldShowHeader = shouldShowHeaderInfo || hasAnyFilter(activeStatusFilter, activePriorityFilter, columnFilters);

  const showSummaryCards = options.showSummaryCards ?? true;
  const showOkCard = options.showOkCard ?? true;
  const showPrioritySummaryCards = options.showPrioritySummaryCards ?? true;
  const enableColumnFilters = options.enableColumnFilters ?? true;

  const toggleExpanded = (rowKey: string) => {
    setExpandedRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const toggleStatusFilter = (status: string) => {
    setActiveStatusFilter((current) => (current === status ? null : status));
  };

  const togglePriorityFilter = (priority: string) => {
    setActivePriorityFilter((current) => (current === priority ? null : priority));
  };

  const handleSort = (field: SortField) => {
    setSortState((current) => {
      if (current.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        field,
        direction: field === 'problem_recent' || field === 'lastTriggered' ? 'desc' : 'asc',
      };
    });
  };

  const toggleColumnFilter = (column: ColumnKey) => {
    setActiveFilterColumn((current) => (current === column ? null : column));
  };

  const updateColumnFilter = (column: ColumnKey, value: string) => {
    setColumnFilters((current) => ({
      ...current,
      [column]: value,
    }));
  };

  const clearFilters = () => {
    setActiveStatusFilter(null);
    setActivePriorityFilter(null);
    setColumnFilters({});
    setActiveFilterColumn(null);
  };

  if (!rows.length) {
    return (
      <div className={styles.panel} style={{ width, height }}>
        {shouldShowHeaderInfo && (
          <div className={styles.header}>
            <div>
              <div className={styles.title}>{title}</div>
            </div>
          </div>
        )}

        <div className={styles.emptyState}>Nenhum monitor encontrado. Verifique a query do datasource ou os campos retornados.</div>
      </div>
    );
  }

  return (
    <div className={styles.panel} style={{ width, height }}>
      {shouldShowHeader && (
        <div className={styles.header}>
          {shouldShowHeaderInfo ? (
            <div>
              <div className={styles.title}>{title}</div>
              <div className={styles.subtitle}>
                {sortedRows.length} de {rows.length} monitor(es) exibidos
              </div>
            </div>
          ) : (
            <div />
          )}

          {hasAnyFilter(activeStatusFilter, activePriorityFilter, columnFilters) && (
            <button className={styles.clearFiltersButton} onClick={clearFilters} type="button">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {showSummaryCards && (
        <div className={styles.cards}>
          <SummaryCard
            label="Critical"
            value={statusSummary.critical}
            color={statusColors.critical}
            active={activeStatusFilter === 'critical'}
            onClick={() => toggleStatusFilter('critical')}
          />
          <SummaryCard
            label="Alert"
            value={statusSummary.alert}
            color={statusColors.alert}
            active={activeStatusFilter === 'alert'}
            onClick={() => toggleStatusFilter('alert')}
          />
          <SummaryCard
            label="Warn"
            value={statusSummary.warn}
            color={statusColors.warn}
            active={activeStatusFilter === 'warn'}
            onClick={() => toggleStatusFilter('warn')}
          />
          <SummaryCard
            label="No data"
            value={statusSummary.noData}
            color={statusColors.noData}
            active={activeStatusFilter === 'no data'}
            onClick={() => toggleStatusFilter('no data')}
          />

          {showOkCard && (
            <SummaryCard
              label="OK"
              value={statusSummary.ok}
              color={statusColors.ok}
              active={activeStatusFilter === 'ok'}
              onClick={() => toggleStatusFilter('ok')}
            />
          )}

          <SummaryCard
            label="Total"
            value={statusSummary.total}
            color={statusColors.unknown}
            active={false}
            onClick={() => setActiveStatusFilter(null)}
          />
        </div>
      )}

      {showPrioritySummaryCards && (
        <div className={styles.cardsSecondary}>
          {(['p1', 'p2', 'p3', 'p4', 'p5', 'not_defined'] as const).map((priority) => (
            <SummaryCard
              key={priority}
              label={priority === 'not_defined' ? 'Sem prioridade' : priority.toUpperCase()}
              value={prioritySummary[priority] || 0}
              color={getPriorityColor(priority, priorityColors)}
              active={activePriorityFilter === priority}
              compact
              onClick={() => togglePriorityFilter(priority)}
            />
          ))}
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.expandColumn} />

              <SortableHeader
                label="Status"
                field="status"
                sortState={sortState}
                filterColumn="status"
                filterMode="select"
                filterValue={columnFilters.status || ''}
                filterOptions={columnFilterOptions.status || []}
                activeFilterColumn={activeFilterColumn}
                enableColumnFilters={enableColumnFilters}
                onSort={handleSort}
                onToggleFilter={toggleColumnFilter}
                onFilterChange={updateColumnFilter}
              />

              <SortableHeader
                label="Monitor"
                field="name"
                sortState={sortState}
                filterColumn="name"
                filterMode="text"
                filterValue={columnFilters.name || ''}
                activeFilterColumn={activeFilterColumn}
                enableColumnFilters={enableColumnFilters}
                onSort={handleSort}
                onToggleFilter={toggleColumnFilter}
                onFilterChange={updateColumnFilter}
              />

              <SortableHeader
                label="Escopo"
                field="scope"
                sortState={sortState}
                filterColumn="scope"
                filterMode="select"
                filterValue={columnFilters.scope || ''}
                filterOptions={columnFilterOptions.scope || []}
                activeFilterColumn={activeFilterColumn}
                enableColumnFilters={enableColumnFilters}
                onSort={handleSort}
                onToggleFilter={toggleColumnFilter}
                onFilterChange={updateColumnFilter}
              />

              <SortableHeader
                label="Prioridade"
                field="priority"
                sortState={sortState}
                filterColumn="priority"
                filterMode="select"
                filterValue={columnFilters.priority || ''}
                filterOptions={columnFilterOptions.priority || []}
                activeFilterColumn={activeFilterColumn}
                enableColumnFilters={enableColumnFilters}
                onSort={handleSort}
                onToggleFilter={toggleColumnFilter}
                onFilterChange={updateColumnFilter}
              />

              <SortableHeader
                label="Duração"
                field="duration"
                sortState={sortState}
                filterMode="none"
                enableColumnFilters={false}
                onSort={handleSort}
                onToggleFilter={toggleColumnFilter}
                onFilterChange={updateColumnFilter}
              />
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, index) => {
              const rowKey = buildRowKey(row, index + (safePage - 1) * pageSize);
              const expanded = Boolean(expandedRows[rowKey]);
              const status = normalizeStatus(row.status);
              const priority = normalizePriority(row.priority);
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
                        type="button"
                      >
                        <Icon name={expanded ? 'angle-down' : 'angle-right'} />
                      </button>
                    </td>

                    <td>
                      <StatusBadge status={status} colors={statusColors} />
                    </td>

                    <td>
                      <div className={styles.monitorCell}>
                        <div className={styles.monitorNameLine}>
                          {mutedInfo.isMuted && <MaintenanceIcon color={statusColors.muted} label={mutedInfo.detailLabel} />}

                          {row.monitorUrl ? (
                            <a className={styles.monitorLink} href={row.monitorUrl} target="_blank" rel="noreferrer">
                              {row.name || row.id || 'Unnamed monitor'}
                            </a>
                          ) : (
                            <span className={styles.monitorName}>{row.name || row.id || 'Unnamed monitor'}</span>
                          )}
                        </div>

                        {row.tags.length > 0 && <TagList tags={row.tags} colors={tagColors} limit={3} showMore />}
                      </div>
                    </td>

                    <td>{row.scope || '-'}</td>

                    <td>
                      <PriorityBadge priority={priority} colors={priorityColors} />
                    </td>

                    <td>{duration}</td>
                  </tr>

                  {expanded && (
                    <tr className={styles.detailsRow}>
                      <td />
                      <td colSpan={5}>
                        <MonitorDetails row={row} colors={tagColors} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.noRowsCell}>
                  Nenhum monitor encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enablePagination && sortedRows.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Página {safePage} de {totalPages} · {sortedRows.length} monitor(es)
          </div>

          <div className={styles.paginationControls}>
            <label className={styles.pageSizeLabel}>
              Itens por página
              <select className={styles.pageSizeSelect} value={pageSize} onChange={(event) => setPageSize(Number(event.currentTarget.value))}>
                {buildPageSizeOptions(pageSize).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <button className={styles.pageButton} onClick={() => setPage(1)} disabled={safePage === 1} type="button">
              Primeiro
            </button>

            <button className={styles.pageButton} onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} type="button">
              Anterior
            </button>

            <button className={styles.pageButton} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} type="button">
              Próxima
            </button>

            <button className={styles.pageButton} onClick={() => setPage(totalPages)} disabled={safePage === totalPages} type="button">
              Último
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function SummaryCard({
  label,
  value,
  color,
  active,
  compact,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const styles = useStyles2(getStyles);

  return (
    <button
      className={cx(styles.summaryCard, compact && styles.summaryCardCompact, active && styles.summaryCardActive)}
      style={{ borderColor: color, ['--summary-color' as string]: color }}
      onClick={onClick}
      type="button"
    >
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
    </button>
  );
}

function SortableHeader({
  label,
  field,
  sortState,
  filterColumn,
  filterMode = 'none',
  filterValue = '',
  filterOptions = [],
  activeFilterColumn,
  enableColumnFilters,
  onSort,
  onToggleFilter,
  onFilterChange,
}: {
  label: string;
  field: SortField;
  sortState: SortState;
  filterColumn?: ColumnKey;
  filterMode?: 'text' | 'select' | 'none';
  filterValue?: string;
  filterOptions?: string[];
  activeFilterColumn?: ColumnKey | null;
  enableColumnFilters: boolean;
  onSort: (field: SortField) => void;
  onToggleFilter: (column: ColumnKey) => void;
  onFilterChange: (column: ColumnKey, value: string) => void;
}) {
  const styles = useStyles2(getStyles);
  const [filterSearch, setFilterSearch] = useState('');

  const isSorted = sortState.field === field;
  const sortIcon = isSorted ? (sortState.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-down';

  const canFilter = enableColumnFilters && filterColumn && filterMode !== 'none';
  const filterOpen = canFilter && activeFilterColumn === filterColumn;
  const hasFilter = Boolean(filterValue.trim());

  const filteredOptions = useMemo(() => {
    const search = filterSearch.trim().toLowerCase();

    if (!search) {
      return filterOptions;
    }

    return filterOptions.filter((option) => option.toLowerCase().includes(search));
  }, [filterOptions, filterSearch]);

  return (
    <th>
      <div className={styles.columnHeader}>
        <button className={styles.columnTitleButton} onClick={() => onSort(field)} type="button">
          <span>{label}</span>
          <Icon name={sortIcon as any} />
        </button>

        {canFilter && filterColumn && (
          <button
            className={cx(styles.filterButton, filterOpen && styles.filterButtonActive, hasFilter && styles.filterButtonHasValue)}
            onClick={(event) => {
              event.stopPropagation();
              setFilterSearch('');
              onToggleFilter(filterColumn);
            }}
            title={`Filtrar por ${label}`}
            type="button"
          >
            <Icon name="filter" />
          </button>
        )}
      </div>

      {canFilter && filterColumn && filterOpen && filterMode === 'text' && (
        <input
          className={styles.columnFilterInput}
          value={filterValue}
          placeholder={`Filtrar ${label.toLowerCase()}`}
          onChange={(event) => onFilterChange(filterColumn, event.currentTarget.value)}
          onClick={(event) => event.stopPropagation()}
        />
      )}

      {canFilter && filterColumn && filterOpen && filterMode === 'select' && (
        <div className={styles.filterDropdown} onClick={(event) => event.stopPropagation()}>
          <input
            className={styles.columnFilterInput}
            value={filterSearch}
            placeholder={`Pesquisar ${label.toLowerCase()}`}
            onChange={(event) => setFilterSearch(event.currentTarget.value)}
          />

          <button className={styles.filterOption} onClick={() => onFilterChange(filterColumn, '')} type="button">
            Todos
          </button>

          {filteredOptions.map((option) => (
            <button
              key={option}
              className={cx(styles.filterOption, filterValue === option && styles.filterOptionActive)}
              onClick={() => onFilterChange(filterColumn, option)}
              type="button"
            >
              {formatFilterOptionLabel(filterColumn, option)}
            </button>
          ))}

          {filteredOptions.length === 0 && <div className={styles.filterNoOptions}>Nenhum valor encontrado</div>}
        </div>
      )}
    </th>
  );
}

function StatusBadge({ status, colors }: { status: string; colors: Required<StatusColors> }) {
  const styles = useStyles2(getStyles);
  const color = getStatusColor(status, colors);

  return (
    <span className={styles.badge} style={{ color, borderColor: color, background: transparentize(color, 0.16) }}>
      {status.toUpperCase()}
    </span>
  );
}

function PriorityBadge({ priority, colors }: { priority: string; colors: Required<PriorityColors> }) {
  const styles = useStyles2(getStyles);
  const color = getPriorityColor(priority, colors);
  const label = priority === 'not_defined' ? '-' : priority.toUpperCase();

  return (
    <span className={styles.badge} style={{ color, borderColor: color, background: transparentize(color, 0.16) }}>
      {label}
    </span>
  );
}

function MaintenanceIcon({ color, label }: { color: string; label: string }) {
  const styles = useStyles2(getStyles);

  return (
    <span className={styles.maintenanceIcon} style={{ color, borderColor: darkenHex(color), background: transparentize(color, 0.2) }} title={label}>
      🛠
    </span>
  );
}

function TagList({
  tags,
  colors,
  limit,
  showMore,
}: {
  tags: string[];
  colors: Required<TagColors>;
  limit?: number;
  showMore?: boolean;
}) {
  const styles = useStyles2(getStyles);
  const palette = getTagPalette(colors);
  const visibleTags = limit ? tags.slice(0, limit) : tags;
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);

  return (
    <div className={styles.tags}>
      {visibleTags.map((tag, index) => {
        const color = palette[index % palette.length];

        return (
          <span key={`${tag}-${index}`} className={styles.tag} style={{ color, borderColor: color, background: transparentize(color, 0.13) }}>
            {tag}
          </span>
        );
      })}

      {showMore && hiddenCount > 0 && <span className={styles.moreTags}>...</span>}
    </div>
  );
}

function MonitorDetails({ row, colors }: { row: MonitorRow; colors: Required<TagColors> }) {
  const styles = useStyles2(getStyles);
  const mutedInfo = getMutedInfo(row.mutedUntilTs);

  return (
    <div className={styles.detailsBox}>
      <div className={styles.detailsGrid}>
        <DetailItem label="Type" value={row.type || '-'} />
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
        {row.tags.length > 0 ? <TagList tags={row.tags} colors={colors} /> : <div>-</div>}
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
  const scope = getScopeField(frame, index, tags);
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
    scope,
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

function getScopeField(frame: DataFrame, index: number, tags: string[]): string {
  const directScope = getStringField(frame, 'scope', index) || getStringField(frame, 'scopes', index) || getStringField(frame, 'env', index);

  if (directScope) {
    return directScope;
  }

  const envTag = tags.find((tag) => tag.toLowerCase().startsWith('env:'));
  const scopeTag = tags.find((tag) => tag.toLowerCase().startsWith('scope:'));

  return (envTag || scopeTag || '').split(':').slice(1).join(':');
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

  if (['critical', 'alert', 'warn', 'no data', 'ok'].includes(normalized)) {
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

  if (['1', '2', '3', '4', '5'].includes(normalized)) {
    return `p${normalized}`;
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

function getProblemDurationMs(status: string, lastTriggeredTs?: number): number {
  if (isOkStatus(status) || !lastTriggeredTs) {
    return 0;
  }

  return Math.max(0, Date.now() - lastTriggeredTs);
}

function getProblemDurationLabel(status: string, lastTriggeredTs?: number): string {
  const durationMs = getProblemDurationMs(status, lastTriggeredTs);

  if (durationMs <= 0) {
    return '-';
  }

  return formatDuration(durationMs);
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
      detailLabel: `Muted until ${formatTimestamp(mutedUntilTs)}`,
    };
  }

  return {
    isMuted: false,
    label: 'Expired',
    detailLabel: `Expired at ${formatTimestamp(mutedUntilTs)}`,
  };
}

function buildStatusSummary(rows: MonitorRow[]) {
  const summary = {
    critical: 0,
    alert: 0,
    warn: 0,
    noData: 0,
    ok: 0,
    unknown: 0,
    total: rows.length,
  };

  for (const row of rows) {
    const status = normalizeStatus(row.status);

    if (status === 'critical') {
      summary.critical++;
    } else if (status === 'alert') {
      summary.alert++;
    } else if (status === 'warn') {
      summary.warn++;
    } else if (status === 'no data') {
      summary.noData++;
    } else if (status === 'ok') {
      summary.ok++;
    } else {
      summary.unknown++;
    }
  }

  return summary;
}

function buildPrioritySummary(rows: MonitorRow[]): Record<string, number> {
  const summary: Record<string, number> = {
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    p5: 0,
    not_defined: 0,
  };

  for (const row of rows) {
    const priority = normalizePriority(row.priority);
    summary[priority] = (summary[priority] || 0) + 1;
  }

  return summary;
}

function sortRows(a: MonitorRow, b: MonitorRow, sortState: SortState, prioritizeProblemRows: boolean): number {
  const problemCompare = compareProblemRows(a, b, prioritizeProblemRows);

  if (problemCompare !== 0) {
    return problemCompare;
  }

  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;
  const compareResult = compareByField(a, b, sortState.field);

  if (compareResult !== 0) {
    return compareResult * directionMultiplier;
  }

  return compareByField(a, b, 'name');
}

function compareProblemRows(a: MonitorRow, b: MonitorRow, prioritizeProblemRows: boolean): number {
  if (!prioritizeProblemRows) {
    return 0;
  }

  const durationA = getProblemDurationMs(a.status, a.lastTriggeredTs);
  const durationB = getProblemDurationMs(b.status, b.lastTriggeredTs);
  const isProblemA = durationA > 0;
  const isProblemB = durationB > 0;

  if (isProblemA !== isProblemB) {
    return isProblemA ? -1 : 1;
  }

  return 0;
}

function compareByField(a: MonitorRow, b: MonitorRow, field: SortField): number {
  if (field === 'problem_recent') {
    const triggeredA = a.lastTriggeredTs || 0;
    const triggeredB = b.lastTriggeredTs || 0;

    if (triggeredA !== triggeredB) {
      return triggeredA - triggeredB;
    }

    return getProblemDurationMs(b.status, b.lastTriggeredTs) - getProblemDurationMs(a.status, a.lastTriggeredTs);
  }

  if (field === 'status') {
    const statusA = STATUS_ORDER[normalizeStatus(a.status)] ?? STATUS_ORDER.unknown;
    const statusB = STATUS_ORDER[normalizeStatus(b.status)] ?? STATUS_ORDER.unknown;
    return statusA - statusB;
  }

  if (field === 'priority') {
    const priorityA = PRIORITY_ORDER[normalizePriority(a.priority)] ?? PRIORITY_ORDER.unknown;
    const priorityB = PRIORITY_ORDER[normalizePriority(b.priority)] ?? PRIORITY_ORDER.unknown;
    return priorityA - priorityB;
  }

  if (field === 'scope') {
    return a.scope.localeCompare(b.scope);
  }

  if (field === 'duration') {
    return getProblemDurationMs(a.status, a.lastTriggeredTs) - getProblemDurationMs(b.status, b.lastTriggeredTs);
  }

  if (field === 'lastTriggered') {
    return (a.lastTriggeredTs || 0) - (b.lastTriggeredTs || 0);
  }

  return a.name.localeCompare(b.name);
}

function matchesColumnFilters(row: MonitorRow, filters: ColumnFilters): boolean {
  return (Object.keys(filters) as ColumnKey[]).every((column) => {
    const filterValue = (filters[column] || '').trim().toLowerCase();

    if (!filterValue) {
      return true;
    }

    const candidate = getColumnValue(row, column).toLowerCase();

    if (column === 'status' || column === 'priority' || column === 'scope') {
      return candidate === filterValue;
    }

    return candidate.includes(filterValue);
  });
}

function getColumnValue(row: MonitorRow, column: ColumnKey): string {
  if (column === 'status') {
    return normalizeStatus(row.status);
  }

  if (column === 'priority') {
    return normalizePriority(row.priority);
  }

  if (column === 'scope') {
    return row.scope || '-';
  }

  return `${row.name} ${row.tags.join(' ')}`;
}

function buildRowKey(row: MonitorRow, index: number): string {
  return `${row.id || row.name || 'monitor'}-${index}`;
}

function hasAnyFilter(statusFilter: string | null, priorityFilter: string | null, columnFilters: ColumnFilters): boolean {
  return Boolean(statusFilter || priorityFilter || Object.values(columnFilters).some((value) => Boolean(value?.trim())));
}

function normalizePageSize(pageSize?: number): number {
  if (!pageSize || !Number.isFinite(pageSize) || pageSize <= 0) {
    return 10;
  }

  return Math.floor(pageSize);
}

function buildPageSizeOptions(currentPageSize: number): number[] {
  return Array.from(new Set([10, 25, 50, 100, currentPageSize])).sort((a, b) => a - b);
}

function uniqueValues(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

function formatFilterOptionLabel(column: ColumnKey, value: string): string {
  if (column === 'priority') {
    return value === 'not_defined' ? '-' : value.toUpperCase();
  }

  if (column === 'status') {
    return value.toUpperCase();
  }

  return value;
}

function buildStatusColors(colors?: StatusColors): Required<StatusColors> {
  return {
    ...DEFAULT_STATUS_COLORS,
    ...(colors || {}),
  };
}

function buildPriorityColors(colors?: PriorityColors): Required<PriorityColors> {
  return {
    ...DEFAULT_PRIORITY_COLORS,
    ...(colors || {}),
  };
}

function buildTagColors(colors?: TagColors): Required<TagColors> {
  return {
    ...DEFAULT_TAG_COLORS,
    ...(colors || {}),
  };
}

function getStatusColor(status: string, colors: Required<StatusColors>): string {
  const normalized = normalizeStatus(status);

  if (normalized === 'critical') {
    return colors.critical;
  }

  if (normalized === 'alert') {
    return colors.alert;
  }

  if (normalized === 'warn') {
    return colors.warn;
  }

  if (normalized === 'no data') {
    return colors.noData;
  }

  if (normalized === 'ok') {
    return colors.ok;
  }

  return colors.unknown;
}

function getPriorityColor(priority: string, colors: Required<PriorityColors>): string {
  const normalized = normalizePriority(priority);

  if (normalized === 'p1') {
    return colors.p1;
  }

  if (normalized === 'p2') {
    return colors.p2;
  }

  if (normalized === 'p3') {
    return colors.p3;
  }

  if (normalized === 'p4') {
    return colors.p4;
  }

  if (normalized === 'p5') {
    return colors.p5;
  }

  return colors.notDefined;
}

function getTagPalette(colors: Required<TagColors>): string[] {
  return [colors.color1, colors.color2, colors.color3, colors.color4, colors.color5, colors.color6, colors.color7, colors.color8];
}

function transparentize(color: string, alpha: number): string {
  if (!color.startsWith('#') || ![4, 7].includes(color.length)) {
    return color;
  }

  const normalized = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
  const opacity = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');

  return `${normalized}${opacity}`;
}

function darkenHex(color: string): string {
  if (!color.startsWith('#') || color.length !== 7) {
    return color;
  }

  const channels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((channel) => {
    const value = parseInt(channel, 16);
    return Math.max(0, Math.floor(value * 0.55))
      .toString(16)
      .padStart(2, '0');
  });

  return `#${channels.join('')}`;
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
      gap: theme.spacing(1),
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

    clearFiltersButton: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: bgSecondary,
      color: textPrimary,
      cursor: 'pointer',
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,

      '&:hover': {
        borderColor: theme.colors.text.link,
      },
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
      marginBottom: theme.spacing(1),
    }),

    cardsSecondary: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
    }),

    summaryCard: css({
      border: `1px solid ${borderColor}`,
      borderLeftWidth: 4,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1.25),
      background: bgSecondary,
      cursor: 'pointer',
      textAlign: 'left',
      color: textPrimary,
      transition: 'transform 120ms ease, border-color 120ms ease, background 120ms ease',

      '&:hover': {
        transform: 'translateY(-1px)',
        background: bgCanvas,
      },
    }),

    summaryCardCompact: css({
      padding: theme.spacing(1),
    }),

    summaryCardActive: css({
      boxShadow: `0 0 0 1px var(--summary-color)`,
      background: bgCanvas,
    }),

    summaryLabel: css({
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginBottom: theme.spacing(0.5),
    }),

    summaryValue: css({
      color: 'var(--summary-color)',
      fontSize: 24,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: 1,
    }),

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
        position: 'relative',
        textAlign: 'left',
        padding: theme.spacing(1),
        color: textSecondary,
        fontSize: theme.typography.bodySmall.fontSize,
        borderBottom: `1px solid ${borderColor}`,
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
      },

      td: {
        padding: theme.spacing(1),
        borderBottom: `1px solid ${borderColor}`,
        verticalAlign: 'middle',
      },
    }),

    columnHeader: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),

    columnTitleButton: css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      border: 'none',
      background: 'transparent',
      color: textSecondary,
      cursor: 'pointer',
      padding: 0,
      font: 'inherit',

      '&:hover': {
        color: textPrimary,
      },
    }),

    filterButton: css({
      border: 'none',
      background: 'transparent',
      color: textSecondary,
      cursor: 'pointer',
      padding: theme.spacing(0.25),
      borderRadius: theme.shape.radius.default,

      '&:hover': {
        color: textPrimary,
        background: bgSecondary,
      },
    }),

    filterButtonActive: css({
      color: theme.colors.text.link,
      background: bgSecondary,
    }),

    filterButtonHasValue: css({
      color: theme.colors.text.link,
    }),

    columnFilterInput: css({
      display: 'block',
      width: '100%',
      minWidth: 90,
      marginTop: theme.spacing(0.75),
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: bgPrimary,
      color: textPrimary,
      padding: `${theme.spacing(0.5)} ${theme.spacing(0.75)}`,
      fontSize: theme.typography.bodySmall.fontSize,
    }),

    filterDropdown: css({
      position: 'absolute',
      zIndex: 10,
      marginTop: theme.spacing(0.75),
      minWidth: 180,
      maxWidth: 260,
      maxHeight: 260,
      overflow: 'auto',
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: bgPrimary,
      boxShadow: theme.shadows?.z2 || '0 8px 24px rgba(0, 0, 0, 0.35)',
      padding: theme.spacing(0.75),
    }),

    filterOption: css({
      display: 'block',
      width: '100%',
      border: 'none',
      background: 'transparent',
      color: textPrimary,
      cursor: 'pointer',
      textAlign: 'left',
      padding: `${theme.spacing(0.5)} ${theme.spacing(0.75)}`,
      borderRadius: theme.shape.radius.default,
      marginTop: theme.spacing(0.25),

      '&:hover': {
        background: bgSecondary,
      },
    }),

    filterOptionActive: css({
      background: bgSecondary,
      color: theme.colors.text.link,
      fontWeight: theme.typography.fontWeightMedium,
    }),

    filterNoOptions: css({
      color: textSecondary,
      padding: theme.spacing(0.75),
      fontSize: theme.typography.bodySmall.fontSize,
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

    monitorCell: css({
      minWidth: 260,
    }),

    monitorNameLine: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      marginBottom: theme.spacing(0.75),
    }),

    monitorName: css({
      fontWeight: theme.typography.fontWeightMedium,
    }),

    monitorLink: css({
      color: theme.colors.text.link,
      fontWeight: theme.typography.fontWeightMedium,
      textDecoration: 'none',

      '&:hover': {
        textDecoration: 'underline',
      },
    }),

    maintenanceIcon: css({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: '50%',
      border: '1px solid',
      fontSize: 12,
      lineHeight: 1,
      flex: '0 0 auto',
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
      color: textPrimary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginBottom: theme.spacing(0.5),
      fontWeight: theme.typography.fontWeightBold || theme.typography.fontWeightMedium,
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
      border: '1px solid',
      borderRadius: theme.shape.radius.default,
      padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.4,
    }),

    moreTags: css({
      display: 'inline-flex',
      alignItems: 'center',
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: `${theme.spacing(0.25)} ${theme.spacing(0.5)}`,
    }),

    badge: css({
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: theme.shape.radius.default,
      padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      whiteSpace: 'nowrap',
      border: '1px solid',
      minWidth: 46,
      justifyContent: 'center',
    }),

    noRowsCell: css({
      textAlign: 'center',
      color: textSecondary,
      padding: theme.spacing(3),
    }),

    pagination: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      marginTop: theme.spacing(1),
      flexWrap: 'wrap',
    }),

    paginationInfo: css({
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),

    paginationControls: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      flexWrap: 'wrap',
    }),

    pageSizeLabel: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      color: textSecondary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),

    pageSizeSelect: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: bgSecondary,
      color: textPrimary,
      padding: `${theme.spacing(0.5)} ${theme.spacing(0.75)}`,
    }),

    pageButton: css({
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: bgSecondary,
      color: textPrimary,
      cursor: 'pointer',
      padding: `${theme.spacing(0.5)} ${theme.spacing(0.75)}`,

      '&:disabled': {
        opacity: 0.45,
        cursor: 'not-allowed',
      },

      '&:not(:disabled):hover': {
        borderColor: theme.colors.text.link,
      },
    }),
  };
};