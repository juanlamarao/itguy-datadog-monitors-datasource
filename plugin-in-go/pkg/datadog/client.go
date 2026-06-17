package datadog

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const DefaultPerPage = 100

type ClientConfig struct {
	APIBaseURL     string
	AppBaseURL     string
	APIKey         string
	ApplicationKey string
	Timeout        time.Duration
}

type Client struct {
	apiBaseURL     string
	appBaseURL     string
	apiKey         string
	applicationKey string
	httpClient     *http.Client
}

func NewClient(config ClientConfig) (*Client, error) {
	apiBaseURL := sanitizeBaseURL(config.APIBaseURL)
	if apiBaseURL == "" {
		apiBaseURL = "https://api.datadoghq.com/api"
	}

	if config.APIKey == "" {
		return nil, fmt.Errorf("DD-API-KEY não configurada")
	}

	if config.ApplicationKey == "" {
		return nil, fmt.Errorf("DD-APPLICATION-KEY não configurada")
	}

	timeout := config.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	return &Client{
		apiBaseURL:     apiBaseURL,
		appBaseURL:     sanitizeAppBaseURL(config.AppBaseURL),
		apiKey:         config.APIKey,
		applicationKey: config.ApplicationKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}, nil
}

func (c *Client) AppBaseURL() string {
	return c.appBaseURL
}

func (c *Client) SearchPage(ctx context.Context, endpoint EndpointConfig, query string, page int) (*SearchResponse, error) {
	params := url.Values{}
	params.Set("query", query)
	params.Set("per_page", fmt.Sprintf("%d", DefaultPerPage))
	params.Set("page", fmt.Sprintf("%d", page))

	var response SearchResponse
	if err := c.getJSON(ctx, endpoint.Endpoint, params, &response); err != nil {
		return nil, err
	}

	if response.Metadata == nil {
		response.Metadata = &Metadata{TotalCount: 0, Page: page, PerPage: DefaultPerPage, PageCount: 1}
	}

	if response.Metadata.PageCount <= 0 {
		response.Metadata.PageCount = 1
	}

	return &response, nil
}

func (c *Client) ListMonitors(ctx context.Context) ([]map[string]any, error) {
	var monitors []map[string]any
	if err := c.getJSON(ctx, "/monitor", nil, &monitors); err != nil {
		return nil, err
	}

	return monitors, nil
}

func (c *Client) getJSON(ctx context.Context, path string, params url.Values, target any) error {
	requestURL, err := c.buildURL(path, params)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}

	req.Header.Set("DD-API-KEY", c.apiKey)
	req.Header.Set("DD-APPLICATION-KEY", c.applicationKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := strings.TrimSpace(string(body))
		if len(message) > 500 {
			message = message[:500]
		}
		return fmt.Errorf("Datadog retornou HTTP %d: %s", resp.StatusCode, message)
	}

	if len(body) == 0 {
		return nil
	}

	return json.Unmarshal(body, target)
}

func (c *Client) buildURL(path string, params url.Values) (string, error) {
	base, err := url.Parse(c.apiBaseURL)
	if err != nil {
		return "", err
	}

	base.Path = strings.TrimRight(base.Path, "/") + "/v1" + path
	if params != nil {
		base.RawQuery = params.Encode()
	}

	return base.String(), nil
}

func sanitizeBaseURL(value string) string {
	return strings.TrimRight(strings.TrimSpace(value), "/")
}

func sanitizeAppBaseURL(value string) string {
	trimmed := strings.TrimRight(strings.TrimSpace(value), "/")
	trimmed = strings.TrimSuffix(trimmed, "/account/login")
	return strings.TrimRight(trimmed, "/")
}
