import { SelectableValue } from '@grafana/data';

import { DatadogOutputFormat, DatadogQueryMode, DatadogQueryType } from '../types';

export const queryModeOptions: Array<SelectableValue<DatadogQueryMode>> = [
  { label: 'Builder', value: 'builder' },
  { label: 'Raw query', value: 'raw' },
];

export const queryTypeOptions: Array<SelectableValue<DatadogQueryType>> = [
  { label: 'monitor', value: 'monitor' },
  { label: 'group monitor', value: 'group_monitor' },
  { label: 'all', value: 'all' },
];

export const outputFormatOptions: Array<SelectableValue<DatadogOutputFormat>> = [
  { label: 'Table fields', value: 'table' },
  { label: 'Problems object', value: 'problems' },
];

export const statusOptions: Array<SelectableValue<string>> = [
  { label: 'alert', value: 'alert' },
  { label: 'warn', value: 'warn' },
  { label: 'no data', value: 'no data' },
  { label: 'ok', value: 'ok' },
];

export const mutedOptions: Array<SelectableValue<string>> = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' },
];

export const priorityOptions: Array<SelectableValue<string>> = [
  { label: 'p1', value: 'p1' },
  { label: 'p2', value: 'p2' },
  { label: 'p3', value: 'p3' },
  { label: 'p4', value: 'p4' },
  { label: 'p5', value: 'p5' },
  { label: 'not_defined', value: 'not_defined' },
];

export const typeOptions: Array<SelectableValue<string>> = [
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

export const allowedStatusValues = statusOptions.map((item) => item.value || '');
export const allowedPriorityValues = priorityOptions.map((item) => item.value || '');
export const allowedTypeValues = typeOptions.map((item) => item.value || '');

export function toSelectableValues(values?: string[]): Array<SelectableValue<string>> {
  return (values || []).map((value) => ({
    label: value,
    value,
  }));
}

export function fromSelectableValues(values: Array<SelectableValue<string>>): string[] {
  return values
    .map((item) => item.value)
    .filter((value): value is string => Boolean(value));
}
