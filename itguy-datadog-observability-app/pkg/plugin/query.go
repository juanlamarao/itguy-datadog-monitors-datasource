package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"

	"github.com/itguy-servicos/grafana-datadog-observability-app/pkg/datadog"
)

func (ds *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	for _, query := range req.Queries {
		dataResponse := ds.query(ctx, query)
		response.Responses[query.RefID] = dataResponse
	}

	return response, nil
}

func (ds *Datasource) query(ctx context.Context, query backend.DataQuery) backend.DataResponse {
	var target datadog.Query
	if len(query.JSON) > 0 {
		if err := json.Unmarshal(query.JSON, &target); err != nil {
			return backend.DataResponse{Error: fmt.Errorf("erro ao interpretar query JSON: %w", err)}
		}
	}

	target.RefID = query.RefID
	if target.QueryType == "" {
		target.QueryType = QueryTypeMonitor
	}

	switch strings.ToLower(target.QueryType) {
	case QueryTypeMetric, "metrics":
		return ds.queryMetrics(ctx, query, target)
	default:
		return ds.queryMonitors(ctx, query, target)
	}
}

func (ds *Datasource) queryMonitors(ctx context.Context, grafanaQuery backend.DataQuery, target datadog.Query) backend.DataResponse {
	if target.OutputFormat == "" || target.OutputFormat == "timeseries" {
		target.OutputFormat = "table"
	}

	results, err := ds.executeMonitorQuery(ctx, target)
	if err != nil {
		return backend.DataResponse{Error: err}
	}

	var frame *data.Frame
	if target.OutputFormat == "problems" {
		frame = buildProblemsFrame(grafanaQuery.RefID, results)
	} else {
		frame = buildTableFrame(grafanaQuery.RefID, results)
	}

	return backend.DataResponse{Frames: data.Frames{frame}}
}

func (ds *Datasource) queryMetrics(ctx context.Context, grafanaQuery backend.DataQuery, target datadog.Query) backend.DataResponse {
	if strings.TrimSpace(target.MetricQuery) == "" {
		return backend.DataResponse{Error: fmt.Errorf("metricQuery não informado")}
	}

	from := grafanaQuery.TimeRange.From.Unix()
	to := grafanaQuery.TimeRange.To.Unix()

	response, err := ds.client.QueryMetrics(ctx, strings.TrimSpace(target.MetricQuery), from, to)
	if err != nil {
		return backend.DataResponse{Error: fmt.Errorf("erro ao consultar métricas Datadog: %w", err)}
	}

	points := datadog.NormalizeMetricPoints(target.MetricQuery, target.MetricAlias, response)
	if target.OutputFormat == "table" {
		return backend.DataResponse{Frames: data.Frames{buildMetricTableFrame(grafanaQuery.RefID, points)}}
	}

	frames := buildMetricTimeSeriesFrames(grafanaQuery.RefID, target.MetricQuery, points)
	return backend.DataResponse{Frames: frames}
}

func (ds *Datasource) executeMonitorQuery(ctx context.Context, query datadog.Query) ([]datadog.NormalizedMonitor, error) {
	endpoints := datadog.ResolveEndpoints(query.QueryType)
	shouldLoadMonitorDetails := false
	for _, endpoint := range endpoints {
		if endpoint.Source == "group_monitor" {
			shouldLoadMonitorDetails = true
			break
		}
	}

	monitorDetailsByID := map[string]map[string]any{}
	if shouldLoadMonitorDetails {
		details, _, err := ds.cache.Get(ctx, ds.client, false)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar cache de monitores Datadog: %w", err)
		}
		monitorDetailsByID = details
	}

	datadogQuery := datadog.BuildDatadogQuery(query)
	results := make([]datadog.NormalizedMonitor, 0)

	for _, endpoint := range endpoints {
		endpointResults, err := ds.fetchMonitorEndpointWithPagination(ctx, endpoint, datadogQuery, monitorDetailsByID)
		if err != nil {
			return nil, err
		}
		results = append(results, endpointResults...)
	}

	return results, nil
}

func (ds *Datasource) fetchMonitorEndpointWithPagination(ctx context.Context, endpoint datadog.EndpointConfig, datadogQuery string, monitorDetailsByID map[string]map[string]any) ([]datadog.NormalizedMonitor, error) {
	allResults := make([]datadog.NormalizedMonitor, 0)
	currentPage := 0
	pageCount := 1

	for currentPage < pageCount {
		response, err := ds.client.SearchPage(ctx, endpoint, datadogQuery, currentPage)
		if err != nil {
			return nil, fmt.Errorf("erro ao consultar Datadog %s página %d: %w", endpoint.Endpoint, currentPage, err)
		}

		metadata := response.Metadata
		pageCount = metadata.PageCount

		var items []map[string]any
		if endpoint.ResponseField == "groups" {
			items = response.Groups
		} else {
			items = response.Monitors
		}

		for _, item := range items {
			normalized := datadog.NormalizeSearchResult(endpoint, item, metadata.Page, metadata.PageCount, metadata.TotalCount, monitorDetailsByID, ds.client.AppBaseURL())
			allResults = append(allResults, normalized)
		}

		currentPage++
	}

	return allResults, nil
}
