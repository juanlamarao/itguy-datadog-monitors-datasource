import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type DatadogQueryType = 'monitor' | 'group_monitor' | 'all' | 'metric';

export type DatadogQueryMode = 'builder' | 'raw';

export type DatadogOutputFormat = 'table' | 'problems' | 'timeseries';

export interface DatadogObservabilityQuery extends DataQuery {
  queryType: DatadogQueryType;
  queryMode?: DatadogQueryMode;
  outputFormat?: DatadogOutputFormat;

  /**
   * Monitors: usado no modo Raw query.
   */
  datadogQuery?: string;

  /**
   * Metrics: query timeseries do Datadog.
   * Exemplo: avg:system.cpu.user{*} by {host}
   */
  metricQuery?: string;

  /**
   * Metrics: nome amigável opcional para a série.
   */
  metricAlias?: string;

  /**
   * Monitors: usados no modo Builder.
   */
  status?: string[];
  muted?: 'true' | 'false' | '';
  priority?: string[];
  type?: string[];

  env?: string;
  team?: string;
  scope?: string;
  tag?: string;

  /**
   * Campo livre para filtros adicionais que não existem no Builder.
   */
  extraOptions?: string;
}

export type DatadogMonitorsQuery = DatadogObservabilityQuery;

export const DEFAULT_QUERY: Partial<DatadogObservabilityQuery> = {
  queryType: 'monitor',
  queryMode: 'builder',
  datadogQuery: 'status:alert muted:false',
  outputFormat: 'table',
  status: ['alert'],
  muted: 'false',
};

export interface DatadogObservabilityDataSourceOptions extends DataSourceJsonData {
  apiBaseUrl?: string;
  appBaseUrl?: string;
  timeout?: number;
  concurrentSessions?: number;
}

export type DatadogMonitorsDataSourceOptions = DatadogObservabilityDataSourceOptions;

export interface DatadogObservabilitySecureJsonData {
  apiKey?: string;
  applicationKey?: string;
}

export type DatadogMonitorsSecureJsonData = DatadogObservabilitySecureJsonData;

export interface DatadogMetadata {
  total_count: number;
  page: number;
  per_page: number;
  page_count: number;
}

export interface DatadogSearchResponse {
  metadata?: DatadogMetadata;
  counts?: Record<string, unknown>;
  monitors?: unknown[];
  groups?: unknown[];
}

export interface NormalizedDatadogMonitorResult {
  source: 'monitor' | 'group_monitor';
  endpoint: '/monitor/search' | '/monitor/groups/search';

  org_url: string;
  id: string;
  type: string;
  name: string;
  message: string;
  query: string;
  multi: boolean;
  priority: string;
  tags: string[];

  status: string;
  last_triggered_ts: number;
  muted_until_ts: number | null;

  monitor_url: string;

  page: number;
  pageCount: number;
  totalCount: number;

  rawJson: Record<string, unknown>;
}

export interface NormalizedDatadogMetricPoint {
  source: 'metric';
  metric: string;
  display_name: string;
  scope: string;
  tags: string[];
  unit: string;
  timestamp: number;
  value: number | null;
  query: string;
  rawJson: Record<string, unknown>;
}
