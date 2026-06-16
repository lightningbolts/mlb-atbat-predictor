package predictor

import (
	"context"
	"math"
	"math/rand"
	"time"

	"mlb-ingestor/internal/mlb"
)

// MockPredictor produces dynamic, count-aware probability distributions for UI
// development. It is intentionally stateless and cheap to call on every pitch.
type MockPredictor struct {
	rng *rand.Rand
}

// NewMockPredictor creates a mock predictor with a time-seeded RNG.
func NewMockPredictor() *MockPredictor {
	return &MockPredictor{
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Predict returns slightly randomized probabilities biased by balls/strikes.
// Examples: 3-0 favors walks; 0-2 favors strikeouts; 3-2 is high-variance.
func (m *MockPredictor) Predict(ctx context.Context, state mlb.GameState) (PredictionResult, error) {
	if err := ctx.Err(); err != nil {
		return PredictionResult{}, err
	}

	weights := baseWeights(state.Balls, state.Strikes)
	m.jitter(weights)

	normalized := normalize(weights)
	return PredictionResult{
		Strikeout: normalized[OutcomeStrikeout],
		Walk:      normalized[OutcomeWalk],
		Single:    normalized[OutcomeSingle],
		Double:    normalized[OutcomeDouble],
		Triple:    normalized[OutcomeTriple],
		HomeRun:   normalized[OutcomeHomeRun],
		FieldOut:  normalized[OutcomeFieldOut],
	}, nil
}

// baseWeights encodes heuristic priors before jitter and normalization.
func baseWeights(balls, strikes int) map[string]float64 {
	w := map[string]float64{
		OutcomeStrikeout: 0.18,
		OutcomeWalk:      0.08,
		OutcomeSingle:    0.22,
		OutcomeDouble:    0.07,
		OutcomeTriple:    0.01,
		OutcomeHomeRun:   0.09,
		OutcomeFieldOut:  0.35,
	}

	// Count-driven spikes make frontend demos react visibly to live state.
	switch {
	case balls >= 3 && strikes == 0:
		w[OutcomeWalk] = 0.48
		w[OutcomeSingle] = 0.15
		w[OutcomeFieldOut] = 0.12
		w[OutcomeStrikeout] = 0.05
	case balls == 3 && strikes <= 1:
		w[OutcomeWalk] = 0.42
		w[OutcomeStrikeout] = 0.08
	case strikes >= 2 && balls == 0:
		w[OutcomeStrikeout] = 0.55
		w[OutcomeWalk] = 0.03
		w[OutcomeFieldOut] = 0.22
	case strikes == 2:
		w[OutcomeStrikeout] = 0.38
		w[OutcomeFieldOut] = 0.28
	case balls == 3 && strikes == 2:
		w[OutcomeWalk] = 0.22
		w[OutcomeStrikeout] = 0.22
		w[OutcomeSingle] = 0.18
		w[OutcomeHomeRun] = 0.12
	}

	return w
}

// jitter adds small noise so repeated polls at the same count still vary slightly.
func (m *MockPredictor) jitter(weights map[string]float64) {
	for k, v := range weights {
		delta := (m.rng.Float64() - 0.5) * 0.06 // ±3%
		weights[k] = math.Max(0.001, v+delta)
	}
}

func normalize(weights map[string]float64) map[string]float64 {
	var sum float64
	for _, v := range weights {
		sum += v
	}

	out := make(map[string]float64, len(weights))
	for k, v := range weights {
		out[k] = v / sum
	}
	return out
}
