-- Predictions written by the ingestor for real-time frontend consumption.
-- Apply in Supabase SQL editor or via migration tooling.

CREATE TABLE IF NOT EXISTS predictions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_pk                 INTEGER NOT NULL,
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batter_name             TEXT NOT NULL,
    pitcher_name            TEXT NOT NULL,
    inning                  INTEGER NOT NULL,
    balls                   INTEGER NOT NULL,
    strikes                 INTEGER NOT NULL,
    outs                    INTEGER NOT NULL,
    on_first                BOOLEAN NOT NULL DEFAULT FALSE,
    on_second               BOOLEAN NOT NULL DEFAULT FALSE,
    on_third                BOOLEAN NOT NULL DEFAULT FALSE,
    outcome_probabilities   JSONB NOT NULL,

    CONSTRAINT predictions_outcome_probabilities_object
        CHECK (jsonb_typeof(outcome_probabilities) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_predictions_game_pk_timestamp
    ON predictions (game_pk, timestamp DESC);

COMMENT ON TABLE predictions IS 'Live at-bat outcome probabilities produced by the ingestor.';
COMMENT ON COLUMN predictions.outcome_probabilities IS 'Map of outcome -> probability; keys: strikeout, walk, single, double, triple, home_run, field_out';
