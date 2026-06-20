"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  appendPlayByPlay,
  createPlayByPlayParseState,
  fetchMLBLiveFeed,
  liveStateFingerprint,
  parseLiveFeedSnapshot,
  type PlayByPlayParseState,
} from "@/lib/mlb/liveFeed";
import type { LiveGameState, PlayPitch } from "@/types/mlb-live";

import { useChainedPoll } from "./useChainedPoll";

/** Minimum gap between live polls — chained so slow responses don't stack. */
const LIVE_FEED_MIN_GAP_MS = 100;

export interface UseLiveGameStateResult {
  gameState: LiveGameState | null;
  isLoading: boolean;
  error: string | null;
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

/** Reuse prior pitch object references when only the last pitch is new. */
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
): LiveGameState {
  if (prev && liveStateFingerprint(prev) === liveStateFingerprint(next)) {
    return prev;
  }

  // Pitch-only updates: keep play-by-play stable and reuse unchanged pitch rows.
  if (prev && prev.plays === next.plays) {
    const atBatPitches = mergeAtBatPitches(prev.atBatPitches, next.atBatPitches);
    return { ...next, plays: prev.plays, atBatPitches };
  }

  return next;
}

/**
 * Polls the MLB live feed directly from the browser for Gameday-class latency.
 * Play-by-play is extended incrementally; pitch polls reuse the cached log.
 */
export function useLiveGameState(gamePk: number): UseLiveGameStateResult {
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(0);
  const parseStateRef = useRef<PlayByPlayParseState>(createPlayByPlayParseState());
  const wasBreakRef = useRef(false);
  const pendingPlaysRef = useRef(false);
  const lastAllPlaysCountRef = useRef(0);
  const lastSnapshotBatterIdRef = useRef<number | null>(null);

  const fetchState = useCallback(async () => {
    const generation = generationRef.current;

    try {
      const feed = await fetchMLBLiveFeed(gamePk);
      if (generation !== generationRef.current) return;

      const allPlays = feed.liveData.plays.allPlays ?? [];
      const allPlaysCount = allPlays.length;
      const inningState = feed.liveData.linescore.inningState ?? "";
      const isBreak = /^(middle|end)$/i.test(inningState);
      const enteringBreak = isBreak && !wasBreakRef.current;
      wasBreakRef.current = isBreak;

      const snapshotBatterId = feed.liveData.plays.currentPlay?.matchup?.batter?.id ?? null;
      const batterChanged =
        lastSnapshotBatterIdRef.current != null &&
        snapshotBatterId != null &&
        snapshotBatterId !== lastSnapshotBatterIdRef.current;
      lastSnapshotBatterIdRef.current = snapshotBatterId;

      const newPlayRow = allPlaysCount > lastAllPlaysCountRef.current;
      lastAllPlaysCountRef.current = allPlaysCount;

      const needsPlays =
        pendingPlaysRef.current ||
        parseStateRef.current.entries.length === 0 ||
        newPlayRow;

      if (needsPlays && allPlaysCount > parseStateRef.current.rawPlayCount) {
        const from = parseStateRef.current.rawPlayCount;
        parseStateRef.current = appendPlayByPlay(
          parseStateRef.current,
          allPlays.slice(from),
          from,
          allPlaysCount,
        );
        pendingPlaysRef.current = false;
      } else if (enteringBreak || batterChanged || newPlayRow) {
        pendingPlaysRef.current = true;
      }

      if (generation !== generationRef.current) return;

      const next = parseLiveFeedSnapshot(
        gamePk,
        feed,
        parseStateRef.current.entries,
      );
      setGameState((prev) => applyGameState(prev, next));
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
    wasBreakRef.current = false;
    pendingPlaysRef.current = false;
    lastAllPlaysCountRef.current = 0;
    lastSnapshotBatterIdRef.current = null;
    setGameState(null);
    setIsLoading(true);
    setError(null);
  }, [gamePk]);

  useChainedPoll(fetchState, LIVE_FEED_MIN_GAP_MS, Boolean(gamePk), gamePk);

  return { gameState, isLoading, error };
}
