"use client";

import { useCallback, useEffect, useState } from "react";

import type { LiveGameState } from "@/types/mlb-live";

const LIVE_FEED_POLL_MS = 3_000;

export interface UseLiveGameStateResult {
  gameState: LiveGameState | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Polls the MLB live feed every 3s for real-time count, matchup, and bases.
 * This runs independently of Supabase so the dashboard is never stuck waiting
 * on ingestor predictions.
 */
export function useLiveGameState(gamePk: number): UseLiveGameStateResult {
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/${gamePk}/live`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `Live feed error ${response.status}`);
      }

      const data = (await response.json()) as { state: LiveGameState };
      setGameState(data.state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch live game state");
    } finally {
      setIsLoading(false);
    }
  }, [gamePk]);

  useEffect(() => {
    if (!gamePk) {
      setIsLoading(false);
      return;
    }

    setGameState(null);
    setIsLoading(true);
    setError(null);

    void fetchState();
    const pollId = window.setInterval(() => {
      void fetchState();
    }, LIVE_FEED_POLL_MS);

    return () => window.clearInterval(pollId);
  }, [gamePk, fetchState]);

  return { gameState, isLoading, error };
}
