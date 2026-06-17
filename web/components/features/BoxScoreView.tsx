"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type {
  BatterBoxLine,
  BenchPlayerLine,
  BullpenPlayerLine,
  GameBoxScore,
  GameInfoItem,
  LineScore,
  PitcherBoxLine,
  PitchingTotals,
  TeamBoxScore,
} from "@/types/mlb-boxscore";

interface BoxScoreViewProps {
  boxScore: GameBoxScore | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  atBatPlayerId?: number | null;
  onDeckPlayerId?: number | null;
  offenseTeamId?: number | null;
}

function formatInningRuns(value: number | null, skipped = false): string {
  if (skipped) return "x";
  if (value == null) return "";
  return String(value);
}

function LineScoreTable({
  lineScore,
  awayAbbrev,
  homeAbbrev,
}: {
  lineScore: LineScore;
  awayAbbrev: string;
  homeAbbrev: string;
}) {
  const inningNums = lineScore.innings.map((inning) => inning.num);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-xs">
        <thead>
          <tr className="text-muted">
            <th className="px-2 py-1.5 text-left font-medium" />
            {inningNums.map((num) => (
              <th key={num} className="px-1.5 py-1.5 text-center font-medium tabular-nums">
                {num}
              </th>
            ))}
            <th className="px-2 py-1.5 text-center font-semibold text-foreground">R</th>
            <th className="px-2 py-1.5 text-center font-semibold text-foreground">H</th>
            <th className="px-2 py-1.5 text-center font-semibold text-foreground">E</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-2 py-1.5 font-semibold text-foreground">{awayAbbrev}</td>
            {lineScore.innings.map((inning) => (
              <td key={`away-${inning.num}`} className="px-1.5 py-1.5 text-center tabular-nums">
                {formatInningRuns(inning.awayRuns)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-semibold tabular-nums">
              {lineScore.away.runs}
            </td>
            <td className="px-2 py-1.5 text-center tabular-nums">{lineScore.away.hits}</td>
            <td className="px-2 py-1.5 text-center tabular-nums">{lineScore.away.errors}</td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-2 py-1.5 font-semibold text-foreground">{homeAbbrev}</td>
            {lineScore.innings.map((inning) => (
              <td key={`home-${inning.num}`} className="px-1.5 py-1.5 text-center tabular-nums">
                {formatInningRuns(inning.homeRuns, inning.homeSkipped)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-semibold tabular-nums">
              {lineScore.home.runs}
            </td>
            <td className="px-2 py-1.5 text-center tabular-nums">{lineScore.home.hits}</td>
            <td className="px-2 py-1.5 text-center tabular-nums">{lineScore.home.errors}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatTable({
  headers,
  rows,
  renderRow,
  totalsRow,
}: {
  headers: string[];
  rows: unknown[];
  renderRow: (row: unknown, index: number) => React.ReactNode;
  totalsRow?: React.ReactNode;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-muted">
            {headers.map((header) => (
              <th
                key={header}
                className={cn(
                  "px-2 py-1.5 font-medium",
                  header === "Player" ? "text-left" : "text-center",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => renderRow(row, index))}
          {totalsRow}
        </tbody>
      </table>
    </div>
  );
}

function BattersTable({
  batters,
  teamAbbrev,
  atBatPlayerId,
  onDeckPlayerId,
}: {
  batters: BatterBoxLine[];
  teamAbbrev: string;
  atBatPlayerId?: number | null;
  onDeckPlayerId?: number | null;
}) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Batters — {teamAbbrev}</h4>
      <StatTable
        headers={["Player", "AB", "R", "H", "RBI", "BB", "K", "AVG", "OPS"]}
        rows={batters}
        renderRow={(row) => {
          const batter = row as BatterBoxLine;
          const isAtBat = atBatPlayerId != null && batter.playerId === atBatPlayerId;
          const isOnDeck = onDeckPlayerId != null && batter.playerId === onDeckPlayerId;

          return (
            <tr
              key={batter.playerId}
              className={cn(
                "border-b border-border/60",
                isAtBat && "bg-amber-500/12 ring-1 ring-inset ring-amber-500/35",
                isOnDeck && !isAtBat && "bg-sky-500/10 ring-1 ring-inset ring-sky-500/30",
              )}
            >
              <td className="px-2 py-1.5 text-left">
                <span className="font-medium text-foreground">
                  {batter.note}
                  {batter.name}
                </span>
                {batter.positions ? (
                  <span className="ml-1 text-muted">({batter.positions})</span>
                ) : null}
                {isAtBat ? (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    AB
                  </span>
                ) : isOnDeck ? (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    OD
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.atBats}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.runs}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.hits}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.rbi}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.walks}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.strikeOuts}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.seasonAvg}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{batter.seasonOps}</td>
            </tr>
          );
        }}
      />
    </section>
  );
}

function PitchingTable({
  pitchers,
  totals,
  teamAbbrev,
}: {
  pitchers: PitcherBoxLine[];
  totals: PitchingTotals | null;
  teamAbbrev: string;
}) {
  if (pitchers.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Pitching — {teamAbbrev}</h4>
      <StatTable
        headers={["Player", "IP", "H", "R", "ER", "BB", "K", "HR", "ERA"]}
        rows={pitchers}
        renderRow={(row) => {
          const pitcher = row as PitcherBoxLine;
          return (
            <tr key={pitcher.playerId} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-left">
                <span className="font-medium text-foreground">
                  {pitcher.note}
                  {pitcher.name}
                </span>
              </td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.inningsPitched}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.hits}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.runs}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.earnedRuns}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.walks}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.strikeOuts}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.homeRuns}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{pitcher.seasonEra}</td>
            </tr>
          );
        }}
        totalsRow={
          totals ? (
            <tr className="border-t border-border font-semibold text-foreground">
              <td className="px-2 py-1.5">Totals</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.inningsPitched}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.hits}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.runs}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.earnedRuns}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.walks}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.strikeOuts}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{totals.homeRuns}</td>
              <td />
            </tr>
          ) : undefined
        }
      />
    </section>
  );
}

