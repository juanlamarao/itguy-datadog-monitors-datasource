import { DatadogMonitorsQuery } from '../types';

function quoteValueIfNeeded(value: string): string {
  if (/\s/.test(value)) {
    return `"${value}"`;
  }

  return value;
}

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
