"use client";

import { cn } from "@/lib/utils";
import type { HitData } from "@/types/mlb-live";

interface SprayChartProps {
  hit: HitData | null;
  className?: string;
}

/** Top-down field plot — MLB coordX/coordY in feet from home plate. */
export function SprayChart({ hit, className }: SprayChartProps) {
  if (!hit) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full max-w-[220px] items-center justify-center border border-neutral-800 bg-neutral-950 text-xs text-neutral-600",
          className,
        )}
      >
        No batted ball data
      </div>
    );
  }

  // Field fan: home at bottom center. coordY = depth, coordX = horizontal spray.
  const maxDepth = 420;
  const maxWidth = 250;
  const x = 50 + (hit.coordX / maxWidth) * 42;
  const y = 92 - (hit.coordY / maxDepth) * 82;

  return (
    <div className={cn("w-full max-w-[220px]", className)}>
      <svg viewBox="0 0 100 100" className="w-full border border-neutral-800 bg-[#1a2e1a]">
        {/* Outfield arc */}
        <path
          d="M 8 92 Q 50 8 92 92 Z"
          fill="#243524"
          stroke="#3d5c3d"
          strokeWidth="0.5"
        />
        {/* Infield diamond */}
        <path
          d="M 50 88 L 68 70 L 50 52 L 32 70 Z"
          fill="#2a3f2a"
          stroke="#4a6b4a"
          strokeWidth="0.4"
        />
        {/* Landing point */}
        <circle cx={x} cy={y} r="2.5" fill="#fbbf24" stroke="#fff" strokeWidth="0.5" />
        <line x1="50" y1="88" x2={x} y2={y} stroke="#fbbf24" strokeWidth="0.4" opacity="0.5" />
      </svg>
      <p className="mt-1 text-center text-[10px] text-neutral-600">
        {hit.totalDistance > 0 ? `${Math.round(hit.totalDistance)} ft` : "In play"}
      </p>
    </div>
  );
}
