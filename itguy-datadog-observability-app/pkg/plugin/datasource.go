package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"

	monitorcache "github.com/itguy-servicos/grafana-datadog-observability-app/pkg/cache"
	"github.com/itguy-servicos/grafana-datadog-observability-app/pkg/datadog"
)

type Datasource struct {
	settings datasourceSettings
	client   *datadog.Client
	cache    *monitorcache.MonitorCache

	backend.CallResourceHandler
}

func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	parsedSettings, err := loadSettings(settings)
	if err != nil {
		return nil, err
	}

	client, err := datadog.NewClient(datadog.ClientConfig{
		APIBaseURL:     parsedSettings.APIBaseURL,
		AppBaseURL:     parsedSettings.AppBaseURL,
		APIKey:         parsedSettings.APIKey,
		ApplicationKey: parsedSettings.ApplicationKey,
		Timeout:        parsedSettings.Timeout,
	})
	if err != nil {
		return nil, err
	}

	ds := &Datasource{
		settings: parsedSettings,
		client:   client,
		cache:    monitorcache.NewMonitorCache(monitorCacheTTL),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/cache/status", ds.handleCacheStatus)
	mux.HandleFunc("/cache/refresh", ds.handleCacheRefresh)
	ds.CallResourceHandler = httpadapter.New(mux)

	return ds, nil
}

func (ds *Datasource) Dispose() {}

func (ds *Datasource) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	_, err := ds.client.SearchPage(ctx, datadog.MonitorEndpoint, "status:alert muted:false", 0)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Erro ao conectar no Datadog: %s", err.Error()),
		}, nil
	}

	_, stats, err := ds.cache.Get(ctx, ds.client, true)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Conexão OK, mas falhou ao atualizar cache de monitores: %s", err.Error()),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: fmt.Sprintf("Conexão com Datadog OK. Cache de monitores atualizado: %d monitor(es). TTL: 2h.", stats.Size),
	}, nil
}

func (ds *Datasource) handleCacheStatus(rw http.ResponseWriter, _ *http.Request) {
	writeJSON(rw, http.StatusOK, ds.cache.Stats())
}

func (ds *Datasource) handleCacheRefresh(rw http.ResponseWriter, req *http.Request) {
	_, stats, err := ds.cache.Get(req.Context(), ds.client, true)
	if err != nil {
		writeJSON(rw, http.StatusInternalServerError, map[string]any{
			"error": err.Error(),
			"stats": stats,
		})
		return
	}

	writeJSON(rw, http.StatusOK, stats)
}

func writeJSON(rw http.ResponseWriter, statusCode int, payload any) {
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(statusCode)
	_ = json.NewEncoder(rw).Encode(payload)
}
