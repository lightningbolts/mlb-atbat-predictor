"use client";

import type { GameBoxScore } from "@/types/mlb-boxscore";

interface CompactLineScoreProps {
  boxScore: GameBoxScore;
  className?: string;
}

function formatInningRuns(value: number | null, skipped = false): string {
  if (skipped) return "x";
  if (value == null) return "";
  return String(value);
}

/** Minimal inning-by-inning line score for card hover overlays. */
export function CompactLineScore({ boxScore, className }: CompactLineScoreProps) {
  const { lineScore, awayAbbrev, homeAbbrev } = boxScore;
  const inningNums = lineScore.innings.map((inning) => inning.num);

  return (
    <div className={className}>
      <table className="w-full min-w-[280px] border-collapse text-[11px]">
        <thead>
          <tr className="text-muted">
            <th className="px-1.5 py-1 text-left font-medium" />
            {inningNums.map((num) => (
              <th key={num} className="px-1 py-1 text-center font-medium tabular-nums">
                {num}
              </th>
            ))}
            <th className="px-1.5 py-1 text-center font-semibold text-foreground">R</th>
            <th className="px-1.5 py-1 text-center font-semibold text-foreground">H</th>
            <th className="px-1.5 py-1 text-center font-semibold text-foreground">E</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border/60">
            <td className="px-1.5 py-1 font-semibold text-foreground">{awayAbbrev}</td>
            {lineScore.innings.map((inning) => (
              <td key={`away-${inning.num}`} className="px-1 py-1 text-center tabular-nums">
                {formatInningRuns(inning.awayRuns)}
              </td>
            ))}
            <td className="px-1.5 py-1 text-center font-semibold tabular-nums">
              {lineScore.away.runs}
            </td>
            <td className="px-1.5 py-1 text-center tabular-nums">{lineScore.away.hits}</td>
            <td className="px-1.5 py-1 text-center tabular-nums">{lineScore.away.errors}</td>
          </tr>
          <tr className="border-t border-border/60">
            <td className="px-1.5 py-1 font-semibold text-foreground">{homeAbbrev}</td>
            {lineScore.innings.map((inning) => (
              <td key={`home-${inning.num}`} className="px-1 py-1 text-center tabular-nums">
                {formatInningRuns(inning.homeRuns, inning.homeSkipped)}
              </td>
            ))}
            <td className="px-1.5 py-1 text-center font-semibold tabular-nums">
              {lineScore.home.runs}
            </td>
            <td className="px-1.5 py-1 text-center tabular-nums">{lineScore.home.hits}</td>
            <td className="px-1.5 py-1 text-center tabular-nums">{lineScore.home.errors}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
