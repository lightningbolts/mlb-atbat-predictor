package database

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// GameFeedUpdate persists play-by-play and box score JSON for Season History.
type GameFeedUpdate struct {
	GameState    []byte
	BoxScore     []byte
	Status       string
	AwayScore    int
	HomeScore    int
	VenueID      *int
	VenueName    string
	FeedSyncedAt time.Time
}

// Store persists predictions and game metadata.
type Store interface {
	InsertPrediction(ctx context.Context, row PredictionRow) (uuid.UUID, error)
	UpsertGames(ctx context.Context, rows []GameRow) error
	UpdateGameFromPoll(ctx context.Context, gamePK int, status string, awayScore, homeScore int) error
	UpdateLiveGameState(ctx context.Context, gamePK int, status string, awayScore, homeScore int, gameState []byte) error
	UpdateGameFeed(ctx context.Context, gamePK int, update GameFeedUpdate) error
	ListGamesNeedingFeedSync(ctx context.Context, sinceDate string, limit int) ([]int, error)
	Close()
}
