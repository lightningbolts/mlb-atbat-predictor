package mlb

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// OnStateChange is invoked when the tracker detects new pitch or game state.
// Returning an error logs and continues polling so one bad write does not kill
// the worker; production systems may plug in metrics/alerts here.
type OnStateChange func(ctx context.Context, state GameState) error

// Worker polls a single game's live feed until context cancellation.
type Worker struct {
	client   *Client
	tracker  *StateTracker
	interval time.Duration
	onChange OnStateChange
	logger   *slog.Logger
}

// WorkerConfig wires dependencies for a game polling goroutine.
type WorkerConfig struct {
	Client   *Client
	Tracker  *StateTracker
	Interval time.Duration
	OnChange OnStateChange
	Logger   *slog.Logger
}

// NewWorker constructs a polling worker with required collaborators.
func NewWorker(cfg WorkerConfig) (*Worker, error) {
	if cfg.OnChange == nil {
		return nil, fmt.Errorf("OnChange handler is required")
	}

	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}

	return &Worker{
		client:   cfg.Client,
		tracker:  cfg.Tracker,
		interval: cfg.Interval,
		onChange: cfg.OnChange,
		logger:   logger,
	}, nil
}

// Run executes the poll loop for gamePK until ctx is canceled.
func (w *Worker) Run(ctx context.Context, gamePK int) error {
	log := w.logger.With("game_pk", gamePK)
	log.Info("polling worker started")

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	// Poll immediately on start so we do not wait a full interval for first data.
	if err := w.pollOnce(ctx, gamePK, log); err != nil {
		log.Error("initial poll failed", "error", err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Info("polling worker stopping", "reason", ctx.Err())
			return ctx.Err()
		case <-ticker.C:
			if err := w.pollOnce(ctx, gamePK, log); err != nil {
				log.Error("poll failed", "error", err)
			}
		}
	}
}

func (w *Worker) pollOnce(ctx context.Context, gamePK int, log *slog.Logger) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}

	feed, err := w.client.FetchLiveFeed(ctx, gamePK)
	if err != nil {
		return fmt.Errorf("fetch live feed: %w", err)
	}

	state := ToGameState(gamePK, feed)

	if !state.IsLive() {
		log.Debug("game not live, skipping prediction", "status", state.GameStatus)
		return nil
	}

	pending := w.tracker.PendingStates(state, feed.LiveData.Plays.CurrentPlay.PlayEvents)
	if len(pending) == 0 {
		log.Debug("no state change", "fingerprint", state.Fingerprint())
		return nil
	}

	for _, next := range pending {
		log.Info("state changed",
			"fingerprint", next.Fingerprint(),
			"batter", next.BatterName,
			"pitcher", next.PitcherName,
			"count", fmt.Sprintf("%d-%d", next.Balls, next.Strikes),
			"inning", next.Inning,
			"pitch", next.LastPlayEvent,
		)

		if err := w.onChange(ctx, next); err != nil {
			return fmt.Errorf("on state change: %w", err)
		}

		w.tracker.Commit(next)
	}

	return nil
}
