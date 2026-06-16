package predictor

import "errors"

var (
	errNegativeProbability = errors.New("prediction contains negative probability")
	errProbabilitySum      = errors.New("prediction probabilities must sum to 1.0")
)
