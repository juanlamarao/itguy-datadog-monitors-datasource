package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"

	"github.com/itguy-servicos/grafana-datadog-observability-app/pkg/plugin"
)

func main() {
	if err := datasource.Manage(plugin.PluginID, plugin.NewDatasource, datasource.ManageOpts{}); err != nil {
		backend.Logger.Error("failed to start datasource backend", "error", err)
		os.Exit(1)
	}
}
