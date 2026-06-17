package datadog

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

func NormalizeMetricPoints(query string, alias string, response *MetricsQueryResponse) []NormalizedMetricPoint {
	if response == nil {
		return nil
	}

	points := make([]NormalizedMetricPoint, 0)

	for _, series := range response.Series {
		unit := firstUnitName(series.Unit)
		displayName := strings.TrimSpace(series.DisplayName)
		if displayName == "" {
			displayName = strings.TrimSpace(series.Metric)
		}
		if strings.TrimSpace(alias) != "" {
			displayName = applyMetricAlias(alias, series)
		}

		for _, point := range series.Pointlist {
			if len(point) < 2 || point[0] == nil {
				continue
			}

			timestampMS := *point[0]
			var value *float64
			if point[1] != nil {
				parsed := *point[1]
				value = &parsed
			}

			rawJSON := map[string]any{
				"query":        query,
				"metric":       series.Metric,
				"display_name": displayName,
				"scope":        series.Scope,
				"tag_set":      series.TagSet,
				"unit":         unit,
				"timestamp_ms": timestampMS,
				"value":        value,
				"expression":   series.Expression,
				"interval":     series.Interval,
			}

			points = append(points, NormalizedMetricPoint{
				Source:      "metric",
				Query:       query,
				Metric:      series.Metric,
				DisplayName: displayName,
				Scope:       series.Scope,
				Tags:        series.TagSet,
				Unit:        unit,
				Timestamp:   time.UnixMilli(int64(timestampMS)),
				TimestampMS: timestampMS,
				Value:       value,
				RawJSON:     rawJSON,
			})
		}
	}

	return points
}

func firstUnitName(units []map[string]any) string {
	for _, unit := range units {
		for _, key := range []string{"short_name", "name", "family"} {
			value := strings.TrimSpace(fmt.Sprint(unit[key]))
			if value != "" && value != "<nil>" {
				return value
			}
		}
	}
	return ""
}

func applyMetricAlias(alias string, series MetricSeries) string {
	result := alias
	replacements := map[string]string{
		"$metric":       series.Metric,
		"$display_name": series.DisplayName,
		"$scope":        series.Scope,
	}

	for token, value := range replacements {
		result = strings.ReplaceAll(result, token, value)
	}

	for index, tag := range series.TagSet {
		result = strings.ReplaceAll(result, "$tag"+strconv.Itoa(index+1), tag)
	}

	return strings.TrimSpace(result)
}
