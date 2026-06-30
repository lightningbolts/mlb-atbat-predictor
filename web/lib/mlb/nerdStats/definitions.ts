import {
  formatCount,
  formatGamesBetween,
  formatMph,
  formatPercent,
  formatRatePer1000,
  pct,
  ratePer1000,
} from "@/lib/mlb/nerdStats/format";
import type {
  NerdStatCategory,
  NerdStatLeader,
  NerdStatLeaderboard,
  NotableNerdEvent,
  SeasonNerdCounters,
  TeamNerdCounters,
} from "@/lib/mlb/nerdStats/types";
import { getTeamById, MLB_TEAMS } from "@/lib/mlb/teams";

export interface NerdStatDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: NerdStatCategory;
  sort: "asc" | "desc";
  unit: string;
  minGames?: number;
  compute: (counters: TeamNerdCounters) => number | null;
  formatValue: (value: number) => string;
}

export const NERD_STAT_DEFINITIONS: NerdStatDefinition[] = [
  {
    id: "walkoff-bloop-singles",
    title: "Walk-off Bloop Factory",
    subtitle: "Most game-ending bloop singles. Higher = more chaos.",
    category: "drama",
    sort: "desc",
    unit: "walk-offs",
    compute: (c) => c.walkoffBloopSingles,
    formatValue: formatCount,
  },
  {
    id: "runs-with-two-outs-pct",
    title: "Two-Out Run Merchants",
    subtitle: "Highest share of runs scored with two outs.",
    category: "drama",
    sort: "desc",
    unit: "%",
    minGames: 20,
    compute: (c) => pct(c.runsWithTwoOuts, c.runsScored),
    formatValue: (v) => formatPercent(v),
  },
  {
    id: "double-plays-hit-into",
    title: "GIDP Factory",
    subtitle: "Most double plays hit into.",
    category: "misfortune",
    sort: "desc",
    unit: "GIDP",
    compute: (c) => c.gidp,
    formatValue: formatCount,
  },
  {
    id: "triple-plays-hit-into",
    title: "Triple Play Magnet",
    subtitle: "Most triple plays hit into. Yes, it can be zero.",
    category: "misfortune",
    sort: "desc",
    unit: "TP",
    compute: (c) => c.triplePlays,
    formatValue: formatCount,
  },
  {
    id: "triple-play-rate",
    title: "Triple Play Likelihood",
    subtitle: "Triple plays per 1,000 golden opportunities.",
    category: "misfortune",
    sort: "desc",
    unit: "per 1k",
    minGames: 20,
    compute: (c) => ratePer1000(c.triplePlays, c.triplePlayOpportunities),
    formatValue: (v) => formatRatePer1000(v),
  },
  {
    id: "games-between-steals",
    title: "Steal Drought",
    subtitle: "Average games between successful steals. Higher = station-to-station ball.",
    category: "baserunning",
    sort: "desc",
    unit: "games",
    minGames: 20,
    compute: (c) => (c.stolenBases > 0 ? c.finalGamesWithFeed / c.stolenBases : null),
    formatValue: formatGamesBetween,
  },
  {
    id: "softest-home-run",
    title: "Softest Dinger",
    subtitle: "Lowest exit velocity on a home run. Lower = more suspicious.",
    category: "contact",
    sort: "asc",
    unit: "mph",
    compute: (c) => c.softestHomeRunMph,
    formatValue: formatMph,
  },
  {
    id: "one-run-games",
    title: "One-Run Nailbiters",
    subtitle: "Games decided by a single run.",
    category: "drama",
    sort: "desc",
    unit: "games",
    compute: (c) => c.oneRunGames,
    formatValue: formatCount,
  },
  {
    id: "hit-by-pitch",
    title: "Plunked Patrol",
    subtitle: "Most hit-by-pitches absorbed.",
    category: "misfortune",
    sort: "desc",
    unit: "HBP",
    compute: (c) => c.hbp,
    formatValue: formatCount,
  },
  {
    id: "bloop-singles",
    title: "Bloop Single Artists",
    subtitle: "Flares, bloops, and cheapies that fell.",
    category: "contact",
    sort: "desc",
    unit: "bloops",
    compute: (c) => c.bloopSingles,
    formatValue: formatCount,
  },
  {
    id: "infield-singles",
    title: "Infield Chaos",
    subtitle: "Leg hits, choppers, and seeing-eye grounders.",
    category: "contact",
    sort: "desc",
    unit: "hits",
    compute: (c) => c.infieldSingles,
    formatValue: formatCount,
  },
  {
    id: "blowout-losses",
    title: "Blowout Loss Collector",
    subtitle: "Losses by five runs or more.",
    category: "misfortune",
    sort: "desc",
    unit: "losses",
    compute: (c) => c.blowoutLosses,
    formatValue: formatCount,
  },
  {
    id: "extra-inning-games",
    title: "Bonus Baseball Enjoyers",
    subtitle: "Games that went to extras.",
    category: "drama",
    sort: "desc",
    unit: "games",
    compute: (c) => c.extraInningGames,
    formatValue: formatCount,
  },
  {
    id: "late-inning-runs",
    title: "Late-Inning Panic",
    subtitle: "Runs scored from the 8th inning on.",
    category: "chaos",
    sort: "desc",
    unit: "runs",
    compute: (c) => c.lateInningRuns,
    formatValue: formatCount,
  },
  {
    id: "pickoffs-suffered",
    title: "Pickoff Punching Bag",
    subtitle: "Runners picked off.",
    category: "baserunning",
    sort: "desc",
    unit: "pickoffs",
    compute: (c) => c.pickoffs,
    formatValue: formatCount,
  },
  {
    id: "strikeout-rate",
    title: "True Outcome Enjoyers",
    subtitle: "Strikeout rate on plate appearances.",
    category: "chaos",
    sort: "desc",
    unit: "%",
    minGames: 20,
    compute: (c) => pct(c.strikeouts, c.plateAppearances),
    formatValue: (v) => formatPercent(v),
  },
  {
    id: "walk-rate",
    title: "Free Pass Fan Club",
    subtitle: "Walk rate on plate appearances.",
    category: "chaos",
    sort: "desc",
    unit: "%",
    minGames: 20,
    compute: (c) => pct(c.walks, c.plateAppearances),
    formatValue: (v) => formatPercent(v),
  },
];

