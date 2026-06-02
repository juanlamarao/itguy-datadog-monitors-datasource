import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Field, InlineField, Input, Select } from '@grafana/ui';

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

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const onQueryTypeChange = (value: DatadogQueryType) => {
    onChange({
      ...query,
      queryType: value,
    });
    onRunQuery();
  };

  const onDatadogQueryChange = (value: string) => {
    onChange({
      ...query,
      datadogQuery: value,
    });
  };

  const onPerPageChange = (value: number) => {
    onChange({
      ...query,
      perPage: value,
    });
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={18}>
        <Select
          width={30}
          value={query.queryType || 'all'}
          options={[
            { label: 'monitor', value: 'monitor' },
            { label: 'group monitor', value: 'group_monitor' },
            { label: 'all', value: 'all' },
          ]}
          onChange={(option) => onQueryTypeChange((option.value || 'all') as DatadogQueryType)}
        />
      </InlineField>

      <InlineField label="Datadog query" labelWidth={18}>
        <Input
          width={60}
          value={query.datadogQuery || ''}
          placeholder="Exemplo: status:Alert"
          onChange={(event) => onDatadogQueryChange(event.currentTarget.value)}
          onBlur={onRunQuery}
        />
      </InlineField>

      <InlineField label="Per page" labelWidth={18}>
        <Input
          width={20}
          type="number"
          value={query.perPage || 100}
          onChange={(event) => onPerPageChange(Number(event.currentTarget.value || 100))}
          onBlur={onRunQuery}
        />
      </InlineField>
    </>
  );
};