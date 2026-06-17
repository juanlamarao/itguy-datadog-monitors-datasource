import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Button, Icon, InlineField, Input, RadioButtonGroup, Select, Tooltip } from '@grafana/ui';

import {
  DatadogObservabilityDataSourceOptions,
  DatadogObservabilityQuery,
  DatadogOutputFormat,
  DatadogQueryMode,
  DatadogQueryType,
} from '../types';
import { DataSource } from '../datasource';
import { buildBuilderQuery } from '../query/builder';
import { parseRawQueryToBuilder } from '../query/parser';
import {
  fromSelectableValues,
  metricOutputFormatOptions,
  monitorOutputFormatOptions,
  mutedOptions,
  priorityOptions,
  queryModeOptions,
  queryTypeOptions,
  statusOptions,
  toSelectableValues,
  typeOptions,
} from '../query/options';

type Props = QueryEditorProps<DataSource, DatadogObservabilityQuery, DatadogObservabilityDataSourceOptions>;

const DATADOG_MONITOR_SEARCH_DOC_URL = 'https://docs.datadoghq.com/monitors/manage/search/';
const DATADOG_MONITORS_API_DOC_URL = 'https://docs.datadoghq.com/api/latest/monitors/';
const DATADOG_METRICS_API_DOC_URL = 'https://docs.datadoghq.com/api/latest/metrics/';
const DATADOG_METRICS_QUERY_DOC_URL = 'https://docs.datadoghq.com/dashboards/querying/';

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
      Informe apenas o valor que será colocado depois do nome do campo. O plugin monta a query respeitando o nome exato do campo.
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
      Use este campo para adicionar filtros que não existem nos campos definidos do Builder. O conteúdo será anexado ao final da query gerada.
    </div>
    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`service:checkout
creator:usuario@empresa.com
name:"CPU high"
service:checkout creator:usuario@empresa.com`}
    </pre>
  </div>
);

const rawMonitorQueryHelp = (
  <div style={{ maxWidth: 560 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Datadog monitor query</div>
    <div style={{ marginBottom: 8 }}>
      Query enviada para o parâmetro <code>query</code> dos endpoints de busca de monitores.
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
        Search Monitors
      </a>
      {' | '}
      <a href={DATADOG_MONITORS_API_DOC_URL} target="_blank" rel="noreferrer">
        API Monitors
      </a>
    </div>
  </div>
);

const metricQueryHelp = (
  <div style={{ maxWidth: 620 }}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Datadog metrics query</div>
    <div style={{ marginBottom: 8 }}>
      Query enviada para <code>/api/v1/query</code> usando o time range do painel Grafana.
    </div>
    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
{`avg:system.cpu.user{*}
avg:system.cpu.user{env:prod} by {host}
sum:trace.http.request.hits{service:checkout}.as_count()`}
    </pre>
    <div style={{ marginTop: 8 }}>
      <a href={DATADOG_METRICS_API_DOC_URL} target="_blank" rel="noreferrer">
        API Metrics
      </a>
      {' | '}
      <a href={DATADOG_METRICS_QUERY_DOC_URL} target="_blank" rel="noreferrer">
        Querying metrics
      </a>
    </div>
  </div>
);

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: React.ReactNode }) {
  return (
    <span style={LABEL_WITH_TOOLTIP_STYLE}>
      <span>{label}</span>
      <Tooltip content={tooltip} placement="top">
        <Icon name="question-circle" />
      </Tooltip>
    </span>
  );
}

