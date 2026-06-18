"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";
import {
  DEFAULT_OUTCOME_PROBABILITIES,
  type OutcomeProbabilities,
  type Prediction,
} from "@/types/database";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface UseLivePredictionsResult {
  latestPrediction: Prediction | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
}

const PREDICTION_POLL_MS = 500;

function normalizePrediction(row: Record<string, unknown>): Prediction {
  const rawProbs = row.outcome_probabilities;
  let probabilities: OutcomeProbabilities = { ...DEFAULT_OUTCOME_PROBABILITIES };

  if (rawProbs && typeof rawProbs === "object" && !Array.isArray(rawProbs)) {
    const p = rawProbs as Record<string, unknown>;
    probabilities = {
      strikeout: typeof p.strikeout === "number" ? p.strikeout : 0,
      walk: typeof p.walk === "number" ? p.walk : 0,
      single: typeof p.single === "number" ? p.single : 0,
      double: typeof p.double === "number" ? p.double : 0,
      triple: typeof p.triple === "number" ? p.triple : 0,
      home_run: typeof p.home_run === "number" ? p.home_run : 0,
      field_out: typeof p.field_out === "number" ? p.field_out : 0,
    };
  }

  return {
    id: typeof row.id === "string" ? row.id : "",
    game_pk: typeof row.game_pk === "number" ? row.game_pk : 0,
    timestamp: typeof row.timestamp === "string" ? row.timestamp : new Date().toISOString(),
    batter_name: typeof row.batter_name === "string" ? row.batter_name : "Unknown Batter",
    pitcher_name: typeof row.pitcher_name === "string" ? row.pitcher_name : "Unknown Pitcher",
    inning: typeof row.inning === "number" ? row.inning : 1,
    balls: typeof row.balls === "number" ? row.balls : 0,
    strikes: typeof row.strikes === "number" ? row.strikes : 0,
    outs: typeof row.outs === "number" ? Math.min(3, Math.max(0, row.outs)) : 0,
    on_first: Boolean(row.on_first),
    on_second: Boolean(row.on_second),
    on_third: Boolean(row.on_third),
    outcome_probabilities: probabilities,
  };
}

export function useLivePredictions(gamePk: number): UseLivePredictionsResult {
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const applyPrediction = useCallback((row: Record<string, unknown>) => {
    setLatestPrediction(normalizePrediction(row));
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!gamePk) {
      setIsLoading(false);
      setError("Invalid game ID");
      return;
    }

    let cancelled = false;
    setLatestPrediction(null);
    setIsLoading(true);
    setError(null);
    setConnectionStatus("connecting");

    const supabase = createClient();
    const channelName = `predictions:game_pk=${gamePk}`;

    const fetchLatest = async (): Promise<void> => {
      const { data, error: fetchError } = await supabase
        .from("predictions")
        .select("*")
        .eq("game_pk", gamePk)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setConnectionStatus("error");
        setIsLoading(false);
        return;
      }

      if (data) {
        applyPrediction(data as Record<string, unknown>);
      } else {
        // No rows yet — leave UI to MLB live feed; stop blocking on skeleton.
        setIsLoading(false);
      }
    };

    void fetchLatest();

    const pollId = window.setInterval(() => {
      void fetchLatest();
    }, PREDICTION_POLL_MS);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "predictions",
          filter: `game_pk=eq.${gamePk}`,
        },
        (payload) => {
          if (payload.new) {
            applyPrediction(payload.new as Record<string, unknown>);
            setConnectionStatus("connected");
          }
        },
      )
      .subscribe((status) => {
        if (cancelled) return;

        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          setIsLoading(false);
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("error");
          setError("Realtime channel error — check Supabase Realtime settings.");
          setIsLoading(false);
        } else if (status === "TIMED_OUT") {
          setConnectionStatus("disconnected");
          setError("Realtime connection timed out.");
          setIsLoading(false);
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected");
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gamePk, applyPrediction]);

  return {
    latestPrediction,
    isLoading,
    error,
    connectionStatus,
  };
}
