"""Shared outcome labels and feature columns for the ml-engine pipeline."""

# Must match ingestor/internal/predictor/predictor.go and web/types/database.ts
OUTCOME_KEYS = [
    "strikeout",
    "walk",
    "single",
    "double",
    "triple",
    "home_run",
    "field_out",
]

# Features available at live inference time (ingestor GameState)
FEATURE_COLS = [
    "inning",
    "balls",
    "strikes",
    "outs",
    "on_first",
    "on_second",
    "on_third",
    "runners_code",
    "half_inning_bottom",
    "pitch_count_in_ab",
]
