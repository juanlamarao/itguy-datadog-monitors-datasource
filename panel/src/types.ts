export type SortDirection = 'asc' | 'desc';

export type SortField =
  | 'problem_recent'
  | 'status'
  | 'priority'
  | 'name'
  | 'scope'
  | 'duration'
  | 'lastTriggered';

export interface DatadogMonitorsPanelOptions {
  title?: string;

  showSummaryCards?: boolean;
  showOkCard?: boolean;
  showPrioritySummaryCards?: boolean;

  enablePagination?: boolean;
  pageSize?: number;

  enableColumnFilters?: boolean;

  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
  prioritizeProblemRows?: boolean;

  statusColors?: StatusColors;
  priorityColors?: PriorityColors;
  tagColors?: TagColors;
}

export interface StatusColors {
  critical?: string;
  alert?: string;
  warn?: string;
  noData?: string;
  ok?: string;
  unknown?: string;
  muted?: string;
}

export interface PriorityColors {
  p1?: string;
  p2?: string;
  p3?: string;
  p4?: string;
  p5?: string;
  notDefined?: string;
}

export interface TagColors {
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  color5?: string;
  color6?: string;
  color7?: string;
  color8?: string;
}

export interface MonitorRow {
  orgUrl: string;
  id: string;
  type: string;
  name: string;
  message: string;
  query: string;
  multi: boolean;
  priority: string;
  tags: string[];
  status: string;
  scope: string;
  lastTriggeredTs?: number;
  mutedUntilTs?: number;
  monitorUrl: string;
}