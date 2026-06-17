"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchClientLiveGameState, liveStateFingerprint } from "@/lib/mlb/liveFeed";
import type { LiveGameState } from "@/types/mlb-live";

import { useChainedPoll } from "./useChainedPoll";

/** Minimum gap between live feed polls — chained so slow responses don't stack. */
const LIVE_FEED_MIN_GAP_MS = 300;

export interface UseLiveGameStateResult {
  gameState: LiveGameState | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Polls the MLB live feed directly from the browser for low-latency pitch updates.
 * Box score is loaded separately via useGameBoxScore.
 */
export function useLiveGameState(gamePk: number): UseLiveGameStateResult {
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchState = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const next = await fetchClientLiveGameState(gamePk, controller.signal);
      if (controller.signal.aborted) return;

      setGameState((prev) => {
        if (prev && liveStateFingerprint(prev) === liveStateFingerprint(next)) {
          return prev;
        }
        return next;
      });
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to fetch live game state");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
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

    return () => {
      abortRef.current?.abort();
    };
  }, [gamePk]);

  useChainedPoll(fetchState, LIVE_FEED_MIN_GAP_MS, Boolean(gamePk), gamePk);

  return { gameState, isLoading, error };
}
