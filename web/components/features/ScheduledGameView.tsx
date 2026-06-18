import Link from "next/link";

import { AppNav } from "@/components/features/AppNav";
import { formatGameDate, formatMatchup, gameStatusLabel } from "@/lib/games/format";
import { buildSeasonHistoryHref } from "@/lib/mlb/schedule";
import type { Game } from "@/types/database";

interface ScheduledGameViewProps {
  game: Game;
  historyBack?: {
    date?: string;
    view?: "date" | "team";
    teamId?: number | null;
  };
}

export function ScheduledGameView({ game, historyBack }: ScheduledGameViewProps) {
  const seasonHistoryHref = buildSeasonHistoryHref({
    date: historyBack?.date ?? game.game_date,
    view: historyBack?.view ?? "date",
    teamId: historyBack?.teamId,
  });
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppNav />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 text-center">
        <Link
          href={seasonHistoryHref}
          className="mb-8 text-xs text-muted transition-colors hover:text-secondary"
        >
          ← Season history
        </Link>
        <h1 className="text-lg font-medium text-foreground">{formatMatchup(game)}</h1>
        <p className="mt-2 text-sm text-secondary">
          {formatGameDate(game.game_date)}
          {game.venue_name ? ` · ${game.venue_name}` : ""}
        </p>
        <p className="mt-6 text-sm text-muted">
          This game has not started yet. Play-by-play replay will be available after it is played.
        </p>
        <p className="mt-2 text-xs text-subtle">{gameStatusLabel(game)}</p>
      </div>
    </div>
  );
}
