"use client";

import { useCallback, useEffect, useState } from "react";

import type { GameBoxScore } from "@/types/mlb-boxscore";

const LIVE_POLL_MS = 3_000;

export interface UseGameBoxScoreResult {
  boxScore: GameBoxScore | null;
  isLoading: boolean;
  error: string | null;
  source: "supabase" | "mlb" | null;
  feedSyncedAt: string | null;
  refetch: () => Promise<void>;
}

export function useGameBoxScore(
  gamePk: number,
  options?: { poll?: boolean },
): UseGameBoxScoreResult {
  const [boxScore, setBoxScore] = useState<GameBoxScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"supabase" | "mlb" | null>(null);
  const [feedSyncedAt, setFeedSyncedAt] = useState<string | null>(null);

  const shouldPoll = options?.poll ?? false;

  const fetchBoxScore = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gamePk}/boxscore`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `Box score error ${response.status}`);
      }

      const data = (await response.json()) as {
        boxScore: GameBoxScore;
        source: "supabase" | "mlb";
        feedSyncedAt: string | null;
      };

      setBoxScore(data.boxScore);
      setSource(data.source);
      setFeedSyncedAt(data.feedSyncedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch box score");
    } finally {
      setIsLoading(false);
    }
  }, [gamePk]);

  useEffect(() => {
    if (!gamePk) {
      setIsLoading(false);
      return;
    }

    setBoxScore(null);
    setIsLoading(true);
    setError(null);
    setSource(null);
    setFeedSyncedAt(null);

    void fetchBoxScore();

    if (!shouldPoll) return;

    const pollId = window.setInterval(() => {
      void fetchBoxScore();
    }, LIVE_POLL_MS);

    return () => window.clearInterval(pollId);
  }, [gamePk, fetchBoxScore, shouldPoll]);

  return {
    boxScore,
    isLoading,
    error,
    source,
    feedSyncedAt,
    refetch: fetchBoxScore,
  };
}
