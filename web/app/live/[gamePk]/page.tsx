import { notFound } from "next/navigation";

import { LiveGameDashboard } from "@/components/features/LiveDashboard";
import { fetchSlateGames } from "@/lib/mlb/schedule";

export const dynamic = "force-dynamic";

interface LiveGamePageProps {
  params: Promise<{ gamePk: string }>;
}

export default async function LiveGamePage({ params }: LiveGamePageProps) {
  const { gamePk: gamePkParam } = await params;
  const gamePk = Number(gamePkParam);

  if (!Number.isFinite(gamePk)) {
    notFound();
  }

  let games = await fetchSlateGames();
  const game = games.find((entry) => entry.gamePk === gamePk);

  if (!game) {
    notFound();
  }

  return <LiveGameDashboard game={game} />;
}
