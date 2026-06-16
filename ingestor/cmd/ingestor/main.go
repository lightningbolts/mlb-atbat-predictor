// Command ingestor polls the MLB Stats API for live games, detects at-bat state
// changes, runs ML inference (mock for now), and writes predictions to Supabase.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"mlb-ingestor/internal/config"
	"mlb-ingestor/internal/database"
	"mlb-ingestor/internal/mlb"
	"mlb-ingestor/internal/pipeline"
	"mlb-ingestor/internal/predictor"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	if err := run(logger); err != nil {
		logger.Error("ingestor exited with error", "error", err)
		os.Exit(1)
	}
}

type workerPool struct {
	mu     sync.Mutex
	active map[int]struct{}
	wg     *sync.WaitGroup
}

func newWorkerPool(wg *sync.WaitGroup) *workerPool {
	return &workerPool{
		active: make(map[int]struct{}),
		wg:     wg,
	}
}

func (p *workerPool) startWorker(
	ctx context.Context,
	gamePK int,
	worker *mlb.Worker,
	logger *slog.Logger,
) {
	p.mu.Lock()
	if _, exists := p.active[gamePK]; exists {
		p.mu.Unlock()
		return
	}
	p.active[gamePK] = struct{}{}
	p.mu.Unlock()

	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		defer func() {
			p.mu.Lock()
			delete(p.active, gamePK)
			p.mu.Unlock()
		}()

		if err := worker.Run(ctx, gamePK); err != nil && ctx.Err() == nil {
			logger.Error("worker stopped unexpectedly",
				"game_pk", gamePK,
				"error", err,
			)
		}
	}()
}

func (p *workerPool) count() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.active)
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logger.Info("configuration loaded",
		"game_count", len(cfg.GamePKs),
		"auto_discover", cfg.AutoDiscoverGames,
		"poll_interval", cfg.PollInterval.String(),
		"schedule_refresh", cfg.ScheduleRefreshInterval.String(),
		"mlb_api", cfg.MLBAPIBaseURL,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		logger.Info("shutdown signal received", "signal", sig.String())
		cancel()
	}()

	repo, err := database.NewRepository(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("init database: %w", err)
	}
	defer repo.Close()

	mlbClient := mlb.NewClient(mlb.ClientOptions{
		BaseURL:    cfg.MLBAPIBaseURL,
		Timeout:    cfg.HTTPClientTimeout,
		MaxRetries: cfg.HTTPMaxRetries,
		BaseDelay:  cfg.HTTPRetryBaseDelay,
	})

	pred := predictor.NewMockPredictor()
	tracker := mlb.NewStateTracker()
	onChange := pipeline.StateChangeHandler(pred, repo, logger.With("component", "pipeline"))

	worker, err := mlb.NewWorker(mlb.WorkerConfig{
		Client:   mlbClient,
		Tracker:  tracker,
		Interval: cfg.PollInterval,
		OnChange: onChange,
		Logger:   logger.With("component", "poller"),
	})
	if err != nil {
		return fmt.Errorf("create worker: %w", err)
	}

	var wg sync.WaitGroup
	pool := newWorkerPool(&wg)

	startGames := func(gamePKs []int) {
		if len(gamePKs) > 15 {
			logger.Warn("truncating game list to 15 workers", "requested", len(gamePKs))
			gamePKs = gamePKs[:15]
		}
		for _, gamePK := range gamePKs {
			pool.startWorker(ctx, gamePK, worker, logger.With("component", "poller"))
		}
	}

	discoverLiveGames := func() ([]int, error) {
		date := mlb.ScheduleDateET(time.Now())
		pks, err := mlbClient.DiscoverLiveGamePKs(ctx, date)
		if err != nil {
			return nil, err
		}
		logger.Info("discovered live games from MLB schedule", "date", date, "count", len(pks), "game_pks", pks)
		return pks, nil
	}

	if cfg.AutoDiscoverGames {
		pks, err := discoverLiveGames()
		if err != nil {
			return fmt.Errorf("discover live games: %w", err)
		}
		if len(pks) == 0 {
			logger.Info("no live games on schedule yet; will re-check periodically")
		}
		startGames(pks)

		wg.Add(1)
		go func() {
			defer wg.Done()
			ticker := time.NewTicker(cfg.ScheduleRefreshInterval)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					pks, err := discoverLiveGames()
					if err != nil {
						logger.Error("schedule refresh failed", "error", err)
						continue
					}
					startGames(pks)
				}
			}
		}()
	} else {
		startGames(cfg.GamePKs)
	}

	logger.Info("ingestor running", "active_workers", pool.count())
	wg.Wait()
	logger.Info("all workers stopped; ingestor shutdown complete")

	return nil
}
