"use client";

import { BaseDiamond } from "@/components/features/BaseDiamond";
import { cn } from "@/lib/utils";
import type { LiveGameState } from "@/types/mlb-live";
import { formatInningHalf } from "@/lib/utils";

interface ScorebugProps {
  gameState: LiveGameState | null;
  className?: string;
}

function InningArrow({ halfInning }: { halfInning: string }) {
  const isTop = halfInning.toLowerCase().startsWith("top");
  return (
    <span className="text-[11px] text-amber-400" aria-hidden>
      {isTop ? "▲" : "▼"}
    </span>
  );
}

/** Fox-style broadcast scorebug with score, inning, count, outs, bases, matchup. */
export function Scorebug({ gameState, className }: ScorebugProps) {
  if (!gameState) {
    return (
      <div className={cn("h-14 border-b border-neutral-800 bg-[#0a0a0a]", className)}>
        <div className="h-full animate-pulse bg-neutral-800/40" />
      </div>
    );
  }

  const {
    awayAbbrev,
    homeAbbrev,
    awayRuns,
    homeRuns,
    inning,
    inningHalf,
    balls,
    strikes,
    outs,
    batterName,
    pitcherName,
    onFirst,
    onSecond,
    onThird,
  } = gameState;

  const safeOuts = Math.min(3, Math.max(0, outs));

  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-stretch border-b border-neutral-800 bg-[#0a0a0a] text-white",
        className,
      )}
    >
      {/* Away */}
      <div className="flex min-w-[72px] flex-col items-center justify-center border-r border-neutral-800/80 px-3">
        <span className="text-[10px] font-semibold tracking-wide text-neutral-500">
          {awayAbbrev}
        </span>
        <span className="font-mono text-2xl font-bold leading-none tabular-nums">{awayRuns}</span>
      </div>

      {/* Home */}
      <div className="flex min-w-[72px] flex-col items-center justify-center border-r border-neutral-800/80 px-3">
        <span className="text-[10px] font-semibold tracking-wide text-neutral-500">
          {homeAbbrev}
        </span>
        <span className="font-mono text-2xl font-bold leading-none tabular-nums">{homeRuns}</span>
      </div>

      {/* Inning */}
      <div className="flex min-w-[56px] flex-col items-center justify-center border-r border-neutral-800/80 px-2">
        <span className="text-[10px] uppercase text-neutral-500">Inn</span>
        <div className="flex items-center gap-0.5 font-mono text-lg font-semibold tabular-nums">
          <span>{inning}</span>
          <InningArrow halfInning={inningHalf} />
        </div>
        <span className="text-[9px] text-neutral-600">{formatInningHalf(inningHalf)}</span>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 border-r border-neutral-800/80 px-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-semibold text-green-500">B</span>
          <span className="flex h-7 w-7 items-center justify-center rounded bg-green-600/20 font-mono text-lg font-bold tabular-nums text-green-400">
            {balls}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-semibold text-red-500">S</span>
          <span className="flex h-7 w-7 items-center justify-center rounded bg-red-600/20 font-mono text-lg font-bold tabular-nums text-red-400">
            {strikes}
          </span>
        </div>
      </div>

      {/* Outs */}
      <div
        className="flex flex-col items-center justify-center border-r border-neutral-800/80 px-3"
        aria-label={`${safeOuts} outs`}
      >
        <span className="mb-1 text-[9px] font-semibold text-neutral-500">OUT</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                i < safeOuts ? "bg-neutral-200" : "bg-neutral-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* Bases */}
      <div className="flex items-center border-r border-neutral-800/80 px-3">
        <BaseDiamond
          onFirst={onFirst}
          onSecond={onSecond}
          onThird={onThird}
          size="compact"
        />
      </div>

      {/* Matchup */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4">
        <span className="truncate text-[15px] font-medium text-white">{batterName}</span>
        <span className="truncate text-[12px] text-neutral-500">
          vs <span className="text-neutral-400">{pitcherName}</span>
        </span>
      </div>
    </div>
  );
}
