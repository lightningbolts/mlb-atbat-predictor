/** MLB Stats API schedule response (subset used by the dashboard). */

export interface MLBScheduleTeam {
  team: {
    name: string;
    abbreviation?: string;
  };
}

export interface MLBScheduleGame {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
    detailedState?: string;
  };
  teams: {
    away: MLBScheduleTeam;
    home: MLBScheduleTeam;
  };
}

export interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: MLBScheduleGame[];
  }>;
}

/** Game row shown in the sidebar and mobile picker. */
export interface ActiveGame {
  gamePk: number;
  awayTeam: string;
  homeTeam: string;
  label: string;
  status: string;
  gameDate: string;
}

/** Statuses we surface in the active-games list (live first, then upcoming). */
export const TRACKED_GAME_STATUSES = new Set([
  "Live",
  "In Progress",
  "Warmup",
  "Preview",
  "Pre-Game",
  "Delayed",
]);

export const LIVE_GAME_STATUSES = new Set(["Live", "In Progress"]);
