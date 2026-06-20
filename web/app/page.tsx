import { fetchSlateGames } from "@/lib/mlb/schedule";
import { LiveGameSlate } from "@/components/features/LiveGameSlate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof fetchSlateGames>> = [];
  let scheduleError: string | null = null;

  try {
    games = await fetchSlateGames();
  } catch (error) {
    scheduleError = error instanceof Error ? error.message : "Failed to load MLB schedule";
  }

  return <LiveGameSlate initialGames={games} scheduleError={scheduleError} />;
}
