import React, { ChangeEvent, useEffect } from 'react';
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

const DEFAULT_API_BASE_URL = 'https://api.datadoghq.com/api';
const DEFAULT_API_VERSION = 'v1';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_CONCURRENT_SESSIONS = 2;

export const ConfigEditor = (props: Props) => {
  const { options, onOptionsChange } = props;

  const jsonData = options.jsonData || {};
  const secureJsonData = options.secureJsonData || {};
  const secureJsonFields = options.secureJsonFields || {};

  /**
   * Garante que os valores padrão sejam realmente salvos no jsonData.
   * Sem isso, o campo aparece preenchido na tela, mas pode não existir
   * na configuração persistida do datasource.
   */
  useEffect(() => {
    const needsDefaultValues =
      !jsonData.apiBaseUrl ||
      !jsonData.apiVersion ||
      !jsonData.timeout ||
      !jsonData.concurrentSessions;

    if (needsDefaultValues) {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          apiBaseUrl: jsonData.apiBaseUrl || DEFAULT_API_BASE_URL,
          apiVersion: jsonData.apiVersion || DEFAULT_API_VERSION,
          timeout: jsonData.timeout || DEFAULT_TIMEOUT,
          concurrentSessions: jsonData.concurrentSessions || DEFAULT_CONCURRENT_SESSIONS,
        },
      });
    }
  }, []);

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
      <Field
        label="Datadog API Base URL"
        description="Exemplo: https://api.datadoghq.com/api"
      >
        <Input
          value={jsonData.apiBaseUrl || DEFAULT_API_BASE_URL}
          placeholder="https://api.datadoghq.com/api"
          onChange={(event) =>
            onJsonDataChange('apiBaseUrl', event.currentTarget.value.trim())
          }
        />
      </Field>

      <Field label="Datadog API Version">
        <Select
          value={jsonData.apiVersion || DEFAULT_API_VERSION}
          options={[
            { label: 'v1', value: 'v1' },
            { label: 'v2', value: 'v2' },
          ]}
          onChange={(option) =>
            onJsonDataChange('apiVersion', option.value || DEFAULT_API_VERSION)
          }
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
          value={jsonData.timeout || DEFAULT_TIMEOUT}
          onChange={(event) =>
            onJsonDataChange(
              'timeout',
              Number(event.currentTarget.value || DEFAULT_TIMEOUT)
            )
          }
        />
      </Field>

      <Field label="Concurrent sessions">
        <Input
          type="number"
          value={jsonData.concurrentSessions || DEFAULT_CONCURRENT_SESSIONS}
          onChange={(event) =>
            onJsonDataChange(
              'concurrentSessions',
              Number(event.currentTarget.value || DEFAULT_CONCURRENT_SESSIONS)
            )
          }
        />
      </Field>
    </>
  );
};