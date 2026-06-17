import { DataSourcePlugin } from '@grafana/data';

import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DataSource } from './datasource';
import { DatadogObservabilityDataSourceOptions, DatadogObservabilityQuery } from './types';

export const plugin = new DataSourcePlugin<DataSource, DatadogObservabilityQuery, DatadogObservabilityDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
