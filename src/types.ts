import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type DatadogQueryType = 'monitor' | 'group_monitor' | 'all';

export interface DatadogMonitorsQuery extends DataQuery {
  queryType: DatadogQueryType;
  datadogQuery?: string;
}

export const DEFAULT_QUERY: Partial<DatadogMonitorsQuery> = {
  queryType: 'monitor',
  datadogQuery: 'status:alert muted:false',
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
  page: number;
  pageCount: number;
  totalCount: number;
  monitorId?: string | number;
  monitorUrl?: string;
  item: unknown;
}