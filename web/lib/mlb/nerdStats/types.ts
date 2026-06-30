export type NerdStatCategory =
  | "drama"
  | "misfortune"
  | "baserunning"
  | "contact"
  | "chaos";

export const NERD_STAT_CATEGORIES: Array<{ id: NerdStatCategory; label: string }> = [
  { id: "drama", label: "Drama" },
  { id: "misfortune", label: "Misfortune" },
  { id: "baserunning", label: "Baserunning" },
  { id: "contact", label: "Contact" },
  { id: "chaos", label: "Chaos" },
];

export interface NotableNerdEvent {
  statId: string;
  gamePk: number;
  gameDate: string;
  label: string;
  detail?: string;
  value?: number;
}

export interface TeamNerdCounters {
  gamesPlayed: number;
  finalGamesWithFeed: number;
  oneRunGames: number;
  extraInningGames: number;
  blowoutLosses: number;
  runsScored: number;
  runsWithTwoOuts: number;
  plateAppearances: number;
  strikeouts: number;
  walks: number;
  gidp: number;
  triplePlays: number;
  triplePlayOpportunities: number;
  hbp: number;
  sacFlies: number;
  stolenBases: number;
  caughtStealing: number;
  pickoffs: number;
  walkoffBloopSingles: number;
  bloopSingles: number;
  infieldSingles: number;
  lateInningRuns: number;
  homeRuns: number;
  softestHomeRunMph: number | null;
  notableEvents: NotableNerdEvent[];
}

export type SeasonNerdCounters = Record<string, TeamNerdCounters>;

export interface NerdStatLeader {
  teamId: number;
  abbrev: string;
  teamName: string;
  value: number;
  rank: number;
  displayValue: string;
}

export interface NerdStatLeaderboard {
  id: string;
  title: string;
  subtitle: string;
  category: NerdStatCategory;
  sort: "asc" | "desc";
  unit: string;
  leagueAverage: number | null;
  leagueAverageDisplay: string | null;
  leaders: NerdStatLeader[];
}

export interface NerdStatsSummary {
  season: number;
  generatedAt: string;
  indexedGameCount: number;
  stats: NerdStatLeaderboard[];
  statOfTheDayId: string;
  backfillPending?: boolean;
  source?: "file" | "empty";
}

export interface NerdStatDetail {
  season: number;
  stat: NerdStatLeaderboard;
  allTeams: NerdStatLeader[];
  notableEvents: NotableNerdEvent[];
  generatedAt: string;
}

export interface TeamNerdCard {
  season: number;
  teamId: number;
  abbrev: string;
  teamName: string;
  generatedAt: string;
  stats: Array<{
    statId: string;
    title: string;
    category: NerdStatCategory;
    rank: number;
    value: number;
    displayValue: string;
    sort: "asc" | "desc";
  }>;
}

export interface NerdStatsManifest {
  season: number;
  processedGamePks: number[];
  generatedAt: string;
}

export interface GameNerdSourceRow {
  game_pk: number;
  game_date: string;
  season: number;
  away_team_id: number;
  home_team_id: number;
  away_team_abbrev: string;
  home_team_abbrev: string;
  away_score: number | null;
  home_score: number | null;
  game_state: unknown;
  box_score: unknown;
  feed_synced_at: string | null;
}