function getDefaultOutputFormatForQueryType(queryType: DatadogQueryType): DatadogOutputFormat {
  return queryType === 'metric' ? 'timeseries' : 'table';
}

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const currentQueryType = query.queryType || 'monitor';
  const isMetricQuery = currentQueryType === 'metric';
  const currentQueryMode = query.queryMode || 'builder';
  const currentOutputFormat = query.outputFormat || getDefaultOutputFormatForQueryType(currentQueryType);
  const builderQuery = buildBuilderQuery(query);

  const updateQuery = (patch: Partial<DatadogObservabilityQuery>) => {
    onChange({
      ...query,
      ...patch,
    });
  };

  const onQueryTypeChange = (newQueryType: DatadogQueryType) => {
    const defaultOutputFormat = getDefaultOutputFormatForQueryType(newQueryType);

    onChange({
      ...query,
      queryType: newQueryType,
      outputFormat: defaultOutputFormat,
      queryMode: newQueryType === 'metric' ? 'raw' : query.queryMode || 'builder',
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
        <InlineField label="Query type" labelWidth={18}>
          <Select
            width={34}
            value={currentQueryType}
            options={queryTypeOptions}
            onChange={(option) => onQueryTypeChange((option.value || 'monitor') as DatadogQueryType)}
          />
        </InlineField>
      </div>

      <div style={FIELD_GAP_STYLE}>
        <InlineField
          label={
            <LabelWithTooltip
              label="Output format"
              tooltip={
                isMetricQuery ? (
                  <div style={{ maxWidth: 520 }}>
                    <b>Time series</b> retorna frames nativos para gráficos de séries temporais. <b>Table points</b> retorna cada ponto em uma linha.
                  </div>
                ) : (
                  <div style={{ maxWidth: 520 }}>
                    <b>Table fields</b> retorna colunas normalizadas. <b>Problems object</b> retorna uma coluna <code>Problems</code> com JSON por monitor, útil para unificação com outras origens.
                  </div>
                )
              }
            />
          }
          labelWidth={18}
        >
          <RadioButtonGroup
            options={isMetricQuery ? metricOutputFormatOptions : monitorOutputFormatOptions}
            value={currentOutputFormat}
            onChange={(value) => updateQuery({ outputFormat: value })}
          />
        </InlineField>
      </div>

      {isMetricQuery ? (
        <>
          <div style={FIELD_GAP_STYLE}>
            <InlineField label={<LabelWithTooltip label="Metric query" tooltip={metricQueryHelp} />} labelWidth={18} grow>
              <Input
                value={query.metricQuery || ''}
                placeholder="avg:system.cpu.user{*} by {host}"
                onChange={(event) => updateQuery({ metricQuery: event.currentTarget.value })}
              />
            </InlineField>
          </div>

          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Alias" labelWidth={18} grow>
              <Input
                value={query.metricAlias || ''}
                placeholder="CPU user"
                onChange={(event) => updateQuery({ metricAlias: event.currentTarget.value })}
              />
            </InlineField>
          </div>
        </>
      ) : (
        <>
          <div style={FIELD_GAP_STYLE}>
            <InlineField label="Query mode" labelWidth={18}>
              <RadioButtonGroup options={queryModeOptions} value={currentQueryMode} onChange={(value) => onQueryModeChange(value)} />
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
                    onChange={(values) => updateQuery({ status: fromSelectableValues(values) })}
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
                    onChange={(option) => updateQuery({ muted: (option?.value || '') as 'true' | 'false' | '' })}
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
                    onChange={(values) => updateQuery({ priority: fromSelectableValues(values) })}
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
                    onChange={(values) => updateQuery({ type: fromSelectableValues(values) })}
                  />
                </InlineField>
              </div>

              <div style={FIELD_GAP_STYLE}>
                <InlineField label={<LabelWithTooltip label="Env" tooltip={freeTextHelp} />} labelWidth={18}>
                  <Input width={45} value={query.env || ''} placeholder="prod" onChange={(event) => updateQuery({ env: event.currentTarget.value })} />
                </InlineField>
              </div>

              <div style={FIELD_GAP_STYLE}>
                <InlineField label={<LabelWithTooltip label="Team" tooltip={freeTextHelp} />} labelWidth={18}>
                  <Input width={45} value={query.team || ''} placeholder="sre" onChange={(event) => updateQuery({ team: event.currentTarget.value })} />
                </InlineField>
              </div>

              <div style={FIELD_GAP_STYLE}>
                <InlineField label={<LabelWithTooltip label="Scope" tooltip={freeTextHelp} />} labelWidth={18}>
                  <Input width={45} value={query.scope || ''} placeholder="host:*" onChange={(event) => updateQuery({ scope: event.currentTarget.value })} />
                </InlineField>
              </div>

              <div style={FIELD_GAP_STYLE}>
                <InlineField label={<LabelWithTooltip label="Tag" tooltip={freeTextHelp} />} labelWidth={18} grow>
                  <Input
                    value={query.tag || ''}
                    placeholder={'("env:prod" AND "check_status:live")'}
                    onChange={(event) => updateQuery({ tag: event.currentTarget.value })}
                  />
                </InlineField>
              </div>

              <div style={FIELD_GAP_STYLE}>
                <InlineField label={<LabelWithTooltip label="Extra options" tooltip={extraOptionsHelp} />} labelWidth={18} grow>
                  <Input
                    value={query.extraOptions || ''}
                    placeholder="service:checkout creator:usuario@empresa.com"
                    onChange={(event) => updateQuery({ extraOptions: event.currentTarget.value })}
                  />
                </InlineField>
              </div>

              <div style={{ marginTop: 4, marginBottom: 12 }}>
                <Button variant="secondary" size="sm" icon="sync" onClick={resetBuilderFields}>
                  Reset builder
                </Button>
              </div>
            </>
          )}

          {currentQueryMode === 'raw' && (
            <div style={FIELD_GAP_STYLE}>
              <InlineField label={<LabelWithTooltip label="Datadog query" tooltip={rawMonitorQueryHelp} />} labelWidth={18} grow>
                <Input
                  value={query.datadogQuery || ''}
                  placeholder="status:alert muted:false"
                  onChange={(event) => updateQuery({ datadogQuery: event.currentTarget.value })}
                />
              </InlineField>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <Button variant="primary" size="sm" onClick={() => onRunQuery()}>
          Run query
        </Button>
      </div>
    </>
  );
};
