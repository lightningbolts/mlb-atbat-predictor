package mlb

import "sync"

// StateTracker stores the last observed fingerprint per game in memory so we
// only invoke ML inference and database writes when something actually changed.
// A mutex protects the map because multiple goroutines could theoretically
// share a tracker in future fan-out designs; today each worker owns one tracker.
type StateTracker struct {
	mu          sync.Mutex
	fingerprints map[int]string // gamePK -> last fingerprint
}

// NewStateTracker creates an empty in-memory state store.
func NewStateTracker() *StateTracker {
	return &StateTracker{
		fingerprints: make(map[int]string),
	}
}

// HasChanged compares the new state's fingerprint with the stored value.
// On first observation for a gamePK it returns true and records the fingerprint.
func (t *StateTracker) HasChanged(state GameState) bool {
	fp := state.Fingerprint()

	t.mu.Lock()
	defer t.mu.Unlock()

	prev, seen := t.fingerprints[state.GamePK]
	if seen && prev == fp {
		return false
	}

	t.fingerprints[state.GamePK] = fp
	return true
}

// Reset removes stored state for a game (useful in tests).
func (t *StateTracker) Reset(gamePK int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.fingerprints, gamePK)
}
