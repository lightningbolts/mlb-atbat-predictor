import { ballparkIndex } from "@/lib/mlb/ballparkPaths";
import { computeGameHitStats, extractGameHits, type GameHit, type GameHitStats } from "@/lib/mlb/gameHits";
import { parseStoredGameState } from "@/lib/games/gameState";
import type { BallparkData } from "@/types/ballpark";
import type { LiveGameState } from "@/types/mlb-live";

export interface VenueHit extends GameHit {
  hitKey: string;
  gamePk: number;
  gameDate: string;
  awayAbbrev: string;
  homeAbbrev: string;
}

export interface BallparkHitsSummary {
  venueId: number;
  venueName: string;
  teamId: number;
  teamAbbrev: string;
  teamName: string;
  stadiumSlug: string;
  stats: GameHitStats;
  gameCount: number;
  /** Minimal hit data for spray chart previews on the index grid. */
  previewHits: VenueHit[];
}

export interface BallparkHitsAggregate {
  season: number;
  parks: BallparkHitsSummary[];
  generatedAt: string;
}

export interface BallparkHitsDetail {
  season: number;
  park: BallparkData;
  hits: VenueHit[];
  stats: GameHitStats;
  gameCount: number;
  generatedAt: string;
}

interface GameHitsRow {
  game_pk: number;
  game_date: string;
  venue_id: number | null;
  away_team_abbrev: string;
  home_team_abbrev: string;
  game_state: LiveGameState | unknown | null;
}

function extractVenueHitsFromGame(row: GameHitsRow): VenueHit[] {
  const state = parseStoredGameState(row.game_state, row.game_pk);
  if (!state?.plays?.length) return [];

  return extractGameHits(state.plays).map((hit) => ({
    ...hit,
    hitKey: `${row.game_pk}-${hit.atBatIndex}`,
    gamePk: row.game_pk,
    gameDate: row.game_date,
    awayAbbrev: row.away_team_abbrev,
    homeAbbrev: row.home_team_abbrev,
  }));
}

export function aggregateBallparkHits(
  season: number,
  rows: GameHitsRow[],
  venueIdFilter?: number,
): BallparkHitsAggregate | BallparkHitsDetail {
  const hitsByVenue = new Map<number, VenueHit[]>();
  const gamesByVenue = new Map<number, Set<number>>();

  for (const row of rows) {
    if (row.venue_id == null) continue;
    if (venueIdFilter != null && row.venue_id !== venueIdFilter) continue;

    const hits = extractVenueHitsFromGame(row);
    if (hits.length === 0) continue;

    const existing = hitsByVenue.get(row.venue_id) ?? [];
    hitsByVenue.set(row.venue_id, existing.concat(hits));

    const gameSet = gamesByVenue.get(row.venue_id) ?? new Set<number>();
    gameSet.add(row.game_pk);
    gamesByVenue.set(row.venue_id, gameSet);
  }

  const generatedAt = new Date().toISOString();

  if (venueIdFilter != null) {
    const park = ballparkIndex.parks[String(venueIdFilter)];
    if (!park) {
      throw new Error("Unknown venue");
    }

    const hits = hitsByVenue.get(venueIdFilter) ?? [];
    hits.sort((a, b) => {
      const dateCmp = a.gameDate.localeCompare(b.gameDate);
      if (dateCmp !== 0) return dateCmp;
      if (a.gamePk !== b.gamePk) return a.gamePk - b.gamePk;
      return a.atBatIndex - b.atBatIndex;
    });

    return {
      season,
      park,
      hits,
      stats: computeGameHitStats(hits),
      gameCount: gamesByVenue.get(venueIdFilter)?.size ?? 0,
      generatedAt,
    };
  }

  const parks: BallparkHitsSummary[] = Object.values(ballparkIndex.parks).map((park) => {
    const hits = hitsByVenue.get(park.venueId) ?? [];
    return {
      venueId: park.venueId,
      venueName: park.venueName,
      teamId: park.teamId,
      teamAbbrev: park.teamAbbrev,
      teamName: park.teamName,
      stadiumSlug: park.stadiumSlug,
      stats: computeGameHitStats(hits),
      gameCount: gamesByVenue.get(park.venueId)?.size ?? 0,
      previewHits: hits,
    };
  });

  parks.sort((a, b) => a.venueName.localeCompare(b.venueName));

  return { season, parks, generatedAt };
}
