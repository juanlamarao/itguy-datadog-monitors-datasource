package datadog

import (
	"encoding/json"
	"time"
)

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
	MetricQuery  string   `json:"metricQuery"`
	MetricAlias  string   `json:"metricAlias"`
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

type MetricsQueryResponse struct {
	Status   string         `json:"status"`
	ResType  string         `json:"res_type"`
	FromDate float64        `json:"from_date"`
	ToDate   float64        `json:"to_date"`
	Message  string         `json:"message"`
	Series   []MetricSeries `json:"series"`
	GroupBy  []string       `json:"group_by"`
}

type MetricSeries struct {
	Metric      string           `json:"metric"`
	DisplayName string           `json:"display_name"`
	Scope       string           `json:"scope"`
	Expression  string           `json:"expression"`
	Interval    float64          `json:"interval"`
	Length      int              `json:"length"`
	Start       float64          `json:"start"`
	End         float64          `json:"end"`
	TagSet      []string         `json:"tag_set"`
	Pointlist   [][]*float64     `json:"pointlist"`
	Unit        []map[string]any `json:"unit"`
}

type NormalizedMetricPoint struct {
	Source      string
	Query       string
	Metric      string
	DisplayName string
	Scope       string
	Tags        []string
	Unit        string
	Timestamp   time.Time
	TimestampMS float64
	Value       *float64
	RawJSON     map[string]any
}
