import { DataSourcePlugin } from '@grafana/data';

import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DataSource } from './datasource';
import { DatadogMonitorsDataSourceOptions, DatadogMonitorsQuery } from './types';

export const plugin = new DataSourcePlugin<DataSource, DatadogMonitorsQuery, DatadogMonitorsDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
