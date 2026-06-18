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

/** Browser-local calendar date (YYYY-MM-DD) for history browsing defaults. */
export function getLocalCalendarDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

export function addScheduleDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

const CARRYOVER_STATUSES = new Set([
  "Live",
  "In Progress",
  "Warmup",
  "Pre-Game",
  "Delayed",
]);

/** Preview games only appear when first pitch is within this window. */
const PREVIEW_WINDOW_MS = 4 * 60 * 60 * 1000;

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

function isTrackedNow(
  game: MLBScheduleGame,
  options: { now?: number; isTodaySlate?: boolean } = {},
): boolean {
  const { now = Date.now(), isTodaySlate = true } = options;
  const status = game.status.abstractGameState;
  if (!TRACKED_GAME_STATUSES.has(status)) return false;
  if (LIVE_GAME_STATUSES.has(status)) return true;
  if (status === "Warmup" || status === "Pre-Game" || status === "Delayed") return true;

  if (status === "Preview") {
    // Today's full slate is always visible; only apply the preview window to
    // carryover games from yesterday's ET date (west-coast night games).
    if (isTodaySlate) return true;
    const startMs = new Date(game.gameDate).getTime();
    return startMs - now <= PREVIEW_WINDOW_MS;
  }

  return false;
}

async function fetchScheduleForDate(date: string): Promise<MLBScheduleGame[]> {
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
  return data.dates?.flatMap((d) => d.games ?? []) ?? [];
}

/**
 * Fetches today's regular-season schedule and returns games that are live
 * or about to start. Includes carryover west-coast games from yesterday's ET
 * slate after midnight Eastern, and hides Preview games far in the future.
 */
export async function fetchActiveGames(scheduleDate?: string): Promise<ActiveGame[]> {
  const date = scheduleDate ?? getMLBScheduleDate();
  const prevDate = addScheduleDays(date, -1);

  const [todayGames, yesterdayGames] = await Promise.all([
    fetchScheduleForDate(date),
    fetchScheduleForDate(prevDate),
  ]);

  const byPk = new Map<number, MLBScheduleGame>();

  const yesterdayPk = new Set<number>();

  for (const game of yesterdayGames) {
    if (CARRYOVER_STATUSES.has(game.status.abstractGameState)) {
      byPk.set(game.gamePk, game);
      yesterdayPk.add(game.gamePk);
    }
  }

  for (const game of todayGames) {
    byPk.set(game.gamePk, game);
  }

  return [...byPk.values()]
    .filter((game) =>
      isTrackedNow(game, { isTodaySlate: !yesterdayPk.has(game.gamePk) }),
    )
    .map(toActiveGame)
    .sort(sortGames);
}

/** Returns only game PKs with Live / In Progress status (for ingestor parity). */
export async function fetchLiveGamePks(scheduleDate?: string): Promise<number[]> {
  const games = await fetchActiveGames(scheduleDate);
  return games.filter((g) => LIVE_GAME_STATUSES.has(g.status)).map((g) => g.gamePk);
}

/** Previous calendar day for carryover game queries. */
export function previousScheduleDate(date: string): string {
  return addScheduleDays(date, -1);
}

/** Statuses still active on a prior slate that should appear on the next day. */
export const ACTIVE_CARRYOVER_STATUSES = CARRYOVER_STATUSES;

/** Build a Season History URL that preserves browse position. */
export function buildSeasonHistoryHref(options: {
  date?: string;
  view?: "date" | "team";
  teamId?: number | null;
}): string {
  const params = new URLSearchParams();
  if (options.view === "team" && options.teamId) {
    params.set("teamId", String(options.teamId));
    params.set("view", "team");
  } else if (options.date) {
    params.set("date", options.date);
    params.set("view", "date");
  }
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}

/** Build a game detail URL that carries Season History context for back navigation. */
export function buildGameDetailHref(
  gamePk: number,
  history?: { date?: string; view?: "date" | "team"; teamId?: number | null },
): string {
  const params = new URLSearchParams();
  if (history?.view === "team" && history.teamId) {
    params.set("teamId", String(history.teamId));
    params.set("view", "team");
  } else if (history?.date) {
    params.set("date", history.date);
    params.set("view", "date");
  }
  const qs = params.toString();
  return qs ? `/games/${gamePk}?${qs}` : `/games/${gamePk}`;
}
