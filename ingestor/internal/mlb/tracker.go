package mlb

import (
	"sync"
	"time"
)

// StateTracker stores the last processed pitch playId per game so we only invoke
// ML inference for pitches we have not yet seen. Fingerprints are committed only
// after a successful downstream write (see Commit).
type StateTracker struct {
	mu          sync.Mutex
	lastPitchID map[int]string // gamePK -> last successfully processed pitch playId
	lastStateFP map[int]string // gamePK -> fallback fingerprint for non-pitch changes
}

// NewStateTracker creates an empty in-memory state store.
func NewStateTracker() *StateTracker {
	return &StateTracker{
		lastPitchID: make(map[int]string),
		lastStateFP: make(map[int]string),
	}
}

// PendingStates returns one GameState per unseen pitch in the current at-bat,
// ordered oldest-first so rapid pitches between polls are all processed.
// When there are no new pitches but count/matchup/base state changed, a single
// state snapshot is returned. Returns nil when nothing new is observed.
func (t *StateTracker) PendingStates(base GameState, pitchEvents []PlayEvent) []GameState {
	pitches := pitchEventsInOrder(pitchEvents)
	if len(pitches) == 0 {
		return t.pendingNonPitchState(base)
	}

	t.mu.Lock()
	lastSeen := t.lastPitchID[base.GamePK]
	t.mu.Unlock()

	unseen := unseenPitchEvents(pitches, lastSeen)
	if len(unseen) == 0 {
		return nil
	}

	states := make([]GameState, 0, len(unseen))
	for i, ev := range unseen {
		state := base
		state.LastPlayEvent = ev.PlayID
		state.PitchCount = pitchIndex(pitches, ev.PlayID)
		if ev.Count != nil {
			state.Balls = ev.Count.Balls
			state.Strikes = ev.Count.Strikes
			state.Outs = ev.Count.Outs
		}
		if ev.PitchData != nil {
			state.LastPitch = &PitchSnapshot{
				PlayID:     ev.PlayID,
				StartSpeed: ev.PitchData.StartSpeed,
				EndSpeed:   ev.PitchData.EndSpeed,
				SzTop:      ev.PitchData.StrikeZoneTop,
				SzBot:      ev.PitchData.StrikeZoneBottom,
				X:          ev.PitchData.Coordinates.X,
				Y:          ev.PitchData.Coordinates.Y,
			}
		}
		state.ObservedAt = base.ObservedAt
		if i > 0 {
			// Stagger timestamps so ordering is preserved in the database.
			state.ObservedAt = base.ObservedAt.Add(time.Duration(i) * time.Millisecond)
		}
		states = append(states, state)
	}

	return states
}

func (t *StateTracker) pendingNonPitchState(base GameState) []GameState {
	if base.LastPlayEvent != "" {
		return nil
	}

	fp := base.Fingerprint()
	t.mu.Lock()
	prev := t.lastStateFP[base.GamePK]
	t.mu.Unlock()

	if prev == fp {
		return nil
	}

	return []GameState{base}
}

// Commit records a successfully processed state so it is not emitted again.
func (t *StateTracker) Commit(state GameState) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if state.LastPlayEvent != "" {
		t.lastPitchID[state.GamePK] = state.LastPlayEvent
	}
	t.lastStateFP[state.GamePK] = state.Fingerprint()
}

// Reset removes stored state for a game (useful in tests).
func (t *StateTracker) Reset(gamePK int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.lastPitchID, gamePK)
	delete(t.lastStateFP, gamePK)
}

func pitchEventsInOrder(events []PlayEvent) []PlayEvent {
	pitches := make([]PlayEvent, 0, len(events))
	for _, ev := range events {
		if ev.IsPitch && ev.PlayID != "" {
			pitches = append(pitches, ev)
		}
	}
	return pitches
}

func unseenPitchEvents(pitches []PlayEvent, lastSeen string) []PlayEvent {
	if len(pitches) == 0 {
		return nil
	}

	if lastSeen == "" {
		// First observation: predict for the current pitch only, not the full AB history.
		return pitches[len(pitches)-1:]
	}

	lastIdx := -1
	for i, p := range pitches {
		if p.PlayID == lastSeen {
			lastIdx = i
			break
		}
	}

	if lastIdx == -1 {
		// New at-bat — every pitch in the feed is new.
		return pitches
	}

	if lastIdx >= len(pitches)-1 {
		return nil
	}

	return pitches[lastIdx+1:]
}

func pitchIndex(pitches []PlayEvent, playID string) int {
	for i, p := range pitches {
		if p.PlayID == playID {
			return i + 1
		}
	}
	return len(pitches)
}
