"use client";

import Link from "next/link";

import { TeamLogo } from "@/components/ui/TeamLogo";
import { useNerdStatsSummary } from "@/hooks/useNerdStats";

const CURRENT_SEASON = new Date().getFullYear();

export function StatOfTheDayBanner() {
  const { data, isLoading } = useNerdStatsSummary(CURRENT_SEASON);

  if (isLoading || !data?.stats.length) return null;

  const stat =
    data.stats.find((item) => item.id === data.statOfTheDayId) ?? data.stats[0]!;
  const leader = stat.leaders[0];
  if (!leader) return null;

  return (
    <Link
      href={`/nerd/${stat.id}`}
      className="mb-4 block rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-elevated"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
        Nerd stat of the day
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium text-foreground">{stat.title}</span>
        <span className="text-xs text-muted">·</span>
        <span className="flex items-center gap-1.5 text-sm text-foreground">
          <TeamLogo teamId={leader.teamId} size={18} />
          {leader.abbrev} leads ({leader.displayValue})
        </span>
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-muted">{stat.subtitle}</p>
    </Link>
  );
}
