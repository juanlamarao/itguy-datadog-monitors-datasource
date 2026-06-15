import React from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  Button,
  Icon,
  InlineField,
  Input,
  RadioButtonGroup,
  Select,
  Tooltip,
} from '@grafana/ui';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DatadogOutputFormat,
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

const DATADOG_MONITORS_API_DOC_URL =
  'https://docs.datadoghq.com/api/latest/monitors/';

const FIELD_GAP_STYLE: React.CSSProperties = {
  marginBottom: 8,
};

const LABEL_WITH_TOOLTIP_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const queryModeOptions: Array<SelectableValue<DatadogQueryMode>> = [
  { label: 'Builder', value: 'builder' },
  { label: 'Raw query', value: 'raw' },
];

const queryTypeOptions: Array<SelectableValue<DatadogQueryType>> = [
  { label: 'monitor', value: 'monitor' },
  { label: 'group monitor', value: 'group_monitor' },
  { label: 'all', value: 'all' },
];

const outputFormatOptions: Array<SelectableValue<DatadogOutputFormat>> = [
  { label: 'Table fields', value: 'table' },
  { label: 'Problems object', value: 'problems' },
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
  { label: 'not_defined', value: 'not_defined' },
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

const allowedStatusValues = statusOptions.map((item) => item.value || '');
const allowedPriorityValues = priorityOptions.map((item) => item.value || '');
const allowedTypeValues = typeOptions.map((item) => item.value || '');

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

function quoteValueIfNeeded(value: string): string {
  if (/\s/.test(value)) {
    return `"${value}"`;
  }

  return value;
}

/**
 * Regra:
 * - 1 valor: status:alert
 * - 1 valor com espaço: status:"no data"
 * - múltiplos valores: status:(alert OR warn OR "no data")
 */
function buildMultiValueFilter(field: string, values?: string[]): string {
  if (!values || values.length === 0) {
    return '';
  }

  const formattedValues = values.map(quoteValueIfNeeded);

  if (formattedValues.length === 1) {
    return `${field}:${formattedValues[0]}`;
  }

  return `${field}:(${formattedValues.join(' OR ')})`;
}

function buildFreeTextFilter(field: string, value?: string): string {
  if (!value || !value.trim()) {
    return '';
  }

  return `${field}:${value.trim()}`;
}

export function buildBuilderQuery(query: DatadogMonitorsQuery): string {
  const parts = [
    buildMultiValueFilter('status', query.status),
    query.muted ? `muted:${query.muted}` : '',
    buildMultiValueFilter('priority', query.priority),
    buildMultiValueFilter('type', query.type),
    buildFreeTextFilter('env', query.env),
    buildFreeTextFilter('team', query.team),
    buildFreeTextFilter('scope', query.scope),
    buildFreeTextFilter('tag', query.tag),
    query.extraOptions?.trim() || '',
  ];

  return parts.filter(Boolean).join(' ');
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripWrappingParentheses(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function splitByOrOutsideQuotes(value: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    const nextFourChars = value.slice(index, index + 4);

    if (!inQuotes && nextFourChars === ' OR ') {
      result.push(current.trim());
      current = '';
      index += 3;
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function parseMultiValue(rawValue: string): string[] {
  const withoutParentheses = stripWrappingParentheses(rawValue);

  return splitByOrOutsideQuotes(withoutParentheses)
    .map(stripWrappingQuotes)
    .map((value) => value.trim())
    .filter(Boolean);
}

interface ExtractedFilter {
  field: string;
  rawValue: string;
  start: number;
  end: number;
}

function isBoundaryChar(char?: string): boolean {
  return !char || /\s|\(|\)/.test(char);
}

/**
 * Parser best effort para extrair field:value de uma query livre.
 *
 * Ele suporta:
 * - status:alert
 * - status:"no data"
 * - status:(alert OR "no data")
 * - tag:("env:prod" AND "check_status:live")
 *
 * O que não for reconhecido fica no Extra options.
 */
function extractFilters(rawQuery: string, field: string): ExtractedFilter[] {
  const filters: ExtractedFilter[] = [];
  const needle = `${field}:`;

  let index = 0;

  while (index < rawQuery.length) {
    const foundIndex = rawQuery.indexOf(needle, index);

    if (foundIndex === -1) {
      break;
    }

    const previousChar = rawQuery[foundIndex - 1];

    if (!isBoundaryChar(previousChar)) {
      index = foundIndex + needle.length;
      continue;
    }

    const valueStart = foundIndex + needle.length;
    let valueEnd = valueStart;

    if (rawQuery[valueStart] === '(') {
      let depth = 0;
      let inQuotes = false;

      for (let cursor = valueStart; cursor < rawQuery.length; cursor++) {
        const char = rawQuery[cursor];

        if (char === '"') {
          inQuotes = !inQuotes;
        }

        if (!inQuotes && char === '(') {
          depth++;
        }

        if (!inQuotes && char === ')') {
          depth--;

          if (depth === 0) {
            valueEnd = cursor + 1;
            break;
          }
        }
      }

      if (valueEnd === valueStart) {
        valueEnd = rawQuery.length;
      }
    } else if (rawQuery[valueStart] === '"') {
      valueEnd = valueStart + 1;

      while (valueEnd < rawQuery.length) {
        if (rawQuery[valueEnd] === '"') {
          valueEnd++;
          break;
        }

        valueEnd++;
      }
    } else {
      valueEnd = valueStart;

      while (valueEnd < rawQuery.length && !/\s/.test(rawQuery[valueEnd])) {
        valueEnd++;
      }
    }

    filters.push({
      field,
      rawValue: rawQuery.slice(valueStart, valueEnd),
      start: foundIndex,
      end: valueEnd,
    });

    index = valueEnd;
  }

  return filters;
}

function removeRanges(rawQuery: string, ranges: Array<{ start: number; end: number }>): string {
  const sortedRanges = [...ranges].sort((a, b) => b.start - a.start);

  let output = rawQuery;

  for (const range of sortedRanges) {
    output = `${output.slice(0, range.start)} ${output.slice(range.end)}`;
  }

  return normalizeSpaces(output);
}

function valuesAreAllowed(values: string[], allowedValues: string[]): boolean {
  return values.every((value) => allowedValues.includes(value));
}

function parseRawQueryToBuilder(rawQuery: string): Partial<DatadogMonitorsQuery> {
  const filtersToRemove: Array<{ start: number; end: number }> = [];

  const statusFilters = extractFilters(rawQuery, 'status');
  const mutedFilters = extractFilters(rawQuery, 'muted');
  const priorityFilters = extractFilters(rawQuery, 'priority');
  const typeFilters = extractFilters(rawQuery, 'type');
  const envFilters = extractFilters(rawQuery, 'env');
  const teamFilters = extractFilters(rawQuery, 'team');
  const scopeFilters = extractFilters(rawQuery, 'scope');
  const tagFilters = extractFilters(rawQuery, 'tag');

  const parsedStatus = statusFilters.flatMap((filter) => parseMultiValue(filter.rawValue));
  const parsedPriority = priorityFilters.flatMap((filter) => parseMultiValue(filter.rawValue));
  const parsedType = typeFilters.flatMap((filter) => parseMultiValue(filter.rawValue));

  const status =
    parsedStatus.length > 0 && valuesAreAllowed(parsedStatus, allowedStatusValues)
      ? parsedStatus
      : undefined;

  const priority =
    parsedPriority.length > 0 && valuesAreAllowed(parsedPriority, allowedPriorityValues)
      ? parsedPriority
      : undefined;

  const type =
    parsedType.length > 0 && valuesAreAllowed(parsedType, allowedTypeValues)
      ? parsedType
      : undefined;

  if (status) {
    filtersToRemove.push(...statusFilters);
  }

  if (priority) {
    filtersToRemove.push(...priorityFilters);
  }

  if (type) {
    filtersToRemove.push(...typeFilters);
  }

  const mutedRawValue = mutedFilters[0]?.rawValue;
  const mutedValue = mutedRawValue ? stripWrappingQuotes(mutedRawValue) : '';

  const muted =
    mutedValue === 'true' || mutedValue === 'false'
      ? (mutedValue as 'true' | 'false')
      : '';

  if (muted) {
    filtersToRemove.push(mutedFilters[0]);
  }

  const env = envFilters[0]?.rawValue;
  const team = teamFilters[0]?.rawValue;
  const scope = scopeFilters[0]?.rawValue;
  const tag = tagFilters[0]?.rawValue;

  if (env) {
    filtersToRemove.push(envFilters[0]);
  }

  if (team) {
    filtersToRemove.push(teamFilters[0]);
  }

  if (scope) {
    filtersToRemove.push(scopeFilters[0]);
  }

  if (tag) {
    filtersToRemove.push(tagFilters[0]);
  }

  const extraOptions = removeRanges(rawQuery, filtersToRemove);

  return {
    status,
    muted,
    priority,
    type,
    env: env ? stripWrappingQuotes(env) : '',
    team: team ? stripWrappingQuotes(team) : '',
    scope: scope ? stripWrappingQuotes(scope) : '',
    tag: tag || '',
    extraOptions,
  };
}

const freeTextHelp = (
  <div style={{ maxWidth: 560 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Campos livres</div>

    <div style={{ marginBottom: 8 }}>
      Informe apenas o valor que será colocado depois do nome do campo. O plugin
      vai montar a query respeitando o nome exato do campo.
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

const extraOptionsHelp = (
  <div style={{ maxWidth: 560 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Extra options</div>

    <div style={{ marginBottom: 8 }}>
      Use este campo para adicionar filtros que não existem nos campos definidos
      do Builder. O conteúdo será anexado ao final da query gerada.
    </div>

    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`service:checkout
creator:usuario@empresa.com
name:"CPU high"
service:checkout creator:usuario@empresa.com`}
    </pre>
  </div>
);

const rawQueryHelp = (
  <div style={{ maxWidth: 560 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Datadog query</div>

    <div style={{ marginBottom: 8 }}>
      Escreva manualmente a query enviada para o parâmetro <code>query</code> do
      endpoint de busca de monitores do Datadog.
    </div>

    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`status:alert muted:false
status:(alert OR warn OR "no data") muted:false
type:metric status:alert
type:metric group_status:alert
tag:("env:prod" AND "check_status:live")`}
    </pre>

    <div style={{ marginTop: 8 }}>
      <a href={DATADOG_MONITOR_SEARCH_DOC_URL} target="_blank" rel="noreferrer">
        Documentação oficial: Search Monitors
      </a>
      {' | '}
      <a href={DATADOG_MONITORS_API_DOC_URL} target="_blank" rel="noreferrer">
        API: Monitors
      </a>
    </div>
  </div>
);

function LabelWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: React.ReactNode;
}) {
  return (
    <span style={LABEL_WITH_TOOLTIP_STYLE}>
      <span>{label}</span>
      <Tooltip content={tooltip} placement="top">
        <Icon name="question-circle" />
      </Tooltip>
    </span>
  );
}

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const currentQueryType = query.queryType || 'monitor';
  const currentQueryMode = query.queryMode || 'raw';
  const currentOutputFormat = query.outputFormat || 'table';

  const builderQuery = buildBuilderQuery(query);

  const updateQuery = (patch: Partial<DatadogMonitorsQuery>) => {
    onChange({
      ...query,
      ...patch,
    });
  };

  const onQueryModeChange = (newMode: DatadogQueryMode) => {
    if (newMode === currentQueryMode) {
      return;
    }

    if (newMode === 'raw') {
      onChange({
        ...query,
        queryMode: 'raw',
        datadogQuery: builderQuery,
      });

      return;
    }

    const parsedBuilderFields = parseRawQueryToBuilder(query.datadogQuery || '');

    onChange({
      ...query,
      queryMode: 'builder',
      ...parsedBuilderFields,
    });
  };

  const resetBuilderFields = () => {
    onChange({
      ...query,
      status: undefined,
      muted: '',
      priority: undefined,
      type: undefined,
      env: '',
      team: '',
      scope: '',
      tag: '',
      extraOptions: '',
    });
  };

  return (
    <>
      <div style={FIELD_GAP_STYLE}>
        <InlineField label="Query mode" labelWidth={18}>
          <RadioButtonGroup
            options={queryModeOptions}
            value={currentQueryMode}
            onChange={(value) => onQueryModeChange(value)}
          />
        </InlineField>
      </div>

      <div style={FIELD_GAP_STYLE}>
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
      </div>

      <div style={FIELD_GAP_STYLE}>
        <InlineField
          label={
            <LabelWithTooltip
              label="Output format"
              tooltip={
                <div style={{ maxWidth: 520 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Output format
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <b>Table fields</b> retorna os campos normalizados em colunas separadas.
                  </div>
                  <div>
                    <b>Problems object</b> retorna uma única coluna <code>Problems</code> com
                    um objeto JSON por monitor. Este modo facilita concatenar ou unificar
                    dados com outros plugins, como Zabbix.
                  </div>
                </div>
              }
            />
          }
          labelWidth={18}
        >
          <RadioButtonGroup
            options={outputFormatOptions}
            value={currentOutputFormat}
            onChange={(value) =>
              updateQuery({
                outputFormat: value,
              })
            }
          />
        </InlineField>
      </div>

      {currentQueryMode === 'builder' && (
        <>
          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Status" labelWidth={18}>
              <Select
                width={45}
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
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Muted" labelWidth={18}>
              <Select
                width={22}
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
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Priority" labelWidth={18}>
              <Select
                width={48}
                isMulti
                options={priorityOptions}
                value={toSelectableValues(query.priority)}
                placeholder="p1, p2, p3, p4, p5, not_defined"
                onChange={(values) =>
                  updateQuery({
                    priority: fromSelectableValues(values),
                  })
                }
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Type" labelWidth={18}>
              <Select
                width={60}
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
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField
              label={<LabelWithTooltip label="Env" tooltip={freeTextHelp} />}
              labelWidth={18}
            >
              <Input
                width={45}
                value={query.env || ''}
                placeholder="prod"
                onChange={(event) =>
                  updateQuery({
                    env: event.currentTarget.value,
                  })
                }
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField
              label={<LabelWithTooltip label="Team" tooltip={freeTextHelp} />}
              labelWidth={18}
            >
              <Input
                width={45}
                value={query.team || ''}
                placeholder="sre"
                onChange={(event) =>
                  updateQuery({
                    team: event.currentTarget.value,
                  })
                }
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField
              label={<LabelWithTooltip label="Scope" tooltip={freeTextHelp} />}
              labelWidth={18}
            >
              <Input
                width={60}
                value={query.scope || ''}
                placeholder="*"
                onChange={(event) =>
                  updateQuery({
                    scope: event.currentTarget.value,
                  })
                }
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField
              label={<LabelWithTooltip label="Tag" tooltip={freeTextHelp} />}
              labelWidth={18}
            >
              <Input
                width={80}
                value={query.tag || ''}
                placeholder={'("env:prod" AND "check_status:live")'}
                onChange={(event) =>
                  updateQuery({
                    tag: event.currentTarget.value,
                  })
                }
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField
              label={
                <LabelWithTooltip
                  label="Extra options"
                  tooltip={extraOptionsHelp}
                />
              }
              labelWidth={18}
            >
              <Input
                width={100}
                value={query.extraOptions || ''}
                placeholder="esse campo é para adicionar mais filtros que não existem nos campos definidos"
                onChange={(event) =>
                  updateQuery({
                    extraOptions: event.currentTarget.value,
                  })
                }
              />
            </InlineField>
          </div>

          <div style={{ ...FIELD_GAP_STYLE, marginTop: 14 }}>
            <InlineField label="Generated query" labelWidth={18}>
              <Input width={120} value={builderQuery} readOnly />
            </InlineField>
          </div>

          <div style={{ ...FIELD_GAP_STYLE, marginTop: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              icon="trash-alt"
              onClick={resetBuilderFields}
            >
              Reset builder
            </Button>
          </div>
        </>
      )}

      {currentQueryMode === 'raw' && (
        <div style={FIELD_GAP_STYLE}>
          <InlineField
            label={
              <LabelWithTooltip label="Datadog query" tooltip={rawQueryHelp} />
            }
            labelWidth={18}
          >
            <Input
              width={100}
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
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Button variant="primary" size="sm" onClick={() => onRunQuery()}>
          Run query
        </Button>
      </div>
    </>
  );
};