import { DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  DatadogObservabilityDataSourceOptions,
  DatadogObservabilityQuery,
  DEFAULT_QUERY,
} from './types';

export class DataSource extends DataSourceWithBackend<DatadogObservabilityQuery, DatadogObservabilityDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DatadogObservabilityDataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(): Partial<DatadogObservabilityQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: DatadogObservabilityQuery, scopedVars: ScopedVars): DatadogObservabilityQuery {
    const replace = (value?: string) => getTemplateSrv().replace(value || '', scopedVars);

    return {
      ...query,
      datadogQuery: replace(query.datadogQuery),
      metricQuery: replace(query.metricQuery),
      metricAlias: replace(query.metricAlias),
      env: replace(query.env),
      team: replace(query.team),
      scope: replace(query.scope),
      tag: replace(query.tag),
      extraOptions: replace(query.extraOptions),
    };
  }

  filterQuery(query: DatadogObservabilityQuery): boolean {
    return !query.hide;
  }

  getQueryDisplayText(query: DatadogObservabilityQuery): string {
    if (query.queryType === 'metric') {
      return query.metricQuery || '';
    }

    return query.queryMode === 'builder' ? 'Datadog Monitors builder query' : query.datadogQuery || '';
  }
}
