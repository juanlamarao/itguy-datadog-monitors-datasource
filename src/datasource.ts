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
  private appBaseUrl?: string;

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
      const results = await this.fetchAllEndpoints(endpoints, query);

      const frame = this.buildFrame(target.refId, results);
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
          datadogQuery: '',
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
    query: DatadogMonitorsQuery
  ): Promise<NormalizedDatadogMonitorResult[]> {
    const allResults: NormalizedDatadogMonitorResult[] = [];

    /*
     * Mantemos sequencial por enquanto para facilitar debug.
     * concurrentSessions fica reservado para a próxima evolução.
     */
    for (const endpoint of endpoints) {
      const endpointResults = await this.fetchEndpointWithPagination(endpoint, query);
      allResults.push(...endpointResults);
    }

    return allResults;
  }

  private async fetchEndpointWithPagination(
    endpoint: EndpointConfig,
    query: DatadogMonitorsQuery
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
        const monitorId = this.extractMonitorId(endpoint.source, item);
        const monitorUrl = this.buildMonitorUrl(monitorId);

        allResults.push({
          source: endpoint.source,
          endpoint: endpoint.endpoint,
          page: metadata.page,
          pageCount: metadata.page_count,
          totalCount: metadata.total_count,
          monitorId,
          monitorUrl,
          item,
        });
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

    const params = {
      query: query.datadogQuery || '',
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

  private buildFrame(refId: string, results: NormalizedDatadogMonitorResult[]) {
    const frame = new MutableDataFrame({
      refId,
      fields: [
        {
          name: 'source',
          type: FieldType.string,
        },
        {
          name: 'endpoint',
          type: FieldType.string,
        },
        {
          name: 'monitor_id',
          type: FieldType.string,
        },
        {
          name: 'monitor_url',
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
        source: result.source,
        endpoint: result.endpoint,
        monitor_id: result.monitorId ? String(result.monitorId) : '',
        monitor_url: result.monitorUrl || '',
        page: result.page,
        page_count: result.pageCount,
        total_count: result.totalCount,
        raw_json: JSON.stringify(result.item),
      });
    }

    return frame;
  }

  private extractMonitorId(
    source: 'monitor' | 'group_monitor',
    item: unknown
  ): string | number | undefined {
    if (!item || typeof item !== 'object') {
      return undefined;
    }

    const record = item as Record<string, unknown>;

    if (source === 'monitor') {
      const id = record.id;

      if (typeof id === 'string' || typeof id === 'number') {
        return id;
      }
    }

    if (source === 'group_monitor') {
      const monitorId = record.monitor_id;

      if (typeof monitorId === 'string' || typeof monitorId === 'number') {
        return monitorId;
      }
    }

    return undefined;
  }

  private buildMonitorUrl(monitorId?: string | number): string {
    if (!monitorId || !this.appBaseUrl) {
      return '';
    }

    return `${this.appBaseUrl}/monitors/${monitorId}`;
  }

  private sanitizeAppBaseUrl(value: string): string {
    return value
      .trim()
      .replace(/\/account\/login\/?$/, '')
      .replace(/\/+$/, '');
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