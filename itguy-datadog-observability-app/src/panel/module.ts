import { PanelPlugin } from '@grafana/data';

import { DatadogMonitorsPanel } from './components/DatadogMonitorsPanel';
import { DatadogMonitorsPanelOptions } from './types';
import { configurePanelOptions } from './options';

export const plugin = new PanelPlugin<DatadogMonitorsPanelOptions>(DatadogMonitorsPanel).setPanelOptions(configurePanelOptions);
