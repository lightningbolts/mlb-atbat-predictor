import { parseStoredGameState } from "@/lib/games/gameState";
import {
  createEmptySeasonCounters,
  createEmptyTeamCounters,
  pushNotable,
} from "@/lib/mlb/nerdStats/counters";
import type { GameNerdSourceRow, SeasonNerdCounters } from "@/lib/mlb/nerdStats/types";
import type { GameBoxScore } from "@/types/mlb-boxscore";
import type { PlayByPlayEntry } from "@/types/mlb-live";

function teamCounters(
  counters: SeasonNerdCounters,
  teamId: number,
) {
  const key = String(teamId);
  if (!counters[key]) counters[key] = createEmptyTeamCounters();
  return counters[key]!;
}

function battingTeamId(play: PlayByPlayEntry, awayTeamId: number, homeTeamId: number): number {
  return play.halfInning === "bottom" ? homeTeamId : awayTeamId;
}

function runsScoredOnPlay(play: PlayByPlayEntry): { away: number; home: number } {
  const before = play.situationBefore;
  return {
    away: play.awayScore - before.awayScore,
    home: play.homeScore - before.homeScore,
  };
}

function isBloopSingle(play: PlayByPlayEntry): boolean {
  if (play.event !== "Single") return false;
  const hit = play.detail.hit;
  if (hit && hit.launchSpeed > 0) {
    return (
      hit.launchAngle >= 20 &&
      hit.launchSpeed < 88 &&
      (hit.totalDistance === 0 || hit.totalDistance < 220)
    );
  }
  return /bloops?|flares?|drops? in/i.test(`${play.event} ${play.description}`);
}

function isInfieldSingle(play: PlayByPlayEntry): boolean {
  if (play.event !== "Single") return false;
  const hit = play.detail.hit;
  if (hit && hit.totalDistance > 0 && hit.totalDistance < 150) return true;
  return /infield hit|bunt single/i.test(play.description);
}

function isWalkOff(play: PlayByPlayEntry, plays: PlayByPlayEntry[]): boolean {
  if (play.halfInning !== "bottom" || !play.isScoringPlay) return false;
  if (play.homeScore <= play.awayScore || play.inning < 9) return false;

  const playIndex = plays.findIndex((entry) => entry.atBatIndex === play.atBatIndex);
  if (playIndex === -1) return false;

  for (let i = playIndex + 1; i < plays.length; i += 1) {
    if (plays[i]!.isAtBat) return false;
  }
  return true;
}

function isTriplePlayOpportunity(play: PlayByPlayEntry): boolean {
  if (!play.isAtBat) return false;
  const before = play.situationBefore;
  if (before.outs !== 0) return false;
  const loaded = before.onFirst && before.onSecond;
  const basesLoaded = before.onFirst && before.onSecond && before.onThird;
  return loaded || basesLoaded;
}

function isStolenBase(play: PlayByPlayEntry): boolean {
  const text = `${play.event} ${play.description}`.toLowerCase();
  return /stolen base|\bsteals?\b/.test(text) && !/caught stealing/.test(text);
}

function isCaughtStealing(play: PlayByPlayEntry): boolean {
  return /caught stealing/i.test(`${play.event} ${play.description}`);
}

function isPickoff(play: PlayByPlayEntry): boolean {
  return /pick(?:s|ed)?\s*off/i.test(`${play.event} ${play.description}`);
}

function maxInningFromPlays(plays: PlayByPlayEntry[]): number {
  return plays.reduce((max, play) => Math.max(max, play.inning), 0);
}

function maxInningFromBoxScore(boxScore: GameBoxScore | null): number {
  const innings = boxScore?.lineScore?.innings;
  if (!innings?.length) return 0;
  return innings.reduce((max, inning) => Math.max(max, inning.num), 0);
}

function gameInningCount(plays: PlayByPlayEntry[], boxScore: GameBoxScore | null): number {
  return Math.max(maxInningFromPlays(plays), maxInningFromBoxScore(boxScore));
}

function isGidp(play: PlayByPlayEntry): boolean {
  return /grounded into dp/i.test(play.event);
}

function isTriplePlay(play: PlayByPlayEntry): boolean {
  return /triple play/i.test(`${play.event} ${play.description}`);
}

