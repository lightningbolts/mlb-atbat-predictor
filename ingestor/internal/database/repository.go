// Package database is the persistence adapter for Supabase-hosted PostgreSQL.
// It uses pgx connection pooling and context-aware queries so shutdown cancels
// in-flight writes cleanly.
package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository executes SQL against the predictions table.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository opens a pgx pool from a Supabase/PostgreSQL connection string.
func NewRepository(ctx context.Context, databaseURL string) (*Repository, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	// Sized for up to 15 concurrent game workers plus headroom for bursts.
	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Repository{pool: pool}, nil
}

// Close drains and closes the underlying connection pool.
func (r *Repository) Close() {
	r.pool.Close()
}

// PredictionRow is the insert payload for a single at-bat prediction snapshot.
type PredictionRow struct {
	GamePK               int
	Timestamp            time.Time
	BatterName           string
	PitcherName          string
	Inning               int
	Balls                int
	Strikes              int
	Outs                 int
	OnFirst              bool
	OnSecond             bool
	OnThird              bool
	OutcomeProbabilities map[string]float64
}

const insertPredictionSQL = `
INSERT INTO predictions (
    id,
    game_pk,
    timestamp,
    batter_name,
    pitcher_name,
    inning,
    balls,
    strikes,
    outs,
    on_first,
    on_second,
    on_third,
    outcome_probabilities
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING id;
`

// InsertPrediction persists one prediction row. The context propagates cancellation
// from the polling worker so orphaned queries are not left running after shutdown.
func (r *Repository) InsertPrediction(ctx context.Context, row PredictionRow) (uuid.UUID, error) {
	if ctx.Err() != nil {
		return uuid.Nil, fmt.Errorf("context already canceled: %w", ctx.Err())
	}

	probsJSON, err := json.Marshal(row.OutcomeProbabilities)
	if err != nil {
		return uuid.Nil, fmt.Errorf("marshal outcome probabilities: %w", err)
	}

	id := uuid.New()
	ts := row.Timestamp
	if ts.IsZero() {
		ts = time.Now().UTC()
	}

	var returnedID uuid.UUID
	err = r.pool.QueryRow(ctx, insertPredictionSQL,
		id,
		row.GamePK,
		ts,
		row.BatterName,
		row.PitcherName,
		row.Inning,
		row.Balls,
		row.Strikes,
		row.Outs,
		row.OnFirst,
		row.OnSecond,
		row.OnThird,
		probsJSON,
	).Scan(&returnedID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert prediction: %w", err)
	}

	return returnedID, nil
}
