"use client";

import {
  HittingLineSummary,
  HittingStatPills,
  StatBlockSkeleton,
} from "@/components/features/HittingStatPills";
import { cn } from "@/lib/utils";
import type { BatterRispStats } from "@/types/mlb-live";

interface BatterRispRecordProps {
  batterName: string;
  stats: BatterRispStats | null;
  isLoading: boolean;
  className?: string;
}

export function BatterRispRecord({
  batterName,
  stats,
  isLoading,
  className,
}: BatterRispRecordProps) {
  const batterLast = batterName.split(" ").pop() ?? batterName;

  if (isLoading) {
    return <StatBlockSkeleton className={className} />;
  }

  if (!stats) {
    return (
      <div
        className={cn(
          "mb-3 rounded border border-border/60 bg-overlay px-3 py-2",
          className,
        )}
      >
        <p className="text-xs text-muted">No RISP data for {batterLast} this season</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          {stats.season} RISP
        </span>
        <HittingLineSummary line={stats} className="text-amber-900/80 dark:text-subtle" />
      </div>
      <HittingStatPills line={stats} />
    </div>
  );
}
