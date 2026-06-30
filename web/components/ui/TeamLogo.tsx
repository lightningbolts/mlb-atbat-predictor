"use client";

import { useState } from "react";

import { mlbTeamLogoUrl } from "@/lib/mlb/teamAssets";
import { getTeamByAbbrev, getTeamById } from "@/lib/mlb/teams";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  teamId?: number | null;
  abbrev?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

export function TeamLogo({
  teamId,
  abbrev,
  size = 28,
  className,
  title,
}: TeamLogoProps) {
  const team =
    (teamId != null ? getTeamById(teamId) : undefined) ??
    (abbrev ? getTeamByAbbrev(abbrev) : undefined);
  const [failed, setFailed] = useState(false);

  if (!team || failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded bg-surface-elevated font-mono text-[10px] font-semibold text-muted",
          className,
        )}
        style={{ width: size, height: size }}
        title={title ?? team?.abbrev ?? abbrev ?? undefined}
        aria-hidden={!team && !abbrev}
      >
        {(team?.abbrev ?? abbrev ?? "?").slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={mlbTeamLogoUrl(team.id)}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      title={title ?? team.name}
      onError={() => setFailed(true)}
    />
  );
}
