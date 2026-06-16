"use client";

import { useEffect, useState } from "react";

import type { BatterRispStats } from "@/types/mlb-live";

export interface UseBatterRispResult {
  stats: BatterRispStats | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches season RISP hitting stats when enabled (runner on 2nd or 3rd).
 */
export function useBatterRisp(
  batterId: number | null | undefined,
  enabled: boolean,
): UseBatterRispResult {
  const [stats, setStats] = useState<BatterRispStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batterId || !enabled) {
      setStats(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/batter/risp?batterId=${batterId}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `RISP stats error ${response.status}`);
        }

        const data = (await response.json()) as { stats: BatterRispStats | null };
        if (!cancelled) {
          setStats(data.stats);
        }
      } catch (err) {
        if (!cancelled) {
          setStats(null);
          setError(err instanceof Error ? err.message : "Failed to fetch RISP stats");
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
  }, [batterId, enabled]);

  return { stats, isLoading, error };
}
