"use client";

import { useCallback, useEffect, useState } from "react";

import type { GameBoxScore } from "@/types/mlb-boxscore";

import { useChainedPoll } from "./useChainedPoll";

const LIVE_POLL_VISIBLE_MS = 100;
const LIVE_POLL_HIDDEN_MS = 1_000;

export interface UseGameBoxScoreOptions {
  poll?: boolean;
  /** Change to trigger an immediate box score fetch (e.g. dashboard tab switch). */
  pollBurstKey?: unknown;
}

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
  options?: UseGameBoxScoreOptions,
): UseGameBoxScoreResult {
  const [boxScore, setBoxScore] = useState<GameBoxScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"supabase" | "mlb" | null>(null);
  const [feedSyncedAt, setFeedSyncedAt] = useState<string | null>(null);

  const shouldPoll = options?.poll ?? false;
  const pollBurstKey = options?.pollBurstKey;

  const fetchBoxScore = useCallback(async () => {
    try {
      const query = shouldPoll ? "?live=1" : "";
      const response = await fetch(`/api/games/${gamePk}/boxscore${query}`, {
        cache: "no-store",
      });
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
  }, [gamePk, shouldPoll]);

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
  }, [gamePk, fetchBoxScore]);

  useEffect(() => {
    if (!shouldPoll || pollBurstKey === undefined) return;
    void fetchBoxScore();
  }, [shouldPoll, pollBurstKey, fetchBoxScore]);

  useChainedPoll(
    fetchBoxScore,
    LIVE_POLL_VISIBLE_MS,
    LIVE_POLL_HIDDEN_MS,
    shouldPoll && Boolean(gamePk),
    gamePk,
  );

  return {
    boxScore,
    isLoading,
    error,
    source,
    feedSyncedAt,
    refetch: fetchBoxScore,
  };
}
