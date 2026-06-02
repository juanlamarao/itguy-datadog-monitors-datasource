import React from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  Button,
  InlineField,
  Input,
  RadioButtonGroup,
  Select,
  Tooltip,
  Icon,
} from '@grafana/ui';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DatadogQueryMode,
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

const queryModeOptions: Array<SelectableValue<DatadogQueryMode>> = [
  { label: 'Builder', value: 'builder' },
  { label: 'Raw query', value: 'raw' },
];

const queryTypeOptions: Array<SelectableValue<DatadogQueryType>> = [
  { label: 'monitor', value: 'monitor' },
  { label: 'group monitor', value: 'group_monitor' },
  { label: 'all', value: 'all' },
];

const statusOptions: Array<SelectableValue<string>> = [
  { label: 'alert', value: 'alert' },
  { label: 'warn', value: 'warn' },
  { label: 'no data', value: 'no data' },
  { label: 'ok', value: 'ok' },
];

const mutedOptions: Array<SelectableValue<string>> = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' },
];

const priorityOptions: Array<SelectableValue<string>> = [
  { label: 'p1', value: 'p1' },
  { label: 'p2', value: 'p2' },
  { label: 'p3', value: 'p3' },
  { label: 'p4', value: 'p4' },
  { label: 'p5', value: 'p5' },
  { label: 'not_definied', value: 'not_definied' },
];

const typeOptions: Array<SelectableValue<string>> = [
  { label: 'synthetics', value: 'synthetics' },
  { label: 'integration', value: 'integration' },
  { label: 'metric', value: 'metric' },
  { label: 'log', value: 'log' },
  { label: 'apm', value: 'apm' },
  { label: 'trace-analytics', value: 'trace-analytics' },
  { label: 'anomaly', value: 'anomaly' },
  { label: 'watchdog', value: 'watchdog' },
  { label: 'composite', value: 'composite' },
  { label: 'custom', value: 'custom' },
  { label: 'event', value: 'event' },
  { label: 'host', value: 'host' },
  { label: 'forecast', value: 'forecast' },
  { label: 'live_process', value: 'live_process' },
  { label: 'network', value: 'network' },
  { label: 'outlier', value: 'outlier' },
  { label: 'process', value: 'process' },
];

function toSelectableValues(values?: string[]): Array<SelectableValue<string>> {
  return (values || []).map((value) => ({
    label: value,
    value,
  }));
}

function fromSelectableValues(values: Array<SelectableValue<string>>): string[] {
  return values
    .map((item) => item.value)
    .filter((value): value is string => Boolean(value));
}

/**
 * Regra:
 * - 1 valor: status:alert
 * - múltiplos valores: status:(alert OR warn)
 *
 * Mantém exatamente o texto dos valores definidos nos options.
 */
function buildMultiValueFilter(field: string, values?: string[]): string {
  if (!values || values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return `${field}:${values[0]}`;
  }

  return `${field}:(${values.join(' OR ')})`;
}

function buildFreeTextFilter(field: string, value?: string): string {
  if (!value || !value.trim()) {
    return '';
  }

  return `${field}:${value.trim()}`;
}

function buildBuilderQuery(query: DatadogMonitorsQuery): string {
  const parts = [
    buildMultiValueFilter('status', query.status),
    query.muted ? `muted:${query.muted}` : '',
    buildMultiValueFilter('priority', query.priority),
    buildMultiValueFilter('type', query.type),
    buildFreeTextFilter('env', query.env),
    buildFreeTextFilter('team', query.team),
    buildFreeTextFilter('scope', query.scope),
    buildFreeTextFilter('tag', query.tag),
  ];

  return parts.filter(Boolean).join(' ');
}

