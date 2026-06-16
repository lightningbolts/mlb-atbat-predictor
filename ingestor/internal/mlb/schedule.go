package mlb

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

const scheduleAPIBase = "https://statsapi.mlb.com/api/v1"

// scheduleResponse is a minimal decode of GET /schedule for game discovery.
type scheduleResponse struct {
	Dates []struct {
		Games []struct {
			GamePK int `json:"gamePk"`
			Status struct {
				AbstractGameState string `json:"abstractGameState"`
			} `json:"status"`
		} `json:"games"`
	} `json:"dates"`
}

// ScheduleDateET returns today's date in YYYY-MM-DD for the America/New_York
// calendar, which MLB uses for schedule queries.
func ScheduleDateET(t time.Time) string {
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		loc = time.UTC
	}
	return t.In(loc).Format("2006-01-02")
}

// FetchLiveGamePKs returns game primary keys that are currently Live according
// to the MLB schedule endpoint. Used when AUTO_DISCOVER_GAMES is enabled.
func FetchLiveGamePKs(ctx context.Context, httpClient *http.Client, date string) ([]int, error) {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if date == "" {
		date = ScheduleDateET(time.Now())
	}

	endpoint, err := url.Parse(scheduleAPIBase + "/schedule")
	if err != nil {
		return nil, fmt.Errorf("parse schedule url: %w", err)
	}
	q := endpoint.Query()
	q.Set("sportId", "1")
	q.Set("date", date)
	q.Set("gameTypes", "R")
	endpoint.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("build schedule request: %w", err)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch schedule: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("schedule status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload scheduleResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode schedule: %w", err)
	}

	var pks []int
	for _, day := range payload.Dates {
		for _, game := range day.Games {
			if strings.EqualFold(game.Status.AbstractGameState, "Live") ||
				strings.EqualFold(game.Status.AbstractGameState, "In Progress") {
				pks = append(pks, game.GamePK)
			}
		}
	}

	return pks, nil
}

// DiscoverLiveGamePKs fetches currently live game IDs using this client's HTTP pool.
func (c *Client) DiscoverLiveGamePKs(ctx context.Context, date string) ([]int, error) {
	return FetchLiveGamePKs(ctx, c.httpClient, date)
}
