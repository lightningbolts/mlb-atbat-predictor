import {
  LIVE_GAME_STATUSES,
  TRACKED_GAME_STATUSES,
  type ActiveGame,
  type MLBScheduleGame,
  type MLBScheduleResponse,
} from "@/types/mlb";

const MLB_SCHEDULE_BASE = "https://statsapi.mlb.com/api/v1";

/** MLB schedule dates use US Eastern (league local) calendar days. */
export function getMLBScheduleDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(date);
}

function toActiveGame(game: MLBScheduleGame): ActiveGame {
  const away = game.teams.away.team.name;
  const home = game.teams.home.team.name;

  return {
    gamePk: game.gamePk,
    awayTeam: away,
    homeTeam: home,
    label: `${away} @ ${home}`,
    status: game.status.abstractGameState,
    gameDate: game.gameDate,
  };
}

function statusRank(status: string): number {
  if (LIVE_GAME_STATUSES.has(status)) return 0;
  if (status === "Warmup" || status === "Pre-Game") return 1;
  if (status === "Preview") return 2;
  if (status === "Delayed") return 3;
  return 4;
}

function sortGames(a: ActiveGame, b: ActiveGame): number {
  const rankDiff = statusRank(a.status) - statusRank(b.status);
  if (rankDiff !== 0) return rankDiff;
  return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
}

/**
 * Fetches today's regular-season schedule and returns games that are live
 * or about to start. Live games are listed first.
 */
export async function fetchActiveGames(scheduleDate?: string): Promise<ActiveGame[]> {
  const date = scheduleDate ?? getMLBScheduleDate();
  const url = new URL(`${MLB_SCHEDULE_BASE}/schedule`);
  url.searchParams.set("sportId", "1");
  url.searchParams.set("date", date);
  url.searchParams.set("gameTypes", "R");

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MLB schedule request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as MLBScheduleResponse;
  const games: MLBScheduleGame[] = data.dates?.flatMap((d) => d.games ?? []) ?? [];

  return games
    .filter((g) => TRACKED_GAME_STATUSES.has(g.status.abstractGameState))
    .map(toActiveGame)
    .sort(sortGames);
}

/** Returns only game PKs with Live / In Progress status (for ingestor parity). */
export async function fetchLiveGamePks(scheduleDate?: string): Promise<number[]> {
  const games = await fetchActiveGames(scheduleDate);
  return games.filter((g) => LIVE_GAME_STATUSES.has(g.status)).map((g) => g.gamePk);
}