const freeTextHelp = (
  <div style={{ maxWidth: 520 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>
      Campos livres
    </div>

    <div style={{ marginBottom: 8 }}>
      Informe apenas o valor que será colocado depois do nome do campo.
      O plugin vai montar a query respeitando o nome exato do campo.
    </div>

    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`env:prod
team:sre
scope:*
tag:("env:prod" AND "check_status:live")`}
    </pre>

    <div style={{ marginTop: 8 }}>
      Para o campo <code>tag</code>, você pode usar expressões compostas.
    </div>
  </div>
);

const rawQueryHelp = (
  <div style={{ maxWidth: 520 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>
      Datadog query
    </div>

    <div style={{ marginBottom: 8 }}>
      Escreva manualmente a query enviada para o parâmetro <code>query</code>
      do endpoint de busca de monitores do Datadog.
    </div>

    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`status:alert muted:false
status:(alert OR warn) muted:false
type:metric status:alert
type:metric group_status:alert
tag:("env:prod" AND "check_status:live")`}
    </pre>

    <div style={{ marginTop: 8 }}>
      <a href={DATADOG_MONITOR_SEARCH_DOC_URL} target="_blank" rel="noreferrer">
        Documentação oficial: Search Monitors
      </a>
    </div>
  </div>
);

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const currentQueryType = query.queryType || 'monitor';
  const currentQueryMode = query.queryMode || 'raw';

  const builderQuery = buildBuilderQuery(query);

  const updateQuery = (patch: Partial<DatadogMonitorsQuery>) => {
    onChange({
      ...query,
      ...patch,
    });
  };

  return (
    <>
      <InlineField label="Query mode" labelWidth={18}>
        <RadioButtonGroup
          options={queryModeOptions}
          value={currentQueryMode}
          onChange={(value) => updateQuery({ queryMode: value })}
        />
      </InlineField>

      <InlineField label="Query type" labelWidth={18}>
        <Select
          width={30}
          value={currentQueryType}
          options={queryTypeOptions}
          onChange={(option) =>
            updateQuery({
              queryType: (option.value || 'monitor') as DatadogQueryType,
            })
          }
        />
      </InlineField>

      {currentQueryMode === 'builder' && (
        <>
          <InlineField label="Status" labelWidth={18}>
            <Select
              width={40}
              isMulti
              options={statusOptions}
              value={toSelectableValues(query.status)}
              placeholder="alert, warn, no data, ok"
              onChange={(values) =>
                updateQuery({
                  status: fromSelectableValues(values),
                })
              }
            />
          </InlineField>

          <InlineField label="Muted" labelWidth={18}>
            <Select
              width={20}
              isClearable
              options={mutedOptions}
              value={query.muted || null}
              placeholder="true/false"
              onChange={(option) =>
                updateQuery({
                  muted: (option?.value || '') as 'true' | 'false' | '',
                })
              }
            />
          </InlineField>

          <InlineField label="Priority" labelWidth={18}>
            <Select
              width={40}
              isMulti
              options={priorityOptions}
              value={toSelectableValues(query.priority)}
              placeholder="p1, p2, p3, p4, p5, not_definied"
              onChange={(values) =>
                updateQuery({
                  priority: fromSelectableValues(values),
                })
              }
            />
          </InlineField>

          <InlineField label="Type" labelWidth={18}>
            <Select
              width={50}
              isMulti
              options={typeOptions}
              value={toSelectableValues(query.type)}
              placeholder="metric, log, apm..."
              onChange={(values) =>
                updateQuery({
                  type: fromSelectableValues(values),
                })
              }
            />
          </InlineField>

          <InlineField
            label={
              <span>
                Env{' '}
                <Tooltip content={freeTextHelp} placement="top">
                  <Icon name="question-circle" />
                </Tooltip>
              </span>
            }
            labelWidth={18}
          >
            <Input
              width={40}
              value={query.env || ''}
              placeholder="prod"
              onChange={(event) =>
                updateQuery({
                  env: event.currentTarget.value,
                })
              }
            />
          </InlineField>

          <InlineField
            label={
              <span>
                Team{' '}
                <Tooltip content={freeTextHelp} placement="top">
                  <Icon name="question-circle" />
                </Tooltip>
              </span>
            }
            labelWidth={18}
          >
            <Input
              width={40}
              value={query.team || ''}
              placeholder="sre"
              onChange={(event) =>
                updateQuery({
                  team: event.currentTarget.value,
                })
              }
            />
          </InlineField>

          <InlineField
            label={
              <span>
                Scope{' '}
                <Tooltip content={freeTextHelp} placement="top">
                  <Icon name="question-circle" />
                </Tooltip>
              </span>
            }
            labelWidth={18}
          >
            <Input
              width={50}
              value={query.scope || ''}
              placeholder="*"
              onChange={(event) =>
                updateQuery({
                  scope: event.currentTarget.value,
                })
              }
            />
          </InlineField>

          <InlineField
            label={
              <span>
                Tag{' '}
                <Tooltip content={freeTextHelp} placement="top">
                  <Icon name="question-circle" />
                </Tooltip>
              </span>
            }
            labelWidth={18}
          >
            <Input
              width={70}
              value={query.tag || ''}
              placeholder={'("env:prod" AND "check_status:live")'}
              onChange={(event) =>
                updateQuery({
                  tag: event.currentTarget.value,
                })
              }
            />
          </InlineField>

          <InlineField label="Generated query" labelWidth={18}>
            <Input width={90} value={builderQuery} readOnly />
          </InlineField>
        </>
      )}

      {currentQueryMode === 'raw' && (
        <InlineField
          label={
            <span>
              Datadog query{' '}
              <Tooltip content={rawQueryHelp} placement="top">
                <Icon name="question-circle" />
              </Tooltip>
            </span>
          }
          labelWidth={18}
        >
          <Input
            width={80}
            value={query.datadogQuery || ''}
            placeholder="status:alert muted:false"
            onChange={(event) =>
              updateQuery({
                datadogQuery: event.currentTarget.value,
              })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onRunQuery();
              }
            }}
          />
        </InlineField>
      )}

      <Button variant="primary" size="sm" onClick={() => onRunQuery()}>
        Run query
      </Button>
    </>
  );
};

export { buildBuilderQuery };