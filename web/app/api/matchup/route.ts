import { NextResponse } from "next/server";

import { fetchBatterVsPitcherRecord } from "@/lib/mlb/matchupStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batterId = Number(searchParams.get("batterId"));
  const pitcherId = Number(searchParams.get("pitcherId"));

  if (!Number.isFinite(batterId) || batterId <= 0) {
    return NextResponse.json({ error: "Invalid batter ID" }, { status: 400 });
  }
  if (!Number.isFinite(pitcherId) || pitcherId <= 0) {
    return NextResponse.json({ error: "Invalid pitcher ID" }, { status: 400 });
  }

  try {
    const record = await fetchBatterVsPitcherRecord(batterId, pitcherId);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch matchup stats";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
