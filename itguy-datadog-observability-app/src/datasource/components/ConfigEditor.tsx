import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Button, InlineField, InlineFieldRow, Input, SecretInput, TextArea } from '@grafana/ui';

import {
  DatadogObservabilityDataSourceOptions,
  DatadogObservabilitySecureJsonData,
} from '../types';

interface Props
  extends DataSourcePluginOptionsEditorProps<
    DatadogObservabilityDataSourceOptions,
    DatadogObservabilitySecureJsonData
  > {}

const DEFAULT_API_BASE_URL = 'https://api.datadoghq.com/api';
const DEFAULT_APP_BASE_URL = 'https://app.datadoghq.com';
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

export function ConfigEditor(props: Props) {
  const { options, onOptionsChange } = props;
  const jsonData = options.jsonData || {};
  const secureJsonData = options.secureJsonData || {};
  const secureJsonFields = options.secureJsonFields || {};

  const updateJsonData = (patch: Partial<DatadogObservabilityDataSourceOptions>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        ...patch,
      },
    });
  };

  const onJsonStringChange = (field: keyof DatadogObservabilityDataSourceOptions) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateJsonData({ [field]: event.currentTarget.value } as Partial<DatadogObservabilityDataSourceOptions>);
    };
  };

  const onJsonNumberChange = (field: keyof DatadogObservabilityDataSourceOptions, defaultValue: number) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.currentTarget.value || defaultValue);
      updateJsonData({ [field]: value } as Partial<DatadogObservabilityDataSourceOptions>);
    };
  };

  const onSecureJsonDataChange = (field: keyof DatadogObservabilitySecureJsonData) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onOptionsChange({
        ...options,
        secureJsonData: {
          ...secureJsonData,
          [field]: event.currentTarget.value,
        },
      });
    };
  };

  const onResetSecureField = (field: keyof DatadogObservabilitySecureJsonData) => {
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

  const applyDefaults = () => {
    updateJsonData({
      apiBaseUrl: jsonData.apiBaseUrl || DEFAULT_API_BASE_URL,
      appBaseUrl: jsonData.appBaseUrl || DEFAULT_APP_BASE_URL,
      timeout: jsonData.timeout || DEFAULT_TIMEOUT,
      concurrentSessions: jsonData.concurrentSessions || DEFAULT_CONCURRENT_SESSIONS,
    });
  };

  return (
    <div className="gf-form-group">
      <h3 className="page-heading">Datadog Observability</h3>

      <InlineFieldRow>
        <InlineField
          label="API Base URL"
          labelWidth={24}
          grow
          tooltip="URL base da API do Datadog sem /v1. Exemplo: https://api.datadoghq.com/api"
        >
          <Input
            value={jsonData.apiBaseUrl || DEFAULT_API_BASE_URL}
            placeholder={DEFAULT_API_BASE_URL}
            onChange={onJsonStringChange('apiBaseUrl')}
            onBlur={(event) => updateJsonData({ apiBaseUrl: sanitizeBaseUrl(event.currentTarget.value) })}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField
          label="App Base URL"
          labelWidth={24}
          grow
          tooltip="URL da interface web do Datadog usada para montar links dos monitores."
        >
          <Input
            value={jsonData.appBaseUrl || DEFAULT_APP_BASE_URL}
            placeholder={DEFAULT_APP_BASE_URL}
            onChange={onJsonStringChange('appBaseUrl')}
            onBlur={(event) => updateJsonData({ appBaseUrl: sanitizeAppBaseUrl(event.currentTarget.value) })}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="DD-API-KEY" labelWidth={24} grow>
          <SecretInput
            isConfigured={Boolean(secureJsonFields.apiKey)}
            value={secureJsonData.apiKey || ''}
            placeholder={secureJsonFields.apiKey ? 'configured' : ''}
            onChange={onSecureJsonDataChange('apiKey')}
            onReset={() => onResetSecureField('apiKey')}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="DD-APPLICATION-KEY" labelWidth={24} grow>
          <SecretInput
            isConfigured={Boolean(secureJsonFields.applicationKey)}
            value={secureJsonData.applicationKey || ''}
            placeholder={secureJsonFields.applicationKey ? 'configured' : ''}
            onChange={onSecureJsonDataChange('applicationKey')}
            onReset={() => onResetSecureField('applicationKey')}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Timeout (ms)" labelWidth={24} tooltip="Timeout das chamadas HTTP para o Datadog." grow>
          <Input
            type="number"
            min={1000}
            value={jsonData.timeout || DEFAULT_TIMEOUT}
            onChange={onJsonNumberChange('timeout', DEFAULT_TIMEOUT)}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Concurrent sessions" labelWidth={24} tooltip="Número máximo de chamadas concorrentes usadas pelo backend." grow>
          <Input
            type="number"
            min={1}
            value={jsonData.concurrentSessions || DEFAULT_CONCURRENT_SESSIONS}
            onChange={onJsonNumberChange('concurrentSessions', DEFAULT_CONCURRENT_SESSIONS)}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Cache TTL" labelWidth={24} grow disabled>
          <Input value="2h - cache de inventário de monitores; Save & Test força refresh" readOnly />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Observação" labelWidth={24} grow>
          <TextArea
            value="Métricas e status atual dos monitores não usam cache longo. O cache de 2h é usado para detalhes/inventário de monitores."
            readOnly
            rows={3}
          />
        </InlineField>
      </InlineFieldRow>

      <div style={{ marginTop: 12 }}>
        <Button variant="secondary" type="button" onClick={applyDefaults}>
          Aplicar valores padrão
        </Button>
      </div>
    </div>
  );
}
