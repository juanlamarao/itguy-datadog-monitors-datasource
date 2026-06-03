import { DataSourcePlugin } from '@grafana/data';

import { DataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DatadogMonitorsQuery, DatadogMonitorsDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, DatadogMonitorsQuery, DatadogMonitorsDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);