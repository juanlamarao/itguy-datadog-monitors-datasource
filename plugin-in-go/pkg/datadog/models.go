package datadog

import "encoding/json"

type EndpointConfig struct {
	Source        string
	Endpoint      string
	ResponseField string
}

var MonitorEndpoint = EndpointConfig{
	Source:        "monitor",
	Endpoint:      "/monitor/search",
	ResponseField: "monitors",
}

var GroupMonitorEndpoint = EndpointConfig{
	Source:        "group_monitor",
	Endpoint:      "/monitor/groups/search",
	ResponseField: "groups",
}

type Metadata struct {
	TotalCount int `json:"total_count"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	PageCount  int `json:"page_count"`
}

type SearchResponse struct {
	Metadata *Metadata                  `json:"metadata"`
	Counts   map[string]any             `json:"counts"`
	Monitors []map[string]any           `json:"monitors"`
	Groups   []map[string]any           `json:"groups"`
	Raw      map[string]json.RawMessage `json:"-"`
}

type Query struct {
	RefID        string   `json:"refId"`
	QueryType    string   `json:"queryType"`
	QueryMode    string   `json:"queryMode"`
	OutputFormat string   `json:"outputFormat"`
	DatadogQuery string   `json:"datadogQuery"`
	Status       []string `json:"status"`
	Muted        string   `json:"muted"`
	Priority     []string `json:"priority"`
	Type         []string `json:"type"`
	Env          string   `json:"env"`
	Team         string   `json:"team"`
	Scope        string   `json:"scope"`
	Tag          string   `json:"tag"`
	ExtraOptions string   `json:"extraOptions"`
}

type NormalizedMonitor struct {
	Source          string
	Endpoint        string
	OrgURL          string
	ID              string
	Type            string
	Name            string
	Message         string
	Query           string
	Multi           bool
	Priority        string
	Tags            []string
	Status          string
	LastTriggeredTS float64
	MutedUntilTS    *float64
	MonitorURL      string
	Page            int
	PageCount       int
	TotalCount      int
	RawJSON         map[string]any
}
