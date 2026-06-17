import {
  DataSourceInstanceSettings,
  ScopedVars,
} from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DEFAULT_QUERY,
} from './types';

export class DataSource extends DataSourceWithBackend<DatadogMonitorsQuery, DatadogMonitorsDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DatadogMonitorsDataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(): Partial<DatadogMonitorsQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: DatadogMonitorsQuery, scopedVars: ScopedVars): DatadogMonitorsQuery {
    const replace = (value?: string) => getTemplateSrv().replace(value || '', scopedVars);

    return {
      ...query,
      datadogQuery: replace(query.datadogQuery),
      env: replace(query.env),
      team: replace(query.team),
      scope: replace(query.scope),
      tag: replace(query.tag),
      extraOptions: replace(query.extraOptions),
    };
  }

  filterQuery(query: DatadogMonitorsQuery): boolean {
    return !query.hide;
  }

  // Mantido para facilitar debug no Explore/Query Inspector.
  getQueryDisplayText(query: DatadogMonitorsQuery): string {
    return query.queryMode === 'builder' ? 'Datadog Monitors builder query' : query.datadogQuery || '';
  }
}
