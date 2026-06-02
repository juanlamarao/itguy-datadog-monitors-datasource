import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Field, Input, Select, SecretInput } from '@grafana/ui';

import {
  DatadogMonitorsDataSourceOptions,
  DatadogMonitorsSecureJsonData,
} from '../types';

interface Props
  extends DataSourcePluginOptionsEditorProps<
    DatadogMonitorsDataSourceOptions,
    DatadogMonitorsSecureJsonData
  > {}

export const ConfigEditor = (props: Props) => {
  const { options, onOptionsChange } = props;

  const jsonData = options.jsonData || {};
  const secureJsonData = options.secureJsonData || {};
  const secureJsonFields = options.secureJsonFields || {};

  const onJsonDataChange = (
    field: keyof DatadogMonitorsDataSourceOptions,
    value: string | number
  ) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        [field]: value,
      },
    });
  };

  const onSecureJsonDataChange = (
    field: keyof DatadogMonitorsSecureJsonData,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...secureJsonData,
        [field]: event.target.value,
      },
    });
  };

  const onResetSecureField = (field: keyof DatadogMonitorsSecureJsonData) => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...secureJsonFields,
        [field]: false,
      },
      secureJsonData: {
        ...secureJsonData,
        [field]: '',
      },
    });
  };

  return (
    <>
      <Field label="Datadog API Base URL" description="Exemplo: https://api.datadoghq.com/api">
        <Input
          value={jsonData.apiBaseUrl || 'https://api.datadoghq.com/api'}
          placeholder="https://api.datadoghq.com/api"
          onChange={(event) => onJsonDataChange('apiBaseUrl', event.currentTarget.value)}
        />
      </Field>

      <Field label="Datadog API Version">
        <Select
          value={jsonData.apiVersion || 'v1'}
          options={[
            { label: 'v1', value: 'v1' },
            { label: 'v2', value: 'v2' },
          ]}
          onChange={(option) => onJsonDataChange('apiVersion', option.value || 'v1')}
        />
      </Field>

      <Field label="DD-API-KEY">
        <SecretInput
          isConfigured={Boolean(secureJsonFields.apiKey)}
          value={secureJsonData.apiKey || ''}
          placeholder={secureJsonFields.apiKey ? 'configured' : ''}
          onChange={(event) => onSecureJsonDataChange('apiKey', event)}
          onReset={() => onResetSecureField('apiKey')}
        />
      </Field>

      <Field label="DD-APPLICATION-KEY">
        <SecretInput
          isConfigured={Boolean(secureJsonFields.applicationKey)}
          value={secureJsonData.applicationKey || ''}
          placeholder={secureJsonFields.applicationKey ? 'configured' : ''}
          onChange={(event) => onSecureJsonDataChange('applicationKey', event)}
          onReset={() => onResetSecureField('applicationKey')}
        />
      </Field>

      <Field label="Timeout em milissegundos">
        <Input
          type="number"
          value={jsonData.timeout || 30000}
          onChange={(event) =>
            onJsonDataChange('timeout', Number(event.currentTarget.value || 30000))
          }
        />
      </Field>

      <Field label="Concurrent sessions">
        <Input
          type="number"
          value={jsonData.concurrentSessions || 2}
          onChange={(event) =>
            onJsonDataChange('concurrentSessions', Number(event.currentTarget.value || 2))
          }
        />
      </Field>
    </>
  );
};