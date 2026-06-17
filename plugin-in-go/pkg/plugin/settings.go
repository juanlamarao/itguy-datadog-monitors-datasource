package plugin

import (
	"encoding/json"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const PluginID = "itguy-datadog-monitors-datasource"
const monitorCacheTTL = 2 * time.Hour

type jsonSettings struct {
	APIBaseURL         string `json:"apiBaseUrl"`
	AppBaseURL         string `json:"appBaseUrl"`
	Timeout            int64  `json:"timeout"`
	ConcurrentSessions int    `json:"concurrentSessions"`
}

type datasourceSettings struct {
	APIBaseURL         string
	AppBaseURL         string
	APIKey             string
	ApplicationKey     string
	Timeout            time.Duration
	ConcurrentSessions int
}

func loadSettings(settings backend.DataSourceInstanceSettings) (datasourceSettings, error) {
	var jsonData jsonSettings
	if len(settings.JSONData) > 0 {
		if err := json.Unmarshal(settings.JSONData, &jsonData); err != nil {
			return datasourceSettings{}, err
		}
	}

	timeout := time.Duration(jsonData.Timeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	concurrentSessions := jsonData.ConcurrentSessions
	if concurrentSessions <= 0 {
		concurrentSessions = 2
	}

	return datasourceSettings{
		APIBaseURL:         jsonData.APIBaseURL,
		AppBaseURL:         jsonData.AppBaseURL,
		APIKey:             settings.DecryptedSecureJSONData["apiKey"],
		ApplicationKey:     settings.DecryptedSecureJSONData["applicationKey"],
		Timeout:            timeout,
		ConcurrentSessions: concurrentSessions,
	}, nil
}
