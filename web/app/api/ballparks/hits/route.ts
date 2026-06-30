import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { aggregateBallparkHits } from "@/lib/mlb/ballparkHits";
import { getSeasonStartDate } from "@/lib/games/format";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GAME_HITS_COLUMNS =
  "game_pk,game_date,venue_id,away_team_abbrev,home_team_abbrev,game_state" as const;

async function loadSeasonGameRows(season: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const seasonEnd = `${season}-12-31`;

  const { data, error } = await supabase
    .from("games")
    .select(GAME_HITS_COLUMNS)
    .eq("season", season)
    .gte("game_date", getSeasonStartDate(`${season}-06-30`))
    .lte("game_date", seasonEnd)
    .not("game_state", "is", null)
    .not("venue_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function getCachedSeasonRows(season: number) {
  return unstable_cache(
    () => loadSeasonGameRows(season),
    [`ballpark-hits-season-${season}`],
    { revalidate: 300 },
  )();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get("season");
  const venueIdParam = searchParams.get("venueId");
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : new Date().getFullYear();
  const venueId = venueIdParam ? Number.parseInt(venueIdParam, 10) : undefined;

  if (!Number.isFinite(season) || season < 2000) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }

  if (venueIdParam != null && (!Number.isFinite(venueId) || venueId! <= 0)) {
    return NextResponse.json({ error: "Invalid venueId" }, { status: 400 });
  }

  try {
    const rows = await getCachedSeasonRows(season);
    const result = aggregateBallparkHits(season, rows, venueId);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ballpark hits";
    const status = message === "Unknown venue" ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
