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
        name: 'Show status stats',
        description: 'Exibe cards de resumo por status no topo',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showOkCard',
        name: 'Show OK status stat',
        description: 'Exibe o card de monitores OK nos stats de status',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showPrioritySummaryCards',
        name: 'Show priority stats',
        description: 'Exibe cards de resumo por prioridade',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'enablePagination',
        name: 'Enable pagination',
        category: ['Table'],
        description: 'Habilita paginação na lista de monitores',
        defaultValue: true,
      })
      .addNumberInput({
        path: 'pageSize',
        name: 'Default page size',
        category: ['Table'],
        description: 'Quantidade padrão de monitores por página',
        defaultValue: 10,
        settings: {
          min: 1,
          max: 500,
          integer: true,
        },
      })
      .addBooleanSwitch({
        path: 'enableColumnFilters',
        name: 'Enable column filters',
        category: ['Table'],
        description: 'Exibe ícones de filtro nos cabeçalhos das colunas',
        defaultValue: true,
      })
      .addSelect({
        path: 'defaultSortField',
        name: 'Default sort field',
        category: ['Sorting'],
        description: 'Campo usado na ordenação inicial',
        defaultValue: 'problem_recent',
        settings: {
          options: [
            { value: 'problem_recent', label: 'Problem recent' },
            { value: 'status', label: 'Status' },
            { value: 'priority', label: 'Priority' },
            { value: 'name', label: 'Monitor name' },
            { value: 'scope', label: 'Scope' },
            { value: 'duration', label: 'Duration' },
            { value: 'lastTriggered', label: 'Last triggered' },
          ],
        },
      })
      .addSelect({
        path: 'defaultSortDirection',
        name: 'Default sort direction',
        category: ['Sorting'],
        description: 'Direção inicial da ordenação',
        defaultValue: 'desc',
        settings: {
          options: [
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
          ],
        },
      })
      .addBooleanSwitch({
        path: 'prioritizeProblemRows',
        name: 'Prioritize active problems',
        category: ['Sorting'],
        description: 'Mantém monitores em problema antes dos monitores OK/sem duração',
        defaultValue: true,
      });

    const statusColorOptions = [
      ['statusColors.critical', 'Critical color', '#E02F44'],
      ['statusColors.alert', 'Alert color', '#F2495C'],
      ['statusColors.warn', 'Warn color', '#FFB357'],
      ['statusColors.noData', 'No data color', '#5794F2'],
      ['statusColors.ok', 'OK color', '#73BF69'],
      ['statusColors.unknown', 'Unknown color', '#8E8E8E'],
      ['statusColors.muted', 'Muted icon color', '#FF8A00'],
    ];

    statusColorOptions.forEach(([path, name, defaultValue]) => {
      builder.addTextInput({
        path,
        name,
        category: ['Status colors'],
        description: 'Cor em HEX ou CSS color. Exemplo: #F2495C',
        defaultValue,
      });
    });

    const priorityColorOptions = [
      ['priorityColors.p1', 'P1 color', '#E02F44'],
      ['priorityColors.p2', 'P2 color', '#FF9830'],
      ['priorityColors.p3', 'P3 color', '#FFB357'],
      ['priorityColors.p4', 'P4 color', '#5794F2'],
      ['priorityColors.p5', 'P5 color', '#8E8E8E'],
      ['priorityColors.notDefined', 'No priority color', '#8E8E8E'],
    ];

    priorityColorOptions.forEach(([path, name, defaultValue]) => {
      builder.addTextInput({
        path,
        name,
        category: ['Priority colors'],
        description: 'Cor em HEX ou CSS color. Exemplo: #FF9830',
        defaultValue,
      });
    });

    const tagColorOptions = [
      ['tagColors.color1', 'Tag color 1', '#5794F2'],
      ['tagColors.color2', 'Tag color 2', '#73BF69'],
      ['tagColors.color3', 'Tag color 3', '#FFB357'],
      ['tagColors.color4', 'Tag color 4', '#B877D9'],
      ['tagColors.color5', 'Tag color 5', '#FF7383'],
      ['tagColors.color6', 'Tag color 6', '#56A64B'],
      ['tagColors.color7', 'Tag color 7', '#FADE2A'],
      ['tagColors.color8', 'Tag color 8', '#8AB8FF'],
    ];

    tagColorOptions.forEach(([path, name, defaultValue]) => {
      builder.addTextInput({
        path,
        name,
        category: ['Tag colors'],
        description: 'Cor sequencial usada nas labels de tags',
        defaultValue,
      });
    });
  }
);