function BenchTable({ bench, teamAbbrev }: { bench: BenchPlayerLine[]; teamAbbrev: string }) {
  if (bench.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Bench — {teamAbbrev}</h4>
      <StatTable
        headers={["Player", "B", "POS", "AVG", "G", "R", "H", "HR", "RBI"]}
        rows={bench}
        renderRow={(row) => {
          const player = row as BenchPlayerLine;
          return (
            <tr key={player.playerId} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-left font-medium text-foreground">{player.name}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.batSide}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.position}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.avg}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.games}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.runs}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.hits}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.homeRuns}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.rbi}</td>
            </tr>
          );
        }}
      />
    </section>
  );
}

function BullpenTable({ bullpen, teamAbbrev }: { bullpen: BullpenPlayerLine[]; teamAbbrev: string }) {
  if (bullpen.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Bullpen — {teamAbbrev}</h4>
      <StatTable
        headers={["Player", "T", "ERA", "IP", "H", "BB", "K"]}
        rows={bullpen}
        renderRow={(row) => {
          const player = row as BullpenPlayerLine;
          return (
            <tr key={player.playerId} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-left font-medium text-foreground">{player.name}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.throwHand}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.era}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.inningsPitched}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.hits}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.walks}</td>
              <td className="px-2 py-1.5 text-center tabular-nums">{player.strikeOuts}</td>
            </tr>
          );
        }}
      />
    </section>
  );
}

function GameInfoSection({ info }: { info: GameInfoItem[] }) {
  if (info.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-foreground">Game info</h4>
      <dl className="space-y-1 text-xs">
        {info.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex gap-2">
            <dt className="shrink-0 font-semibold text-foreground">{item.label}</dt>
            <dd className="text-secondary">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TeamBoxScoreSections({
  team,
  atBatPlayerId,
  onDeckPlayerId,
  highlightBatters,
}: {
  team: TeamBoxScore;
  atBatPlayerId?: number | null;
  onDeckPlayerId?: number | null;
  highlightBatters: boolean;
}) {
  return (
    <div className="space-y-6">
      <BattersTable
        batters={team.batters}
        teamAbbrev={team.abbrev}
        atBatPlayerId={highlightBatters ? atBatPlayerId : null}
        onDeckPlayerId={highlightBatters ? onDeckPlayerId : null}
      />
      <PitchingTable
        pitchers={team.pitchers}
        totals={team.pitchingTotals}
        teamAbbrev={team.abbrev}
      />
      <BenchTable bench={team.bench} teamAbbrev={team.abbrev} />
      <BullpenTable bullpen={team.bullpen} teamAbbrev={team.abbrev} />
    </div>
  );
}

export function BoxScoreView({
  boxScore,
  isLoading,
  error,
  className,
  atBatPlayerId,
  onDeckPlayerId,
  offenseTeamId,
}: BoxScoreViewProps) {
  const [selectedSide, setSelectedSide] = useState<"away" | "home">("away");

  useEffect(() => {
    if (offenseTeamId == null || !boxScore) return;
    if (offenseTeamId === boxScore.home.teamId) {
      setSelectedSide("home");
    } else if (offenseTeamId === boxScore.away.teamId) {
      setSelectedSide("away");
    }
  }, [offenseTeamId, boxScore]);

  if (isLoading && !boxScore) {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-sm text-red-300", className)}>
        {error}
      </div>
    );
  }

  if (!boxScore) {
    return (
      <div className={cn("p-4 text-sm text-muted", className)}>
        Box score not available for this game.
      </div>
    );
  }

  const selectedTeam = selectedSide === "away" ? boxScore.away : boxScore.home;
  const awayLabel = boxScore.away.name;
  const homeLabel = boxScore.home.name;
  const highlightAway =
    offenseTeamId != null ? offenseTeamId === boxScore.away.teamId : false;
  const highlightHome =
    offenseTeamId != null ? offenseTeamId === boxScore.home.teamId : false;
  const showHighlights =
    (selectedSide === "away" && highlightAway) || (selectedSide === "home" && highlightHome);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
        <LineScoreTable
          lineScore={boxScore.lineScore}
          awayAbbrev={boxScore.awayAbbrev}
          homeAbbrev={boxScore.homeAbbrev}
        />
      </div>

      <div className="shrink-0 border-b border-border px-4">
        <div className="flex gap-4">
          {(["away", "home"] as const).map((side) => {
            const label = side === "away" ? awayLabel : homeLabel;
            const isActive = selectedSide === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => setSelectedSide(side)}
                className={cn(
                  "border-b-2 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-secondary",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <TeamBoxScoreSections
            team={selectedTeam}
            atBatPlayerId={showHighlights ? atBatPlayerId : null}
            onDeckPlayerId={showHighlights ? onDeckPlayerId : null}
            highlightBatters={showHighlights}
          />
          <GameInfoSection info={boxScore.info} />
        </div>
      </div>
    </div>
  );
}
