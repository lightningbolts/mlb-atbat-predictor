import type { NotableNerdEvent, SeasonNerdCounters, TeamNerdCounters } from "@/lib/mlb/nerdStats/types";
import { MLB_TEAMS } from "@/lib/mlb/teams";

export function createEmptyTeamCounters(): TeamNerdCounters {
  return {
    gamesPlayed: 0,
    finalGamesWithFeed: 0,
    oneRunGames: 0,
    extraInningGames: 0,
    blowoutLosses: 0,
    runsScored: 0,
    runsWithTwoOuts: 0,
    plateAppearances: 0,
    strikeouts: 0,
    walks: 0,
    gidp: 0,
    triplePlays: 0,
    triplePlayOpportunities: 0,
    hbp: 0,
    sacFlies: 0,
    stolenBases: 0,
    caughtStealing: 0,
    pickoffs: 0,
    walkoffBloopSingles: 0,
    bloopSingles: 0,
    infieldSingles: 0,
    lateInningRuns: 0,
    homeRuns: 0,
    softestHomeRunMph: null,
    notableEvents: [],
  };
}

export function createEmptySeasonCounters(): SeasonNerdCounters {
  const counters: SeasonNerdCounters = {};
  for (const team of MLB_TEAMS) {
    counters[String(team.id)] = createEmptyTeamCounters();
  }
  return counters;
}

export function mergeTeamCounters(target: TeamNerdCounters, source: TeamNerdCounters): void {
  target.gamesPlayed += source.gamesPlayed;
  target.finalGamesWithFeed += source.finalGamesWithFeed;
  target.oneRunGames += source.oneRunGames;
  target.extraInningGames += source.extraInningGames;
  target.blowoutLosses += source.blowoutLosses;
  target.runsScored += source.runsScored;
  target.runsWithTwoOuts += source.runsWithTwoOuts;
  target.plateAppearances += source.plateAppearances;
  target.strikeouts += source.strikeouts;
  target.walks += source.walks;
  target.gidp += source.gidp;
  target.triplePlays += source.triplePlays;
  target.triplePlayOpportunities += source.triplePlayOpportunities;
  target.hbp += source.hbp;
  target.sacFlies += source.sacFlies;
  target.stolenBases += source.stolenBases;
  target.caughtStealing += source.caughtStealing;
  target.pickoffs += source.pickoffs;
  target.walkoffBloopSingles += source.walkoffBloopSingles;
  target.bloopSingles += source.bloopSingles;
  target.infieldSingles += source.infieldSingles;
  target.lateInningRuns += source.lateInningRuns;
  target.homeRuns += source.homeRuns;

  if (source.softestHomeRunMph != null) {
    target.softestHomeRunMph =
      target.softestHomeRunMph == null
        ? source.softestHomeRunMph
        : Math.min(target.softestHomeRunMph, source.softestHomeRunMph);
  }

  if (source.notableEvents.length > 0) {
    target.notableEvents.push(...source.notableEvents);
  }
}

export function mergeSeasonCounters(
  target: SeasonNerdCounters,
  source: SeasonNerdCounters,
): void {
  for (const [teamId, teamSource] of Object.entries(source)) {
    const teamTarget = target[teamId] ?? createEmptyTeamCounters();
    mergeTeamCounters(teamTarget, teamSource);
    target[teamId] = teamTarget;
  }
}

export function pushNotable(
  counters: TeamNerdCounters,
  event: NotableNerdEvent,
  maxPerStat = 25,
): void {
  const sameStat = counters.notableEvents.filter((item) => item.statId === event.statId).length;
  if (sameStat >= maxPerStat) return;
  counters.notableEvents.push(event);
}
