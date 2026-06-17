package datadog

import (
	"fmt"
	"strconv"
)

func ResolveEndpoints(queryType string) []EndpointConfig {
	switch queryType {
	case "monitor":
		return []EndpointConfig{MonitorEndpoint}
	case "group_monitor":
		return []EndpointConfig{GroupMonitorEndpoint}
	case "all":
		return []EndpointConfig{MonitorEndpoint, GroupMonitorEndpoint}
	default:
		return []EndpointConfig{MonitorEndpoint}
	}
}

func NormalizeSearchResult(endpoint EndpointConfig, item map[string]any, page int, pageCount int, totalCount int, monitorDetailsByID map[string]map[string]any, appBaseURL string) NormalizedMonitor {
	if endpoint.Source == "group_monitor" {
		return normalizeGroupMonitorResult(endpoint, item, page, pageCount, totalCount, monitorDetailsByID, appBaseURL)
	}

	return normalizeMonitorResult(endpoint, item, page, pageCount, totalCount, appBaseURL)
}

func normalizeMonitorResult(endpoint EndpointConfig, record map[string]any, page int, pageCount int, totalCount int, appBaseURL string) NormalizedMonitor {
	id := getStringOrNumber(record, "id")
	monitorURL := buildMonitorURL(appBaseURL, id)

	rawJSON := copyMap(record)
	rawJSON["monitor_url"] = monitorURL

	return NormalizedMonitor{
		Source:          endpoint.Source,
		Endpoint:        endpoint.Endpoint,
		OrgURL:          appBaseURL,
		ID:              id,
		Type:            getString(record, "type"),
		Name:            getString(record, "name"),
		Message:         getString(record, "message"),
		Query:           getString(record, "query"),
		Multi:           getBool(record, "multi"),
		Priority:        getStringOrNumber(record, "priority"),
		Tags:            getStringArray(record, "tags"),
		Status:          getString(record, "status"),
		LastTriggeredTS: getNumber(record, "last_triggered_ts", 0),
		MutedUntilTS:    getNullableNumber(record, "muted_until_ts"),
		MonitorURL:      monitorURL,
		Page:            page,
		PageCount:       pageCount,
		TotalCount:      totalCount,
		RawJSON:         rawJSON,
	}
}

func normalizeGroupMonitorResult(endpoint EndpointConfig, groupRecord map[string]any, page int, pageCount int, totalCount int, monitorDetailsByID map[string]map[string]any, appBaseURL string) NormalizedMonitor {
	id := getStringOrNumber(groupRecord, "monitor_id")
	monitorDetail := monitorDetailsByID[id]
	if monitorDetail == nil {
		monitorDetail = map[string]any{}
	}

	monitorName := getString(groupRecord, "monitor_name")
	if monitorName == "" {
		monitorName = getString(monitorDetail, "name")
	}

	group := getString(groupRecord, "group")
	name := monitorName
	if group != "" {
		name = monitorName + " | " + group
	}

	allTags := getStringArray(groupRecord, "all_tags")
	groupTags := getStringArray(groupRecord, "group_tags")
	detailTags := getStringArray(monitorDetail, "tags")

	tags := detailTags
	if len(allTags) > 0 || len(groupTags) > 0 {
		tags = append(allTags, groupTags...)
	}
	tags = uniqueStrings(tags)

	monitorURL := buildMonitorURL(appBaseURL, id)
	rawJSON := copyMap(groupRecord)
	rawJSON["monitor_url"] = monitorURL
	rawJSON["monitor_detail"] = monitorDetail

	return NormalizedMonitor{
		Source:          endpoint.Source,
		Endpoint:        endpoint.Endpoint,
		OrgURL:          appBaseURL,
		ID:              id,
		Type:            getString(monitorDetail, "type"),
		Name:            name,
		Message:         getString(monitorDetail, "message"),
		Query:           getString(monitorDetail, "query"),
		Multi:           getBool(monitorDetail, "multi"),
		Priority:        getStringOrNumber(monitorDetail, "priority"),
		Tags:            tags,
		Status:          getString(groupRecord, "status"),
		LastTriggeredTS: getNumber(groupRecord, "last_triggered_ts", 0),
		MutedUntilTS:    getNullableNumber(groupRecord, "muted_until_ts"),
		MonitorURL:      monitorURL,
		Page:            page,
		PageCount:       pageCount,
		TotalCount:      totalCount,
		RawJSON:         rawJSON,
	}
}

func BuildMonitorDetailsMap(monitors []map[string]any) map[string]map[string]any {
	result := make(map[string]map[string]any, len(monitors))
	for _, monitor := range monitors {
		id := getStringOrNumber(monitor, "id")
		if id != "" {
			result[id] = monitor
		}
	}
	return result
}

func buildMonitorURL(appBaseURL string, id string) string {
	if appBaseURL == "" || id == "" {
		return ""
	}
	return appBaseURL + "/monitors/" + id
}

func copyMap(input map[string]any) map[string]any {
	output := make(map[string]any, len(input)+2)
	for key, value := range input {
		output[key] = value
	}
	return output
}

func getString(record map[string]any, field string) string {
	value := record[field]
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(typed), 'f', -1, 32)
	case int:
		return strconv.Itoa(typed)
	case int64:
		return strconv.FormatInt(typed, 10)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	case nil:
		return ""
	default:
		return fmt.Sprint(typed)
	}
}

func getStringOrNumber(record map[string]any, field string) string {
	return getString(record, field)
}

func getNumber(record map[string]any, field string, defaultValue float64) float64 {
	value := record[field]
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int64:
		return float64(typed)
	case jsonNumber:
		parsed, err := strconv.ParseFloat(string(typed), 64)
		if err == nil {
			return parsed
		}
	case string:
		parsed, err := strconv.ParseFloat(typed, 64)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getNullableNumber(record map[string]any, field string) *float64 {
	value := record[field]
	if value == nil {
		return nil
	}

	parsed := getNumber(record, field, 0)
	return &parsed
}

func getBool(record map[string]any, field string) bool {
	value := record[field]
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return typed == "true" || typed == "1" || typed == "yes" || typed == "sim"
	case float64:
		return typed == 1
	case int:
		return typed == 1
	}
	return false
}

func getStringArray(record map[string]any, field string) []string {
	value := record[field]
	items, ok := value.([]any)
	if !ok {
		return nil
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		value := fmt.Sprint(item)
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

type jsonNumber string
