"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildDueUpContext, type DueUpContext } from "@/lib/mlb/lineup";
import type { GameBoxScore } from "@/types/mlb-boxscore";
import type { LiveGameState } from "@/types/mlb-live";

export interface LiveGameOverlays {
  dueUp: DueUpContext | null;
  showDueUp: boolean;
  dismissDueUp: () => void;
  showFinal: boolean;
  dismissFinal: () => void;
}

export function useLiveGameOverlays(
  gameState: LiveGameState | null,
  boxScore: GameBoxScore | null,
  showBreakUI = true,
): LiveGameOverlays {
  const [dismissedBreaks, setDismissedBreaks] = useState<Set<string>>(() => new Set());
  const [finalDismissed, setFinalDismissed] = useState(false);

  const dueUp = useMemo(() => {
    if (!gameState || !boxScore || gameState.gameStatus === "Final") return null;
    return buildDueUpContext(
      gameState.inning,
      gameState.inningState,
      gameState.awayTeam,
      gameState.homeTeam,
      gameState.awayAbbrev,
      gameState.homeAbbrev,
      boxScore.away.batters,
      boxScore.home.batters,
      gameState.plays,
    );
  }, [gameState, boxScore]);

  const isFinal = gameState?.gameStatus === "Final";

  useEffect(() => {
    setDismissedBreaks(new Set());
    setFinalDismissed(false);
  }, [gameState?.gamePk]);

  useEffect(() => {
    if (!isFinal) {
      setFinalDismissed(false);
    }
  }, [isFinal]);

  const dismissDueUp = useCallback(() => {
    if (!dueUp) return;
    setDismissedBreaks((prev) => new Set(prev).add(dueUp.breakKey));
  }, [dueUp]);

  const dismissFinal = useCallback(() => {
    setFinalDismissed(true);
  }, []);

  const showDueUp = dueUp != null && showBreakUI && !dismissedBreaks.has(dueUp.breakKey);
  const showFinal = isFinal && !finalDismissed;

  return {
    dueUp,
    showDueUp,
    dismissDueUp,
    showFinal,
    dismissFinal,
  };
}
