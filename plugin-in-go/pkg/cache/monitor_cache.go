package cache

import (
	"context"
	"sync"
	"time"

	"github.com/itguy-servicos/grafana-datadog-monitors-app/pkg/datadog"
)

type MonitorCache struct {
	mu       sync.Mutex
	ttl      time.Duration
	loadedAt time.Time
	details  map[string]map[string]any
	lastErr  string
}

type Stats struct {
	LoadedAt   time.Time `json:"loadedAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
	TTLSeconds int64     `json:"ttlSeconds"`
	Size       int       `json:"size"`
	Expired    bool      `json:"expired"`
	LastError  string    `json:"lastError,omitempty"`
}

func NewMonitorCache(ttl time.Duration) *MonitorCache {
	return &MonitorCache{
		ttl:     ttl,
		details: map[string]map[string]any{},
	}
}

func (c *MonitorCache) Get(ctx context.Context, client *datadog.Client, force bool) (map[string]map[string]any, Stats, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !force && !c.isExpiredLocked(time.Now()) && len(c.details) > 0 {
		return cloneDetails(c.details), c.statsLocked(time.Now()), nil
	}

	monitors, err := client.ListMonitors(ctx)
	if err != nil {
		c.lastErr = err.Error()
		return cloneDetails(c.details), c.statsLocked(time.Now()), err
	}

	c.details = datadog.BuildMonitorDetailsMap(monitors)
	c.loadedAt = time.Now()
	c.lastErr = ""

	return cloneDetails(c.details), c.statsLocked(time.Now()), nil
}

func (c *MonitorCache) Stats() Stats {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.statsLocked(time.Now())
}

func (c *MonitorCache) isExpiredLocked(now time.Time) bool {
	if c.loadedAt.IsZero() {
		return true
	}
	return now.Sub(c.loadedAt) >= c.ttl
}

func (c *MonitorCache) statsLocked(now time.Time) Stats {
	expiresAt := time.Time{}
	if !c.loadedAt.IsZero() {
		expiresAt = c.loadedAt.Add(c.ttl)
	}

	return Stats{
		LoadedAt:   c.loadedAt,
		ExpiresAt:  expiresAt,
		TTLSeconds: int64(c.ttl.Seconds()),
		Size:       len(c.details),
		Expired:    c.isExpiredLocked(now),
		LastError:  c.lastErr,
	}
}

func cloneDetails(input map[string]map[string]any) map[string]map[string]any {
	output := make(map[string]map[string]any, len(input))
	for id, details := range input {
		cloned := make(map[string]any, len(details))
		for key, value := range details {
			cloned[key] = value
		}
		output[id] = cloned
	}
	return output
}
