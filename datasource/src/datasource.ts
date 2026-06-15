import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DatadogSearchResponse,
  DEFAULT_QUERY,
  NormalizedDatadogMonitorResult,
} from './types';

interface EndpointConfig {
  source: 'monitor' | 'group_monitor';
  endpoint: '/monitor/search' | '/monitor/groups/search';
  responseField: 'monitors' | 'groups';
}

const MONITOR_ENDPOINT: EndpointConfig = {
  source: 'monitor',
  endpoint: '/monitor/search',
  responseField: 'monitors',
};

const GROUP_MONITOR_ENDPOINT: EndpointConfig = {
  source: 'group_monitor',
  endpoint: '/monitor/groups/search',
  responseField: 'groups',
};

const DEFAULT_PER_PAGE = 100;

export class DataSource extends DataSourceApi<
  DatadogMonitorsQuery,
  DatadogMonitorsDataSourceOptions
> {
  private url?: string;
  private timeout: number;
  private concurrentSessions: number;
  private appBaseUrl: string;

  constructor(instanceSettings: DataSourceInstanceSettings<DatadogMonitorsDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url;
    this.timeout = instanceSettings.jsonData.timeout || 30000;
    this.concurrentSessions = instanceSettings.jsonData.concurrentSessions || 2;
    this.appBaseUrl = this.sanitizeAppBaseUrl(instanceSettings.jsonData.appBaseUrl || '');
  }

  getDefaultQuery(): Partial<DatadogMonitorsQuery> {
    return DEFAULT_QUERY;
  }

  async query(options: DataQueryRequest<DatadogMonitorsQuery>): Promise<DataQueryResponse> {
    const frames = [];

    for (const target of options.targets) {
      if (target.hide) {
        continue;
      }

      const query = {
        ...DEFAULT_QUERY,
        ...target,
      } as DatadogMonitorsQuery;

      const endpoints = this.resolveEndpoints(query.queryType);
      const shouldLoadMonitorDetails = endpoints.some((endpoint) => endpoint.source === 'group_monitor');

      const monitorDetailsById = shouldLoadMonitorDetails
        ? await this.fetchMonitorDetailsMap()
        : new Map<string, Record<string, unknown>>();

      const results = await this.fetchAllEndpoints(endpoints, query, monitorDetailsById);

      const frame = query.outputFormat === 'problems'
        ? this.buildProblemsFrame(target.refId, results)
        : this.buildFrame(target.refId, results);

      frames.push(frame);
    }

    return {
      data: frames,
    };
  }

  async testDatasource() {
    try {
      if (!this.url) {
        return {
          status: 'error',
          message: 'Datasource URL não encontrada.',
        };
      }

      await this.fetchEndpointPage(
        MONITOR_ENDPOINT,
        {
          queryType: 'monitor',
          queryMode: 'builder',
          datadogQuery: 'status:alert muted:false',
          status: ['alert'],
          muted: 'false',
          refId: 'test',
        },
        0
      );

      return {
        status: 'success',
        message: 'Conexão com Datadog realizada com sucesso.',
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Erro ao conectar no Datadog: ${this.getErrorMessage(error)}`,
      };
    }
  }

  private resolveEndpoints(queryType?: string): EndpointConfig[] {
    switch (queryType) {
      case 'monitor':
        return [MONITOR_ENDPOINT];

      case 'group_monitor':
        return [GROUP_MONITOR_ENDPOINT];

      case 'all':
        return [MONITOR_ENDPOINT, GROUP_MONITOR_ENDPOINT];

      default:
        return [MONITOR_ENDPOINT];
    }
  }

  private async fetchAllEndpoints(
    endpoints: EndpointConfig[],
    query: DatadogMonitorsQuery,
    monitorDetailsById: Map<string, Record<string, unknown>>
  ): Promise<NormalizedDatadogMonitorResult[]> {
    const allResults: NormalizedDatadogMonitorResult[] = [];

    /*
     * Mantemos sequencial por enquanto para facilitar debug.
     * concurrentSessions fica reservado para evolução futura.
     */
    for (const endpoint of endpoints) {
      const endpointResults = await this.fetchEndpointWithPagination(
        endpoint,
        query,
        monitorDetailsById
      );

      allResults.push(...endpointResults);
    }

    return allResults;
  }

  private async fetchEndpointWithPagination(
    endpoint: EndpointConfig,
    query: DatadogMonitorsQuery,
    monitorDetailsById: Map<string, Record<string, unknown>>
  ): Promise<NormalizedDatadogMonitorResult[]> {
    const allResults: NormalizedDatadogMonitorResult[] = [];

    let currentPage = 0;
    let pageCount = 1;

    do {
      const response = await this.fetchEndpointPage(endpoint, query, currentPage);

      const metadata = response.metadata || {
        total_count: 0,
        page: currentPage,
        per_page: DEFAULT_PER_PAGE,
        page_count: 1,
      };

      pageCount = metadata.page_count || 1;

      const items = Array.isArray(response[endpoint.responseField])
        ? response[endpoint.responseField] || []
        : [];

      for (const item of items) {
        const normalized = this.normalizeSearchResult(
          endpoint,
          item,
          metadata.page,
          metadata.page_count,
          metadata.total_count,
          monitorDetailsById
        );

        allResults.push(normalized);
      }

      currentPage++;
    } while (currentPage < pageCount);

    return allResults;
  }

  private async fetchEndpointPage(
    endpoint: EndpointConfig,
    query: DatadogMonitorsQuery,
    page: number
  ): Promise<DatadogSearchResponse> {
    if (!this.url) {
      throw new Error('Datasource URL não encontrada.');
    }

    const proxyUrl = `${this.url}/datadog-v1${endpoint.endpoint}`;
    const datadogQuery = this.buildDatadogQuery(query);

    const params = {
      query: datadogQuery,
      per_page: DEFAULT_PER_PAGE,
      page,
    };

    console.debug('[DatadogMonitorsDatasource] Request debug', {
      proxyUrl,
      endpoint: endpoint.endpoint,
      params,
      method: 'GET',
      note: 'Headers DD-API-KEY e DD-APPLICATION-KEY são injetados pelo Grafana Data Proxy via plugin.json.',
    });

    const response = await lastValueFrom(
      getBackendSrv().fetch<DatadogSearchResponse>({
        url: proxyUrl,
        method: 'GET',
        timeout: this.timeout,
        params,
      })
    );

    return response.data;
  }

  private async fetchMonitorDetailsMap(): Promise<Map<string, Record<string, unknown>>> {
    if (!this.url) {
      throw new Error('Datasource URL não encontrada.');
    }

    const proxyUrl = `${this.url}/datadog-v1/monitor`;

    console.debug('[DatadogMonitorsDatasource] Loading monitor details list', {
      proxyUrl,
      method: 'GET',
      note: 'Usado para enriquecer resultados de /monitor/groups/search.',
    });

    const response = await lastValueFrom(
      getBackendSrv().fetch<unknown[]>({
        url: proxyUrl,
        method: 'GET',
        timeout: this.timeout,
      })
    );

    const monitors = Array.isArray(response.data) ? response.data : [];
    const monitorDetailsById = new Map<string, Record<string, unknown>>();

    for (const monitor of monitors) {
      const record = this.toRecord(monitor);
      const id = this.getStringOrNumber(record, 'id');

      if (id !== '') {
        monitorDetailsById.set(id, record);
      }
    }

    return monitorDetailsById;
  }

  private normalizeSearchResult(
    endpoint: EndpointConfig,
    item: unknown,
    page: number,
    pageCount: number,
    totalCount: number,
    monitorDetailsById: Map<string, Record<string, unknown>>
  ): NormalizedDatadogMonitorResult {
    if (endpoint.source === 'group_monitor') {
      return this.normalizeGroupMonitorResult(
        endpoint,
        item,
        page,
        pageCount,
        totalCount,
        monitorDetailsById
      );
    }

    return this.normalizeMonitorResult(endpoint, item, page, pageCount, totalCount);
  }

  private normalizeMonitorResult(
    endpoint: EndpointConfig,
    item: unknown,
    page: number,
    pageCount: number,
    totalCount: number
  ): NormalizedDatadogMonitorResult {
    const record = this.toRecord(item);

    const id = this.getStringOrNumber(record, 'id');
    const monitorUrl = this.buildMonitorUrl(id);

    const rawJson = {
      ...record,
      monitor_url: monitorUrl,
    };

    return {
      source: endpoint.source,
      endpoint: endpoint.endpoint,

      org_url: this.appBaseUrl,
      id,
      type: this.getString(record, 'type'),
      name: this.getString(record, 'name'),
      message: this.getString(record, 'message'),
      query: this.getString(record, 'query'),
      multi: this.getBoolean(record, 'multi'),
      priority: this.getStringOrNumber(record, 'priority'),
      tags: this.getStringArray(record, 'tags'),

      status: this.getString(record, 'status'),
      last_triggered_ts: this.getNumber(record, 'last_triggered_ts', 0),
      muted_until_ts: this.getNullableNumber(record, 'muted_until_ts'),

      monitor_url: monitorUrl,

      page,
      pageCount,
      totalCount,

      rawJson,
    };
  }

  private normalizeGroupMonitorResult(
    endpoint: EndpointConfig,
    item: unknown,
    page: number,
    pageCount: number,
    totalCount: number,
    monitorDetailsById: Map<string, Record<string, unknown>>
  ): NormalizedDatadogMonitorResult {
    const groupRecord = this.toRecord(item);

    const id = this.getStringOrNumber(groupRecord, 'monitor_id');
    const monitorDetail = monitorDetailsById.get(id) || {};

    const monitorName =
      this.getString(groupRecord, 'monitor_name') ||
      this.getString(monitorDetail, 'name');

    const group = this.getString(groupRecord, 'group');

    const name = group ? `${monitorName} | ${group}` : monitorName;

    const allTags = this.getStringArray(groupRecord, 'all_tags');
    const groupTags = this.getStringArray(groupRecord, 'group_tags');
    const detailTags = this.getStringArray(monitorDetail, 'tags');

    const tags = this.uniqueStrings(
      allTags.length > 0 || groupTags.length > 0
        ? [...allTags, ...groupTags]
        : detailTags
    );

    const monitorUrl = this.buildMonitorUrl(id);

    const rawJson = {
      ...groupRecord,
      monitor_url: monitorUrl,
      monitor_detail: monitorDetail,
    };

    return {
      source: endpoint.source,
      endpoint: endpoint.endpoint,

      org_url: this.appBaseUrl,
      id,
      type: this.getString(monitorDetail, 'type'),
      name,
      message: this.getString(monitorDetail, 'message'),
      query: this.getString(monitorDetail, 'query'),
      multi: this.getBoolean(monitorDetail, 'multi'),
      priority: this.getStringOrNumber(monitorDetail, 'priority'),
      tags,

      status: this.getString(groupRecord, 'status'),
      last_triggered_ts: this.getNumber(groupRecord, 'last_triggered_ts', 0),
      muted_until_ts: this.getNullableNumber(groupRecord, 'muted_until_ts'),

      monitor_url: monitorUrl,

      page,
      pageCount,
      totalCount,

      rawJson,
    };
  }

  private buildFrame(refId: string, results: NormalizedDatadogMonitorResult[]) {
    const frame = new MutableDataFrame({
      refId,
      fields: [
        {
          name: 'org_url',
          type: FieldType.string,
        },
        {
          name: 'id',
          type: FieldType.string,
        },
        {
          name: 'type',
          type: FieldType.string,
        },
        {
          name: 'name',
          type: FieldType.string,
        },
        {
          name: 'message',
          type: FieldType.string,
        },
        {
          name: 'query',
          type: FieldType.string,
        },
        {
          name: 'multi',
          type: FieldType.boolean,
        },
        {
          name: 'priority',
          type: FieldType.string,
        },
        {
          name: 'tags',
          type: FieldType.string,
        },
        {
          name: 'status',
          type: FieldType.string,
        },
        {
          name: 'last_triggered_ts',
          type: FieldType.number,
        },
        {
          name: 'muted_until_ts',
          type: FieldType.number,
        },
        {
          name: 'monitor_url',
          type: FieldType.string,
        },
        {
          name: 'source',
          type: FieldType.string,
        },
        {
          name: 'endpoint',
          type: FieldType.string,
        },
        {
          name: 'page',
          type: FieldType.number,
        },
        {
          name: 'page_count',
          type: FieldType.number,
        },
        {
          name: 'total_count',
          type: FieldType.number,
        },
        {
          name: 'raw_json',
          type: FieldType.string,
        },
      ],
    });

    for (const result of results) {
      frame.add({
        org_url: result.org_url,
        id: result.id,
        type: result.type,
        name: result.name,
        message: result.message,
        query: result.query,
        multi: result.multi,
        priority: result.priority,
        tags: JSON.stringify(result.tags),
        status: result.status,
        last_triggered_ts: result.last_triggered_ts,
        muted_until_ts: result.muted_until_ts,
        monitor_url: result.monitor_url,
        source: result.source,
        endpoint: result.endpoint,
        page: result.page,
        page_count: result.pageCount,
        total_count: result.totalCount,
        raw_json: JSON.stringify(result.rawJson),
      });
    }

    return frame;
  }

  private buildProblemsFrame(refId: string, results: NormalizedDatadogMonitorResult[]) {
    const frame = new MutableDataFrame({
      refId,
      fields: [
        {
          name: 'Problems',
          type: FieldType.other,
        },
      ],
    });

    for (const result of results) {
      const problem = {
        source: 'datadog',
        org_url: result.org_url,
        id: result.id,
        type: result.type,
        name: result.name,
        message: result.message,
        query: result.query,
        multi: result.multi,
        priority: result.priority || 'not_defined',
        severity: result.priority || 'not_defined',
        tags: result.tags,
        status: result.status,
        last_triggered_ts: result.last_triggered_ts,
        muted_until_ts: result.muted_until_ts,
        monitor_url: result.monitor_url,
        url: result.monitor_url,
        page: result.page,
        page_count: result.pageCount,
        total_count: result.totalCount,
        raw_json: result.rawJson,
      };

      frame.add({
        Problems: problem,
      });
    }

    return frame;
  }

  private buildDatadogQuery(query: DatadogMonitorsQuery): string {
    if (query.queryMode !== 'builder') {
      return query.datadogQuery || '';
    }

    const parts = [
      this.buildMultiValueFilter('status', query.status),
      query.muted ? `muted:${query.muted}` : '',
      this.buildMultiValueFilter('priority', query.priority),
      this.buildMultiValueFilter('type', query.type),
      this.buildFreeTextFilter('env', query.env),
      this.buildFreeTextFilter('team', query.team),
      this.buildFreeTextFilter('scope', query.scope),
      this.buildFreeTextFilter('tag', query.tag),
      query.extraOptions?.trim() || '',
    ];

    return parts.filter(Boolean).join(' ');
  }

  private buildMultiValueFilter(field: string, values?: string[]): string {
    if (!values || values.length === 0) {
      return '';
    }

    const formattedValues = values.map((value) => this.quoteValueIfNeeded(value));

    if (formattedValues.length === 1) {
      return `${field}:${formattedValues[0]}`;
    }

    return `${field}:(${formattedValues.join(' OR ')})`;
  }

  private buildFreeTextFilter(field: string, value?: string): string {
    if (!value || !value.trim()) {
      return '';
    }

    return `${field}:${value.trim()}`;
  }

  private quoteValueIfNeeded(value: string): string {
    if (/\s/.test(value)) {
      return `"${value}"`;
    }

    return value;
  }

  private buildMonitorUrl(id: string): string {
    if (!id || !this.appBaseUrl) {
      return '';
    }

    return `${this.appBaseUrl}/monitors/${id}`;
  }

  private sanitizeAppBaseUrl(value: string): string {
    return value
      .trim()
      .replace(/\/account\/login\/?$/, '')
      .replace(/\/+$/, '');
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private getString(record: Record<string, unknown>, field: string): string {
    const value = record[field];

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private getStringOrNumber(record: Record<string, unknown>, field: string): string {
    const value = record[field];

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    return '';
  }

  private getNumber(
    record: Record<string, unknown>,
    field: string,
    defaultValue: number
  ): number {
    const value = record[field];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return defaultValue;
  }

  private getNullableNumber(record: Record<string, unknown>, field: string): number | null {
    const value = record[field];

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private getBoolean(record: Record<string, unknown>, field: string): boolean {
    const value = record[field];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return false;
  }

  private getStringArray(record: Record<string, unknown>, field: string): string[] {
    const value = record[field];

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return JSON.stringify(error);
  }
}