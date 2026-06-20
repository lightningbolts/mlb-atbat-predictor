"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  appendPlayByPlay,
  createPlayByPlayParseState,
  liveStateFingerprint,
  parseStateFromSnapshot,
  syncOngoingGameEvents,
  type PlayByPlayParseState,
} from "@/lib/mlb/liveFeed";
import { pollLiveFeed, workerPayloadToSnapshot } from "@/lib/mlb/liveFeedClient";
import type { AllPlayRaw, LiveGameState, PlayPitch } from "@/types/mlb-live";

import { useRapidPoll } from "./useRapidPoll";

/** Overlapping polls — worker parses JSON off-thread; pitch polls skip allPlays. */
const LIVE_FEED_POLL_MS = 100;
const MAX_IN_FLIGHT = 2;

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
  if (prev && isStaleRegression(prev, next)) {
    return prev;
  }

  if (prev && liveStateFingerprint(prev) === liveStateFingerprint(next)) {
    return prev;
  }

  if (prev && prev.plays === next.plays) {
    const atBatPitches = mergeAtBatPitches(prev.atBatPitches, next.atBatPitches);
    return { ...next, plays: prev.plays, atBatPitches };
  }

  return next;
}

/** Ignore out-of-order poll responses that would roll back pitch or PBP state. */
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

function applyPollResult(
  parseState: PlayByPlayParseState,
  newPlays: AllPlayRaw[] | undefined,
  playsFrom: number | undefined,
  allPlaysCount: number,
  currentPlay: AllPlayRaw | null | undefined,
): PlayByPlayParseState {
  let next = parseState;

  if (newPlays?.length && playsFrom != null) {
    next = appendPlayByPlay(next, newPlays, playsFrom, allPlaysCount);
  }

  return syncOngoingGameEvents(next, currentPlay, allPlaysCount);
}

/**
 * Worker-backed MLB CDN polls. Pitch polls omit allPlays (compact postMessage);
 * play-by-play extends only when allPlays grows. Ongoing steals/visits sync via
 * currentPlay every poll without re-parsing the full feed on the main thread.
 */
export function useLiveGameState(gamePk: number): UseLiveGameStateResult {
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(0);
  const parseStateRef = useRef<PlayByPlayParseState>(createPlayByPlayParseState());

  const fetchState = useCallback(async () => {
    const generation = generationRef.current;

    try {
      const playsFrom =
        parseStateRef.current.entries.length === 0
          ? 0
          : null;

      const result = await pollLiveFeed(gamePk, playsFrom);
      if (generation !== generationRef.current) return;

      const currentPlay = result.currentPlay as AllPlayRaw | undefined;
      parseStateRef.current = applyPollResult(
        parseStateRef.current,
        result.newPlays as AllPlayRaw[] | undefined,
        result.playsFrom,
        result.allPlaysCount,
        currentPlay,
      );

      if (
        result.allPlaysCount > parseStateRef.current.rawPlayCount &&
        parseStateRef.current.entries.length > 0 &&
        result.playsFrom == null
      ) {
        const syncFrom = parseStateRef.current.rawPlayCount;
        void pollLiveFeed(gamePk, syncFrom).then((sync) => {
          if (generation !== generationRef.current) return;

          parseStateRef.current = applyPollResult(
            parseStateRef.current,
            sync.newPlays as AllPlayRaw[] | undefined,
            sync.playsFrom,
            sync.allPlaysCount,
            sync.currentPlay as AllPlayRaw | undefined,
          );

          const synced = parseStateFromSnapshot(
            workerPayloadToSnapshot(sync),
            parseStateRef.current.entries,
          );
          setGameState((prev) => applyGameState(prev, synced));
        });
      }

      const next = parseStateFromSnapshot(
        workerPayloadToSnapshot(result),
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
    setGameState(null);
    setIsLoading(true);
    setError(null);
  }, [gamePk]);

  useRapidPoll(fetchState, LIVE_FEED_POLL_MS, MAX_IN_FLIGHT, Boolean(gamePk), gamePk);

  return { gameState, isLoading, error };
}
