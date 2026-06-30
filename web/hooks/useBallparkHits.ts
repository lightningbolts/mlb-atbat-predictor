"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BallparkHitsAggregate, BallparkHitsDetail } from "@/lib/mlb/ballparkHits";

interface UseBallparkHitsSummaryResult {
  data: BallparkHitsAggregate | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseBallparkHitsDetailResult {
  data: BallparkHitsDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBallparkHitsSummary(season: number): UseBallparkHitsSummaryResult {
  const [data, setData] = useState<BallparkHitsAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ season: String(season) });
      const response = await fetch(`/api/ballparks/hits?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as BallparkHitsAggregate | { error?: string };

      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Failed to load ballpark hits");
      }

      if (requestId !== requestIdRef.current) return;
      setData(body as BallparkHitsAggregate);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load ballpark hits");
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [season]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useBallparkHitsDetail(
  venueId: number,
  season: number,
): UseBallparkHitsDetailResult {
  const [data, setData] = useState<BallparkHitsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        season: String(season),
        venueId: String(venueId),
      });
      const response = await fetch(`/api/ballparks/hits?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as BallparkHitsDetail | { error?: string };

      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Failed to load ballpark hits");
      }

      if (requestId !== requestIdRef.current) return;
      setData(body as BallparkHitsDetail);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load ballpark hits");
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [season, venueId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