export function getNerdStatDefinition(statId: string): NerdStatDefinition | undefined {
  return NERD_STAT_DEFINITIONS.find((stat) => stat.id === statId);
}

function meetsMinimum(definition: NerdStatDefinition, counters: TeamNerdCounters): boolean {
  if (definition.minGames == null) return true;
  return counters.finalGamesWithFeed >= definition.minGames;
}

function computeLeagueAverage(
  definition: NerdStatDefinition,
  season: SeasonNerdCounters,
): number | null {
  const values: number[] = [];
  for (const team of MLB_TEAMS) {
    const counters = season[String(team.id)];
    if (!counters || !meetsMinimum(definition, counters)) continue;
    const value = definition.compute(counters);
    if (value != null && Number.isFinite(value)) values.push(value);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildLeader(
  teamId: number,
  rank: number,
  value: number,
  definition: NerdStatDefinition,
): NerdStatLeader {
  const team = getTeamById(teamId);
  return {
    teamId,
    abbrev: team?.abbrev ?? "???",
    teamName: team?.name ?? "Unknown",
    value,
    rank,
    displayValue: definition.formatValue(value),
  };
}

export function buildStatLeaderboard(
  definition: NerdStatDefinition,
  season: SeasonNerdCounters,
  leaderCount = 5,
): NerdStatLeaderboard {
  const entries: NerdStatLeader[] = [];

  for (const team of MLB_TEAMS) {
    const counters = season[String(team.id)];
    if (!counters || !meetsMinimum(definition, counters)) continue;
    const value = definition.compute(counters);
    if (value == null || !Number.isFinite(value)) continue;
    entries.push(buildLeader(team.id, 0, value, definition));
  }

  entries.sort((a, b) =>
    definition.sort === "desc" ? b.value - a.value : a.value - b.value,
  );

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const leagueAverage = computeLeagueAverage(definition, season);

  return {
    id: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    category: definition.category,
    sort: definition.sort,
    unit: definition.unit,
    leagueAverage,
    leagueAverageDisplay:
      leagueAverage != null ? definition.formatValue(leagueAverage) : null,
    leaders: entries.slice(0, leaderCount),
  };
}

export function buildFullStatLeaderboard(
  definition: NerdStatDefinition,
  season: SeasonNerdCounters,
): NerdStatLeaderboard {
  return buildStatLeaderboard(definition, season, 30);
}

export function collectNotableEventsForStat(
  season: SeasonNerdCounters,
  statId: string,
): NotableNerdEvent[] {
  const events: NotableNerdEvent[] = [];
  for (const team of MLB_TEAMS) {
    const counters = season[String(team.id)];
    if (!counters) continue;
    events.push(...counters.notableEvents.filter((event) => event.statId === statId));
  }

  events.sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  return events.slice(0, 50);
}

export function pickStatOfTheDay(season: number, stats: NerdStatLeaderboard[]): string {
  if (stats.length === 0) return NERD_STAT_DEFINITIONS[0]!.id;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(`${season}-03-01T12:00:00Z`).getTime()) / 86_400_000,
  );
  const index = Math.abs(dayOfYear) % stats.length;
  return stats[index]!.id;
}
