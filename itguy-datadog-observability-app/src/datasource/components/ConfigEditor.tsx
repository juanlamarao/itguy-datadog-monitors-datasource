import React, { ChangeEvent, useEffect } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Field, Input, SecretInput } from '@grafana/ui';

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
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_CONCURRENT_SESSIONS = 2;

function sanitizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function sanitizeAppBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/account\/login\/?$/, '')
    .replace(/\/+$/, '');
}

export const ConfigEditor = (props: Props) => {
  const { options, onOptionsChange } = props;

  const jsonData = options.jsonData || {};
  const secureJsonData = options.secureJsonData || {};
  const secureJsonFields = options.secureJsonFields || {};

  useEffect(() => {
    const needsDefaultValues =
      !jsonData.apiBaseUrl ||
      !jsonData.timeout ||
      !jsonData.concurrentSessions;

    if (needsDefaultValues) {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          apiBaseUrl: jsonData.apiBaseUrl || DEFAULT_API_BASE_URL,
          timeout: jsonData.timeout || DEFAULT_TIMEOUT,
          concurrentSessions:
            jsonData.concurrentSessions || DEFAULT_CONCURRENT_SESSIONS,
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
        description="URL da API do Datadog sem versão. Exemplo: https://api.datadoghq.com/api"
      >
        <Input
          value={jsonData.apiBaseUrl || DEFAULT_API_BASE_URL}
          placeholder="https://api.datadoghq.com/api"
          onChange={(event) =>
            onJsonDataChange(
              'apiBaseUrl',
              event.currentTarget.value
            )
          }
          onBlur={(event) =>
            onJsonDataChange(
              'apiBaseUrl',
              sanitizeBaseUrl(event.currentTarget.value)
            )
          }
        />
      </Field>

      <Field
        label="Datadog App Base URL"
        description="URL da interface web do Datadog. Exemplo: https://company_org.datadoghq.com"
      >
        <Input
          value={jsonData.appBaseUrl || ''}
          placeholder="https://company_org.datadoghq.com"
          onChange={(event) =>
            onJsonDataChange(
              'appBaseUrl',
              event.currentTarget.value
            )
          }
          onBlur={(event) =>
            onJsonDataChange(
              'appBaseUrl',
              sanitizeAppBaseUrl(event.currentTarget.value)
            )
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