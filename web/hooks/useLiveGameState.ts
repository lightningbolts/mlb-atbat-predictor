"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createPlayByPlayParseState,
  fetchMLBLiveFeed,
  liveStateFingerprint,
  parseLiveFeedSnapshot,
  playByPlayNeedsResync,
  rebuildPlayByPlayFromFeed,
  syncPlayByPlayFromFeed,
  type PlayByPlayParseState,
} from "@/lib/mlb/liveFeed";
import type { AllPlayRaw, LiveGameState, PlayPitch } from "@/types/mlb-live";

import { useRapidPoll } from "./useRapidPoll";

/** Overlap direct MLB polls so pitch latency is not gated by the previous round-trip. */
const LIVE_FEED_POLL_INTERVAL_MS = 250;
const LIVE_FEED_MAX_IN_FLIGHT = 3;

export interface UseLiveGameStateOptions {
  /** When false, skips polling (e.g. archived replay view). */
  enabled?: boolean;
  /** Change to trigger an immediate MLB feed fetch (e.g. dashboard tab switch). */
  pollBurstKey?: unknown;
}

export interface UseLiveGameStateResult {
  gameState: LiveGameState | null;
  isLoading: boolean;
  error: string | null;
  refreshNow: () => Promise<void>;
}

function pitchEqual(a: PlayPitch, b: PlayPitch): boolean {
  return (
    a.pitchNumber === b.pitchNumber &&
    a.callCode === b.callCode &&
    a.callDescription === b.callDescription &&
    a.balls === b.balls &&
    a.strikes === b.strikes &&
    a.startSpeed === b.startSpeed &&
    a.plateX === b.plateX &&
    a.plateZ === b.plateZ &&
    a.isInPlay === b.isInPlay &&
    a.isOut === b.isOut
  );
}

function mergeAtBatPitches(prev: PlayPitch[], next: PlayPitch[]): PlayPitch[] {
  if (prev.length === next.length) {
    let same = true;
    for (let i = 0; i < prev.length; i += 1) {
      if (!pitchEqual(prev[i], next[i])) {
        same = false;
        break;
      }
    }
    if (same) return prev;
  }

  if (next.length === prev.length + 1) {
    let prefixOk = true;
    for (let i = 0; i < prev.length; i += 1) {
      if (!pitchEqual(prev[i], next[i])) {
        prefixOk = false;
        break;
      }
    }
    if (prefixOk) return [...prev, next[next.length - 1]!];
  }

  return next;
}

function applyGameState(
  prev: LiveGameState | null,
  next: LiveGameState,
  force = false,
): LiveGameState {
  if (!force && prev && isStaleRegression(prev, next)) {
    return prev;
  }

  if (!force && prev && liveStateFingerprint(prev) === liveStateFingerprint(next)) {
    return prev;
  }

  if (
    prev &&
    prev.plays === next.plays &&
    prev.batterId === next.batterId
  ) {
    const atBatPitches = mergeAtBatPitches(prev.atBatPitches, next.atBatPitches);
    return { ...next, plays: prev.plays, atBatPitches };
  }

  return next;
}

function isStaleRegression(prev: LiveGameState, next: LiveGameState): boolean {
  if (next.plays.length < prev.plays.length) return true;
  if (
    prev.batterId === next.batterId &&
    next.atBatPitches.length < prev.atBatPitches.length
  ) {
    return true;
  }
  return false;
}

function resyncPlayByPlayState(
  state: PlayByPlayParseState,
  allPlays: AllPlayRaw[],
  currentPlay: AllPlayRaw | undefined,
  forceRebuild: boolean,
): PlayByPlayParseState {
  if (allPlays.length === 0) return state;

  if (
    forceRebuild ||
    playByPlayNeedsResync(state, allPlays, currentPlay)
  ) {
    return rebuildPlayByPlayFromFeed(allPlays, currentPlay);
  }

  return syncPlayByPlayFromFeed(state, allPlays, currentPlay);
}

/**
 * Direct MLB CDN polls. Re-syncs the allPlays tail each poll (merging fresher
 * currentPlay) so pitches, game events, and at-bat outcomes land as they happen.
 */
export function useLiveGameState(
  gamePk: number,
  options?: UseLiveGameStateOptions,
): UseLiveGameStateResult {
  const enabled = options?.enabled ?? true;
  const pollBurstKey = options?.pollBurstKey;
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(0);
  const parseStateRef = useRef<PlayByPlayParseState>(createPlayByPlayParseState());
  const tabWasHiddenRef = useRef(false);

  const fetchState = useCallback(async () => {
    const generation = generationRef.current;
    const catchingUp =
      tabWasHiddenRef.current && document.visibilityState === "visible";

    try {
      const feed = await fetchMLBLiveFeed(gamePk);
      if (generation !== generationRef.current) return;

      const allPlays = feed.liveData.plays.allPlays ?? [];
      const currentPlay = feed.liveData.plays.currentPlay as AllPlayRaw | undefined;

      parseStateRef.current = resyncPlayByPlayState(
        parseStateRef.current,
        allPlays,
        currentPlay,
        catchingUp,
      );

      if (
        !playByPlayNeedsResync(parseStateRef.current, allPlays, currentPlay)
      ) {
        tabWasHiddenRef.current = false;
      }

      if (generation !== generationRef.current) return;

      const next = parseLiveFeedSnapshot(
        gamePk,
        feed,
        parseStateRef.current.entries,
      );
      setGameState((prev) => applyGameState(prev, next, catchingUp));
      setError(null);
    } catch (err) {
      if (generation !== generationRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch live game state");
    } finally {
      if (generation === generationRef.current) {
        setIsLoading(false);
      }
    }
  }, [gamePk]);

  useEffect(() => {
    if (!gamePk) {
      setIsLoading(false);
      return;
    }

    generationRef.current += 1;
    parseStateRef.current = createPlayByPlayParseState();
    tabWasHiddenRef.current = false;
    setGameState(null);
    setIsLoading(true);
    setError(null);
  }, [gamePk]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        tabWasHiddenRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!enabled || pollBurstKey === undefined) return;
    void fetchState();
  }, [enabled, pollBurstKey, fetchState]);

  useRapidPoll(
    fetchState,
    LIVE_FEED_POLL_INTERVAL_MS,
    LIVE_FEED_MAX_IN_FLIGHT,
    enabled && Boolean(gamePk),
    gamePk,
  );

  return { gameState, isLoading, error, refreshNow: fetchState };
}
