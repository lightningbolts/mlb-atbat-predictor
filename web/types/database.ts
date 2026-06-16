/**
 * TypeScript definitions mirroring the Supabase `predictions` table schema.
 * JSONB keys use snake_case to match the Go ingestor persistence layer.
 */

/** Terminal at-bat outcome probability distribution (sums to ~1.0). */
export interface OutcomeProbabilities {
  strikeout: number;
  walk: number;
  single: number;
  double: number;
  triple: number;
  home_run: number;
  field_out: number;
}

/** A single row from the `predictions` table. */
export interface Prediction {
  id: string;
  game_pk: number;
  timestamp: string;
  batter_name: string;
  pitcher_name: string;
  inning: number;
  balls: number;
  strikes: number;
  outs: number;
  on_first: boolean;
  on_second: boolean;
  on_third: boolean;
  outcome_probabilities: OutcomeProbabilities;
}

/** Supabase Database type map for typed client usage. */
export interface Database {
  public: {
    Tables: {
      predictions: {
        Row: Prediction;
        Insert: Omit<Prediction, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        };
        Update: Partial<Prediction>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/** Display-friendly outcome key used in UI components. */
export type OutcomeKey = keyof OutcomeProbabilities;

/** Human-readable labels for each outcome probability key. */
export const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  home_run: "Home Run",
  triple: "Triple",
  double: "Double",
  single: "Single",
  walk: "Walk",
  field_out: "Field Out",
  strikeout: "Strikeout",
};

/** Default zeroed probabilities — safe fallback when payload fields are missing. */
export const DEFAULT_OUTCOME_PROBABILITIES: OutcomeProbabilities = {
  strikeout: 0,
  walk: 0,
  single: 0,
  double: 0,
  triple: 0,
  home_run: 0,
  field_out: 0,
};

/** Display order for the probability matrix (most exciting outcomes first). */
export const OUTCOME_DISPLAY_ORDER: OutcomeKey[] = [
  "home_run",
  "triple",
  "double",
  "single",
  "walk",
  "field_out",
  "strikeout",
];
