import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type DatadogQueryType = 'monitor' | 'group_monitor' | 'all';

export type DatadogQueryMode = 'builder' | 'raw';

export type DatadogOutputFormat = 'table' | 'problems';

export interface DatadogMonitorsQuery extends DataQuery {
  queryType: DatadogQueryType;
  queryMode?: DatadogQueryMode;
  outputFormat?: DatadogOutputFormat;

  /**
   * Usado no modo Raw query.
   */
  datadogQuery?: string;

  /**
   * Usados no modo Builder.
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

export const DEFAULT_QUERY: Partial<DatadogMonitorsQuery> = {
  queryType: 'monitor',
  queryMode: 'builder',
  datadogQuery: 'status:alert muted:false',
  outputFormat: 'table',
  status: ['alert'],
  muted: 'false',
};

export interface DatadogMonitorsDataSourceOptions extends DataSourceJsonData {
  apiBaseUrl?: string;
  appBaseUrl?: string;
  timeout?: number;
  concurrentSessions?: number;
}

export interface DatadogMonitorsSecureJsonData {
  apiKey?: string;
  applicationKey?: string;
}

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