import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Button, Icon, InlineField, Input, RadioButtonGroup, Select, Tooltip } from '@grafana/ui';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsQuery,
  DatadogOutputFormat,
  DatadogQueryMode,
  DatadogQueryType,
} from '../types';
import { DataSource } from '../datasource';
import { buildBuilderQuery } from '../query/builder';
import { parseRawQueryToBuilder } from '../query/parser';
import {
  fromSelectableValues,
  mutedOptions,
  outputFormatOptions,
  priorityOptions,
  queryModeOptions,
  queryTypeOptions,
  statusOptions,
  toSelectableValues,
  typeOptions,
} from '../query/options';

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