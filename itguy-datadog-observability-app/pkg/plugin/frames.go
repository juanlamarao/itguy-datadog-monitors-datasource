package plugin

import (
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"

	"github.com/itguy-servicos/grafana-datadog-observability-app/pkg/datadog"
)

func buildTableFrame(refID string, results []datadog.NormalizedMonitor) *data.Frame {
	orgURLs := make([]string, 0, len(results))
	ids := make([]string, 0, len(results))
	types := make([]string, 0, len(results))
	names := make([]string, 0, len(results))
	messages := make([]string, 0, len(results))
	queries := make([]string, 0, len(results))
	multi := make([]bool, 0, len(results))
	priorities := make([]string, 0, len(results))
	tags := make([]string, 0, len(results))
	statuses := make([]string, 0, len(results))
	lastTriggered := make([]float64, 0, len(results))
	mutedUntil := make([]float64, 0, len(results))
	monitorURLs := make([]string, 0, len(results))
	sources := make([]string, 0, len(results))
	endpoints := make([]string, 0, len(results))
	pages := make([]float64, 0, len(results))
	pageCounts := make([]float64, 0, len(results))
	totalCounts := make([]float64, 0, len(results))
	rawJSON := make([]string, 0, len(results))

	for _, result := range results {
		orgURLs = append(orgURLs, result.OrgURL)
		ids = append(ids, result.ID)
		types = append(types, result.Type)
		names = append(names, result.Name)
		messages = append(messages, result.Message)
		queries = append(queries, result.Query)
		multi = append(multi, result.Multi)
		priorities = append(priorities, result.Priority)
		tags = append(tags, marshalString(result.Tags))
		statuses = append(statuses, result.Status)
		lastTriggered = append(lastTriggered, result.LastTriggeredTS)
		mutedUntil = append(mutedUntil, derefFloat(result.MutedUntilTS))
		monitorURLs = append(monitorURLs, result.MonitorURL)
		sources = append(sources, result.Source)
		endpoints = append(endpoints, result.Endpoint)
		pages = append(pages, float64(result.Page))
		pageCounts = append(pageCounts, float64(result.PageCount))
		totalCounts = append(totalCounts, float64(result.TotalCount))
		rawJSON = append(rawJSON, marshalString(result.RawJSON))
	}

	frame := data.NewFrame("datadog_monitors",
		data.NewField("org_url", nil, orgURLs),
		data.NewField("id", nil, ids),
		data.NewField("type", nil, types),
		data.NewField("name", nil, names),
		data.NewField("message", nil, messages),
		data.NewField("query", nil, queries),
		data.NewField("multi", nil, multi),
		data.NewField("priority", nil, priorities),
		data.NewField("tags", nil, tags),
		data.NewField("status", nil, statuses),
		data.NewField("last_triggered_ts", nil, lastTriggered),
		data.NewField("muted_until_ts", nil, mutedUntil),
		data.NewField("monitor_url", nil, monitorURLs),
		data.NewField("source", nil, sources),
		data.NewField("endpoint", nil, endpoints),
		data.NewField("page", nil, pages),
		data.NewField("page_count", nil, pageCounts),
		data.NewField("total_count", nil, totalCounts),
		data.NewField("raw_json", nil, rawJSON),
	)
	frame.SetRefID(refID)

	return frame
}

func buildProblemsFrame(refID string, results []datadog.NormalizedMonitor) *data.Frame {
	problems := make([]json.RawMessage, 0, len(results))

	for _, result := range results {
		priority := result.Priority
		if priority == "" {
			priority = "not_defined"
		}

		problem := map[string]any{
			"source":            "datadog",
			"org_url":           result.OrgURL,
			"id":                result.ID,
			"type":              result.Type,
			"name":              result.Name,
			"message":           result.Message,
			"query":             result.Query,
			"multi":             result.Multi,
			"priority":          priority,
			"severity":          priority,
			"tags":              result.Tags,
			"status":            result.Status,
			"last_triggered_ts": result.LastTriggeredTS,
			"muted_until_ts":    result.MutedUntilTS,
			"monitor_url":       result.MonitorURL,
			"url":               result.MonitorURL,
			"page":              result.Page,
			"page_count":        result.PageCount,
			"total_count":       result.TotalCount,
			"raw_json":          result.RawJSON,
		}

		problems = append(problems, marshalRaw(problem))
	}

	frame := data.NewFrame("datadog_problems", data.NewField("Problems", nil, problems))
	frame.SetRefID(refID)
	return frame
}

