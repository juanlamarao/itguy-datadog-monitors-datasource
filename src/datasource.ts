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

export class DataSource extends DataSourceApi<
  DatadogMonitorsQuery,
  DatadogMonitorsDataSourceOptions
> {
  private url?: string;
  private timeout: number;
  private concurrentSessions: number;

  constructor(instanceSettings: DataSourceInstanceSettings<DatadogMonitorsDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url;
    this.timeout = instanceSettings.jsonData.timeout || 30000;
    this.concurrentSessions = instanceSettings.jsonData.concurrentSessions || 2;
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

      await this.fetchEndpointPage(MONITOR_ENDPOINT, {
        queryType: 'monitor',
        datadogQuery: '',
        perPage: 1,
        refId: 'test',
      }, 0);

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
      default:
        return [MONITOR_ENDPOINT, GROUP_MONITOR_ENDPOINT];
    }
  }

  private async fetchAllEndpoints(
    endpoints: EndpointConfig[],
    query: DatadogMonitorsQuery
  ): Promise<NormalizedDatadogMonitorResult[]> {
    const allResults: NormalizedDatadogMonitorResult[] = [];

    /*
     * Nesta primeira versão, vamos manter a execução sequencial para facilitar debug.
     * Depois evoluímos para respeitar concurrentSessions com fila/limite real de concorrência.
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
        per_page: query.perPage || 100,
        page_count: 1,
      };

      pageCount = metadata.page_count || 1;

      const items = Array.isArray(response[endpoint.responseField])
        ? response[endpoint.responseField] || []
        : [];

      for (const item of items) {
        allResults.push({
          source: endpoint.source,
          endpoint: endpoint.endpoint,
          page: metadata.page,
          pageCount: metadata.page_count,
          totalCount: metadata.total_count,
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

    const perPage = query.perPage || 100;

    const response = await lastValueFrom(
      getBackendSrv().fetch<DatadogSearchResponse>({
        url: `${this.url}/datadog${endpoint.endpoint}`,
        method: 'GET',
        timeout: this.timeout,
        params: {
          query: query.datadogQuery || '',
          per_page: perPage,
          page,
        },
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
        page: result.page,
        page_count: result.pageCount,
        total_count: result.totalCount,
        raw_json: JSON.stringify(result.item),
      });
    }

    return frame;
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