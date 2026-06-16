"use client";

import { useEffect, useState } from "react";

import type { BatterVsPitcherRecord } from "@/types/mlb-live";

export interface UseBatterVsPitcherResult {
  record: BatterVsPitcherRecord | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches lifetime batter-vs-pitcher stats when the matchup changes.
 * Stats are cached per batter/pitcher pair for the life of the component.
 */
export function useBatterVsPitcher(
  batterId: number | null | undefined,
  pitcherId: number | null | undefined,
): UseBatterVsPitcherResult {
  const [record, setRecord] = useState<BatterVsPitcherRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batterId || !pitcherId) {
      setRecord(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/matchup?batterId=${batterId}&pitcherId=${pitcherId}`,
        );
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Matchup stats error ${response.status}`);
        }

        const data = (await response.json()) as { record: BatterVsPitcherRecord | null };
        if (!cancelled) {
          setRecord(data.record);
        }
      } catch (err) {
        if (!cancelled) {
          setRecord(null);
          setError(err instanceof Error ? err.message : "Failed to fetch matchup stats");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batterId, pitcherId]);

  return { record, isLoading, error };
}
