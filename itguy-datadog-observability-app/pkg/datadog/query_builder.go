package datadog

import "strings"

func BuildDatadogQuery(query Query) string {
	if strings.ToLower(query.QueryMode) != "builder" {
		if strings.TrimSpace(query.DatadogQuery) != "" {
			return strings.TrimSpace(query.DatadogQuery)
		}
		return "status:alert muted:false"
	}

	parts := []string{
		buildMultiValueFilter("status", query.Status),
		buildMutedFilter(query.Muted),
		buildMultiValueFilter("priority", query.Priority),
		buildMultiValueFilter("type", query.Type),
		buildFreeTextFilter("env", query.Env),
		buildFreeTextFilter("team", query.Team),
		buildFreeTextFilter("scope", query.Scope),
		buildFreeTextFilter("tag", query.Tag),
		strings.TrimSpace(query.ExtraOptions),
	}

	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if strings.TrimSpace(part) != "" {
			filtered = append(filtered, strings.TrimSpace(part))
		}
	}

	result := strings.Join(filtered, " ")
	if result == "" {
		return "status:alert muted:false"
	}

	return result
}

func buildMutedFilter(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return "muted:" + value
}

func buildMultiValueFilter(field string, values []string) string {
	formatted := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			formatted = append(formatted, quoteValueIfNeeded(trimmed))
		}
	}

	if len(formatted) == 0 {
		return ""
	}

	if len(formatted) == 1 {
		return field + ":" + formatted[0]
	}

	return field + ":(" + strings.Join(formatted, " OR ") + ")"
}

func buildFreeTextFilter(field string, value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return field + ":" + value
}

func quoteValueIfNeeded(value string) string {
	if strings.ContainsAny(value, " \t\n\r") {
		return `"` + value + `"`
	}
	return value
}
