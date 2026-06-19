import { NextResponse } from "next/server";

import { loadGamesForDate, syncScheduleDates } from "@/lib/games/scheduleSync";

export const dynamic = "force-dynamic";

/** Season History game list — MLB schedule is source of truth for scores/status. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const games = await loadGamesForDate(date);

    // Keep Supabase in sync without blocking the response.
    void syncScheduleDates([date]).catch((error) => {
      console.warn("background schedule sync failed", error);
    });

    return NextResponse.json({ games, source: "mlb" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load games";
    return NextResponse.json({ error: message, games: [] }, { status: 502 });
  }
}
