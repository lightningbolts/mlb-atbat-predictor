"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `poll` in a loop with at least `minGapMs` between the start of each attempt.
 * The next cycle begins as soon as the previous fetch finishes (no fixed interval tail).
 */
export function useChainedPoll(
  poll: () => Promise<void>,
  minGapMs: number,
  enabled: boolean,
  resetKey: unknown,
): void {
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId = 0;

    const run = async () => {
      const started = performance.now();
      try {
        await pollRef.current();
      } catch {
        // Caller owns error handling inside poll.
      }
      if (cancelled) return;

      const elapsed = performance.now() - started;
      const delay = Math.max(0, minGapMs - elapsed);
      timeoutId = window.setTimeout(() => void run(), delay);
    };

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [enabled, minGapMs, resetKey]);
}
