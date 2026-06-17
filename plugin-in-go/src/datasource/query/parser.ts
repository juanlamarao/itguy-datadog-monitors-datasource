import { DatadogMonitorsQuery } from '../types';
import { allowedPriorityValues, allowedStatusValues, allowedTypeValues } from './options';

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

export function parseRawQueryToBuilder(rawQuery: string): Partial<DatadogMonitorsQuery> {
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

  const status = parsedStatus.length > 0 && valuesAreAllowed(parsedStatus, allowedStatusValues) ? parsedStatus : undefined;
  const priority = parsedPriority.length > 0 && valuesAreAllowed(parsedPriority, allowedPriorityValues) ? parsedPriority : undefined;
  const type = parsedType.length > 0 && valuesAreAllowed(parsedType, allowedTypeValues) ? parsedType : undefined;

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
  const muted = mutedValue === 'true' || mutedValue === 'false' ? (mutedValue as 'true' | 'false') : '';

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
