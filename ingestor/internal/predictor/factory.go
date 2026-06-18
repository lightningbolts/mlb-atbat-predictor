package predictor

import (
	"fmt"
	"strings"
	"time"
)

const (
	BackendMock = "mock"
	BackendML   = "ml"
)

// NewFromConfig returns the predictor implementation selected by backend name.
func NewFromConfig(backend, mlEngineURL string, mlEngineTimeout time.Duration) (Predictor, error) {
	switch strings.ToLower(strings.TrimSpace(backend)) {
	case "", BackendMock:
		return NewMockPredictor(), nil
	case BackendML:
		pred, err := NewMLEnginePredictor(MLEngineOptions{
			BaseURL: mlEngineURL,
			Timeout: mlEngineTimeout,
		})
		if err != nil {
			return nil, err
		}
		return pred, nil
	default:
		return nil, fmt.Errorf("unknown predictor backend %q (use mock or ml)", backend)
	}
}
