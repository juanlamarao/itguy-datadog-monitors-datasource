import { PanelPlugin } from '@grafana/data';

import { DatadogMonitorsPanel } from './DatadogMonitorsPanel';
import { DatadogMonitorsPanelOptions } from './types';

export const plugin = new PanelPlugin<DatadogMonitorsPanelOptions>(DatadogMonitorsPanel).setPanelOptions(
  (builder) => {
    builder
      .addTextInput({
        path: 'title',
        name: 'Panel title',
        description: 'Título exibido no topo do widget',
        defaultValue: 'Datadog Monitors Overview',
      })
      .addBooleanSwitch({
        path: 'showSummaryCards',
        name: 'Show summary cards',
        description: 'Exibe cards de resumo no topo',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showOkCard',
        name: 'Show OK card',
        description: 'Exibe card de monitores OK',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showMutedCard',
        name: 'Show Muted card',
        description: 'Exibe card de monitores mutados',
        defaultValue: true,
      });
  }
);