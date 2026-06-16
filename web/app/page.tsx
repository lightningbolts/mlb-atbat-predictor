import { fetchActiveGames } from "@/lib/mlb/schedule";
import { LiveDashboard } from "@/components/features/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof fetchActiveGames>> = [];
  let scheduleError: string | null = null;

  try {
    games = await fetchActiveGames();
  } catch (error) {
    scheduleError = error instanceof Error ? error.message : "Failed to load MLB schedule";
  }

  return <LiveDashboard initialGames={games} scheduleError={scheduleError} />;
}
