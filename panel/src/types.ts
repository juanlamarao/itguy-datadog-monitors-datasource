export interface DatadogMonitorsPanelOptions {
  title?: string;
  showSummaryCards?: boolean;
  showOkCard?: boolean;
  showMutedCard?: boolean;
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
  lastTriggeredTs?: number;
  mutedUntilTs?: number;
  monitorUrl: string;
}