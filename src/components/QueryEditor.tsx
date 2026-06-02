import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Button, Icon, InlineField, Input, Select, Tooltip } from '@grafana/ui';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DatadogQueryType,
} from '../types';
import { DataSource } from '../datasource';

type Props = QueryEditorProps<
  DataSource,
  DatadogMonitorsQuery,
  DatadogMonitorsDataSourceOptions
>;

const DATADOG_MONITOR_SEARCH_DOC_URL =
  'https://docs.datadoghq.com/monitors/manage/search/';

const DATADOG_MONITORS_API_DOC_URL =
  'https://docs.datadoghq.com/api/latest/monitors/';

const queryHelp = (
  <div style={{ maxWidth: 520 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>
      Datadog monitor search query
    </div>

    <div style={{ marginBottom: 8 }}>
      Use a mesma sintaxe da busca de monitores do Datadog. Você pode filtrar por
      status, tipo, nome, tags, serviço, ambiente, entre outros atributos
      disponíveis na tela de Manage Monitors.
    </div>

    <div style={{ marginBottom: 8 }}>
      Exemplos:
    </div>

    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`status:Alert
type:metric
type:metric status:Alert
group_status:alert
type:metric group_status:alert
service:meu-servico
env:prod
team:sre
"nome parcial do monitor"`}
    </pre>

    <div style={{ marginTop: 8 }}>
      Dica: monte a busca na tela do Datadog e copie o valor do parâmetro
      <code> query </code>
      da URL, quando disponível.
    </div>

    <div style={{ marginTop: 8 }}>
      <a
        href={DATADOG_MONITOR_SEARCH_DOC_URL}
        target="_blank"
        rel="noreferrer"
      >
        Documentação: Search Monitors
      </a>
      {' | '}
      <a
        href={DATADOG_MONITORS_API_DOC_URL}
        target="_blank"
        rel="noreferrer"
      >
        API: Monitors
      </a>
    </div>
  </div>
);

const queryTypeHelp = (
  <div style={{ maxWidth: 420 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>
      Query type
    </div>

    <div style={{ marginBottom: 8 }}>
      Escolha qual endpoint do Datadog será consultado.
    </div>

    <ul style={{ paddingLeft: 18, margin: 0 }}>
      <li>
        <b>monitor:</b> consulta <code>/monitor/search</code>.
      </li>
      <li>
        <b>group monitor:</b> consulta <code>/monitor/groups/search</code>.
      </li>
      <li>
        <b>all:</b> consulta os dois endpoints e consolida o resultado.
      </li>
    </ul>
  </div>
);

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const currentQueryType = query.queryType || 'monitor';

  const onQueryTypeChange = (value: DatadogQueryType) => {
    onChange({
      ...query,
      queryType: value,
    });
  };

  const onDatadogQueryChange = (value: string) => {
    onChange({
      ...query,
      datadogQuery: value,
    });
  };

  return (
    <>
      <InlineField
        label={
          <span>
            Query type{' '}
            <Tooltip content={queryTypeHelp} placement="top">
              <Icon name="question-circle" />
            </Tooltip>
          </span>
        }
        labelWidth={18}
      >
        <Select
          width={30}
          value={currentQueryType}
          options={[
            { label: 'monitor', value: 'monitor' },
            { label: 'group monitor', value: 'group_monitor' },
            { label: 'all', value: 'all' },
          ]}
          onChange={(option) =>
            onQueryTypeChange((option.value || 'monitor') as DatadogQueryType)
          }
        />
      </InlineField>

      <InlineField
        label={
          <span>
            Datadog query{' '}
            <Tooltip content={queryHelp} placement="top">
              <Icon name="question-circle" />
            </Tooltip>
          </span>
        }
        labelWidth={18}
      >
        <Input
          width={60}
          value={query.datadogQuery || ''}
          placeholder="Exemplo: status:Alert"
          onChange={(event) => onDatadogQueryChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onRunQuery();
            }
          }}
        />
      </InlineField>

      <Button variant="primary" size="sm" onClick={() => onRunQuery()}>
        Run query
      </Button>
    </>
  );
};