import { NextResponse } from "next/server";

import { fetchActiveGames } from "@/lib/mlb/schedule";

export const dynamic = "force-dynamic";

/** Client polling endpoint — refreshes the sidebar game list without a full reload. */
export async function GET() {
  try {
    const games = await fetchActiveGames();
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch MLB schedule";
    return NextResponse.json({ error: message, games: [] }, { status: 502 });
  }
}
