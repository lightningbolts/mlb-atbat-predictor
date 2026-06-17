"use client";

import { useEffect, useRef, useState } from "react";

import { isHalfInningBreak } from "@/lib/mlb/lineup";
import type { LiveGameState } from "@/types/mlb-live";

export const BREAK_LINGER_MS = 3_500;

function breakKey(state: LiveGameState): string {
  return `${state.inning}-${state.inningState.toLowerCase()}`;
}

/** Reconstruct the just-finished at-bat when the feed jumps straight to a break. */
function buildLingerState(
  gameState: LiveGameState,
  lastActive: LiveGameState | null,
): LiveGameState {
  const lastPlay = gameState.plays.at(-1);
  if (lastPlay && lastPlay.detail.pitches.length > 0) {
    const lastPitch = lastPlay.detail.pitches.at(-1);
    const base = lastActive ?? gameState;

    return {
      ...base,
      batterId: lastPlay.batterId,
      batterName: lastPlay.batterName,
      pitcherId: lastPlay.detail.pitcherId,
      pitcherName: lastPlay.detail.pitcherName,
      inning: lastPlay.inning,
      inningHalf: lastPlay.halfInning,
      inningState: lastPlay.halfInning,
      balls: lastPitch?.balls ?? 0,
      strikes: lastPitch?.strikes ?? 0,
      outs: lastPlay.outs,
      onFirst: lastPlay.onFirst,
      onSecond: lastPlay.onSecond,
      onThird: lastPlay.onThird,
      awayRuns: lastPlay.awayScore,
      homeRuns: lastPlay.homeScore,
      atBatPitches: lastPlay.detail.pitches,
    };
  }

  if (lastActive && lastActive.atBatPitches.length > 0) {
    return { ...lastActive, inningState: lastActive.inningHalf };
  }

  return lastActive ?? gameState;
}

export interface BreakLingerResult {
  /** State to render for scorebug / at-bat panel (may hold the finished AB briefly). */
  atBatViewState: LiveGameState | null;
  /** True while the final at-bat is still on screen before due-up UI. */
  isLingering: boolean;
  /** True when due-up / break UI should replace the at-bat panel. */
  showBreakUI: boolean;
}

export function useBreakLinger(gameState: LiveGameState | null): BreakLingerResult {
  const lastActiveRef = useRef<LiveGameState | null>(null);
  const lingeredBreakKeyRef = useRef<string | null>(null);
  const [lingerState, setLingerState] = useState<LiveGameState | null>(null);
  const [lingerUntil, setLingerUntil] = useState(0);
  const [lingerExpired, setLingerExpired] = useState(true);

  const isBreak = gameState != null && isHalfInningBreak(gameState.inningState);

  useEffect(() => {
    if (!gameState) return;

    if (!isHalfInningBreak(gameState.inningState)) {
      lastActiveRef.current = gameState;
      lingeredBreakKeyRef.current = null;
      setLingerState(null);
      setLingerUntil(0);
      setLingerExpired(true);
      return;
    }

    const key = breakKey(gameState);
    if (lingeredBreakKeyRef.current === key) return;

    lingeredBreakKeyRef.current = key;
    setLingerState(buildLingerState(gameState, lastActiveRef.current));
    setLingerUntil(Date.now() + BREAK_LINGER_MS);
    setLingerExpired(false);
  }, [gameState]);

  useEffect(() => {
    setLingerState(null);
    setLingerUntil(0);
    setLingerExpired(true);
    lastActiveRef.current = null;
    lingeredBreakKeyRef.current = null;
  }, [gameState?.gamePk]);

  useEffect(() => {
    if (lingerExpired || lingerUntil <= Date.now()) return;

    const id = window.setTimeout(() => {
      setLingerExpired(true);
    }, lingerUntil - Date.now());

    return () => window.clearTimeout(id);
  }, [lingerUntil, lingerExpired]);

  const isLingering = isBreak && !lingerExpired && lingerState != null;
  const showBreakUI = isBreak && lingerExpired;
  const atBatViewState = isLingering ? lingerState : gameState;

  return { atBatViewState, isLingering, showBreakUI };
}
