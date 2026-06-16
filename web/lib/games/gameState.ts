import { isGameBoxScore } from "@/lib/mlb/boxScore";
import type { GameBoxScore } from "@/types/mlb-boxscore";
import type { LiveGameState } from "@/types/mlb-live";

/** Validates and normalizes game_state JSON from Supabase. */
export function parseStoredGameState(raw: unknown, gamePk: number): LiveGameState | null {
  if (!raw || typeof raw !== "object") return null;

  const state = raw as Record<string, unknown>;
  if (typeof state.gamePk !== "number") {
    state.gamePk = gamePk;
  }

  if (!Array.isArray(state.plays)) return null;

  return state as unknown as LiveGameState;
}

/** Validates and normalizes box_score JSON from Supabase. */
export function parseStoredBoxScore(raw: unknown, gamePk: number): GameBoxScore | null {
  if (!isGameBoxScore(raw)) return null;

  if (raw.gamePk !== gamePk) {
    return { ...raw, gamePk };
  }

  return raw;
}
