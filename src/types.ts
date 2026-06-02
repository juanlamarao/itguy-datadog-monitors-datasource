import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type DatadogQueryType = 'monitor' | 'group_monitor' | 'all';

export interface DatadogMonitorsQuery extends DataQuery {
  queryType: DatadogQueryType;
  datadogQuery?: string;
  perPage?: number;
}

export const DEFAULT_QUERY: Partial<DatadogMonitorsQuery> = {
  queryType: 'all',
  datadogQuery: 'status:Alert',
  perPage: 100,
};

export interface DatadogMonitorsDataSourceOptions extends DataSourceJsonData {
  apiBaseUrl?: string;
  apiVersion?: 'v1' | 'v2';
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
  item: unknown;
}