func buildMetricTimeSeriesFrames(refID string, query string, points []datadog.NormalizedMetricPoint) data.Frames {
	if len(points) == 0 {
		frame := data.NewFrame("datadog_metrics", data.NewField("time", nil, []time.Time{}), data.NewField(query, nil, []*float64{}))
		frame.SetRefID(refID)
		return data.Frames{frame}
	}

	groups := map[string][]datadog.NormalizedMetricPoint{}
	for _, point := range points {
		key := metricSeriesKey(point)
		groups[key] = append(groups[key], point)
	}

	keys := make([]string, 0, len(groups))
	for key := range groups {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	frames := make(data.Frames, 0, len(keys))
	for _, key := range keys {
		seriesPoints := groups[key]
		sort.Slice(seriesPoints, func(i, j int) bool {
			return seriesPoints[i].Timestamp.Before(seriesPoints[j].Timestamp)
		})

		times := make([]time.Time, 0, len(seriesPoints))
		values := make([]*float64, 0, len(seriesPoints))
		for _, point := range seriesPoints {
			times = append(times, point.Timestamp)
			values = append(values, point.Value)
		}

		name := seriesPoints[0].DisplayName
		if name == "" {
			name = seriesPoints[0].Metric
		}

		frame := data.NewFrame("datadog_metric_"+sanitizeFrameName(name), data.NewField("time", nil, times), data.NewField(name, nil, values))
		frame.SetRefID(refID)
		frames = append(frames, frame)
	}

	return frames
}

func buildMetricTableFrame(refID string, points []datadog.NormalizedMetricPoint) *data.Frame {
	times := make([]time.Time, 0, len(points))
	timestampsMS := make([]float64, 0, len(points))
	metrics := make([]string, 0, len(points))
	displayNames := make([]string, 0, len(points))
	scopes := make([]string, 0, len(points))
	tags := make([]string, 0, len(points))
	units := make([]string, 0, len(points))
	values := make([]*float64, 0, len(points))
	queries := make([]string, 0, len(points))
	sources := make([]string, 0, len(points))
	rawJSON := make([]string, 0, len(points))

	for _, point := range points {
		times = append(times, point.Timestamp)
		timestampsMS = append(timestampsMS, point.TimestampMS)
		metrics = append(metrics, point.Metric)
		displayNames = append(displayNames, point.DisplayName)
		scopes = append(scopes, point.Scope)
		tags = append(tags, marshalString(point.Tags))
		units = append(units, point.Unit)
		values = append(values, point.Value)
		queries = append(queries, point.Query)
		sources = append(sources, point.Source)
		rawJSON = append(rawJSON, marshalString(point.RawJSON))
	}

	frame := data.NewFrame("datadog_metric_points",
		data.NewField("time", nil, times),
		data.NewField("timestamp_ms", nil, timestampsMS),
		data.NewField("metric", nil, metrics),
		data.NewField("display_name", nil, displayNames),
		data.NewField("scope", nil, scopes),
		data.NewField("tags", nil, tags),
		data.NewField("unit", nil, units),
		data.NewField("value", nil, values),
		data.NewField("query", nil, queries),
		data.NewField("source", nil, sources),
		data.NewField("raw_json", nil, rawJSON),
	)
	frame.SetRefID(refID)
	return frame
}

func metricSeriesKey(point datadog.NormalizedMetricPoint) string {
	return point.Metric + "|" + point.Scope + "|" + strings.Join(point.Tags, ",") + "|" + point.DisplayName
}

func sanitizeFrameName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "series"
	}
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, "/", "_")
	value = strings.ReplaceAll(value, "\\", "_")
	return value
}

func derefFloat(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}

func marshalString(value any) string {
	bytes, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(bytes)
}

func marshalRaw(value any) json.RawMessage {
	bytes, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(bytes)
}
