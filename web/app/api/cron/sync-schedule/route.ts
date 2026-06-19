import { NextResponse } from "next/server";

import { syncScheduleDates } from "@/lib/games/scheduleSync";
import { addScheduleDays, getMLBScheduleDate } from "@/lib/mlb/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vercel cron — refresh recent MLB schedule metadata in Supabase. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = getMLBScheduleDate();
    const dates: string[] = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      dates.push(addScheduleDays(today, offset));
    }

    const { synced } = await syncScheduleDates(dates);
    return NextResponse.json({ ok: true, synced, dates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule sync failed";
    return NextResponse.json({ error: message, ok: false }, { status: 502 });
  }
}