export function extractNerdCountersFromGame(row: GameNerdSourceRow): SeasonNerdCounters {
  const counters = createEmptySeasonCounters();
  const away = teamCounters(counters, row.away_team_id);
  const home = teamCounters(counters, row.home_team_id);

  const isFinal =
    row.away_score != null &&
    row.home_score != null &&
    row.feed_synced_at != null;

  if (!isFinal) return counters;

  away.gamesPlayed += 1;
  home.gamesPlayed += 1;

  const margin = Math.abs(row.away_score! - row.home_score!);
  if (margin === 1) {
    away.oneRunGames += 1;
    home.oneRunGames += 1;
  }

  if (row.away_score! < row.home_score! && row.home_score! - row.away_score! >= 5) {
    away.blowoutLosses += 1;
  } else if (row.home_score! < row.away_score! && row.away_score! - row.home_score! >= 5) {
    home.blowoutLosses += 1;
  }

  if (!row.feed_synced_at) return counters;

  away.finalGamesWithFeed += 1;
  home.finalGamesWithFeed += 1;

  const state = parseStoredGameState(row.game_state, row.game_pk);
  if (!state?.plays?.length) return counters;

  const plays = state.plays;
  const boxScore = row.box_score as GameBoxScore | null;
  const maxInning = gameInningCount(plays, boxScore);

  if (maxInning > 9) {
    away.extraInningGames += 1;
    home.extraInningGames += 1;
  }

  for (const play of plays) {
    const offenseId = battingTeamId(play, row.away_team_id, row.home_team_id);
    const offense = teamCounters(counters, offenseId);

    if (play.isAtBat) {
      offense.plateAppearances += 1;

      if (play.event === "Strikeout") offense.strikeouts += 1;
      if (play.event === "Walk" || play.event === "Intent Walk") offense.walks += 1;
      if (play.event === "Hit By Pitch") {
        offense.hbp += 1;
        pushNotable(offense, {
          statId: "hit-by-pitch",
          gamePk: row.game_pk,
          gameDate: row.game_date,
          label: `${play.batterName} plunked`,
          detail: play.description,
        });
      }
      if (play.event === "Sac Fly") offense.sacFlies += 1;
      if (isGidp(play)) {
        offense.gidp += 1;
        pushNotable(offense, {
          statId: "double-plays-hit-into",
          gamePk: row.game_pk,
          gameDate: row.game_date,
          label: `${play.batterName} GIDP`,
          detail: play.description,
        });
      }
      if (isTriplePlay(play)) {
        offense.triplePlays += 1;
        pushNotable(offense, {
          statId: "triple-plays-hit-into",
          gamePk: row.game_pk,
          gameDate: row.game_date,
          label: `${play.batterName} triple play`,
          detail: play.description,
        });
      }
      if (isTriplePlayOpportunity(play)) {
        offense.triplePlayOpportunities += 1;
      }

      if (isBloopSingle(play)) {
        offense.bloopSingles += 1;
        if (isWalkOff(play, plays)) {
          offense.walkoffBloopSingles += 1;
          pushNotable(offense, {
            statId: "walkoff-bloop-singles",
            gamePk: row.game_pk,
            gameDate: row.game_date,
            label: `${play.batterName} walk-off bloop`,
            detail: play.detail.hit
              ? `${play.detail.hit.launchSpeed.toFixed(0)} mph · ${play.detail.hit.launchAngle.toFixed(0)}°`
              : play.description,
            value: play.detail.hit?.launchSpeed,
          });
        }
      }

      if (isInfieldSingle(play)) {
        offense.infieldSingles += 1;
      }

      if (play.event === "Home Run") {
        const hit = play.detail.hit;
        if (hit && hit.launchSpeed > 0) {
          offense.homeRuns += 1;
          const ev = hit.launchSpeed;
          if (offense.softestHomeRunMph == null || ev < offense.softestHomeRunMph) {
            offense.softestHomeRunMph = ev;
            pushNotable(offense, {
              statId: "softest-home-run",
              gamePk: row.game_pk,
              gameDate: row.game_date,
              label: `${play.batterName} softest HR`,
              detail: `${ev.toFixed(1)} mph`,
              value: ev,
            });
          }
        }
      }
    }

    if (play.isScoringPlay) {
      const runs = runsScoredOnPlay(play);
      const runsForOffense = play.halfInning === "bottom" ? runs.home : runs.away;
      offense.runsScored += runsForOffense;

      if (play.situationBefore.outs === 2 && runsForOffense > 0) {
        offense.runsWithTwoOuts += runsForOffense;
      }

      if (play.inning >= 8 && runsForOffense > 0) {
        offense.lateInningRuns += runsForOffense;
      }
    }

    if (!play.isAtBat) {
      if (isStolenBase(play)) {
        offense.stolenBases += 1;
        pushNotable(offense, {
          statId: "games-between-steals",
          gamePk: row.game_pk,
          gameDate: row.game_date,
          label: "Stolen base",
          detail: play.description,
        });
      }
      if (isCaughtStealing(play)) {
        offense.caughtStealing += 1;
      }
      if (isPickoff(play)) {
        offense.pickoffs += 1;
        pushNotable(offense, {
          statId: "pickoffs-suffered",
          gamePk: row.game_pk,
          gameDate: row.game_date,
          label: "Pickoff",
          detail: play.description,
        });
      }
    }
  }

  return counters;
}
