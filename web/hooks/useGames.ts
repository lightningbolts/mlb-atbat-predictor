"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSeasonStartDate } from "@/lib/games/format";
import { getMLBScheduleDate } from "@/lib/mlb/schedule";
import { GAME_LIST_COLUMNS, type Game } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

export interface UseGamesByDateResult {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DATE_GAMES_POLL_MS = 30_000;

export function useGamesByDate(date: string): UseGamesByDateResult {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isToday = date === getMLBScheduleDate();
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/by-date?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load games (${response.status})`);
      }

      const data = (await response.json()) as { games?: Game[] };
      if (requestId !== requestIdRef.current) return;

      hasLoadedRef.current = true;
      setGames(data.games ?? []);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load games");
      if (isInitialLoad) setGames([]);
    } finally {
      if (requestId === requestIdRef.current && isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [date]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [date]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!isToday) return;

    const intervalId = window.setInterval(() => {
      void refetch();
    }, DATE_GAMES_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [isToday, refetch]);

  return { games, isLoading, error, refetch };
}

export interface UseGamesByTeamResult {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGamesByTeam(teamId: number | null): UseGamesByTeamResult {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!teamId) {
      setGames([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const seasonEnd = getMLBScheduleDate();
    const seasonStart = getSeasonStartDate(seasonEnd);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("games")
        .select(GAME_LIST_COLUMNS)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .gte("game_date", seasonStart)
        .lte("game_date", seasonEnd)
        .order("game_date", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setGames([]);
        return;
      }

      setGames((data ?? []) as Game[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load games");
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { games, isLoading, error, refetch };
}
