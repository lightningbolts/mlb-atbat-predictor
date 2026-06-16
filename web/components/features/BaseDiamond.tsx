"use client";

import { cn } from "@/lib/utils";

interface BaseDiamondProps {
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  className?: string;
  size?: "default" | "compact";
}

function Base({
  occupied,
  className,
  size,
}: {
  occupied: boolean;
  className?: string;
  size: "default" | "compact";
}) {
  const dim = size === "compact" ? "h-2.5 w-2.5" : "h-7 w-7";
  return (
    <div
      className={cn(
        "rotate-45 border",
        dim,
        occupied ? "border-amber-400 bg-amber-400" : "border-neutral-600 bg-neutral-800/80",
        className,
      )}
    />
  );
}

export function BaseDiamond({
  onFirst,
  onSecond,
  onThird,
  className,
  size = "default",
}: BaseDiamondProps) {
  const container = size === "compact" ? "h-9 w-9" : "h-36 w-36";

  return (
    <div className={cn("relative mx-auto", container, className)}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
        <path
          d="M50 88 L12 50 L50 12 L88 50 Z"
          fill="none"
          stroke={size === "compact" ? "#525252" : "#404040"}
          strokeWidth={size === "compact" ? "1.2" : "0.75"}
        />
      </svg>
      <Base occupied={onSecond} size={size} className="absolute left-1/2 top-0 -translate-x-1/2" />
      <Base occupied={onThird} size={size} className="absolute left-0 top-1/2 -translate-y-1/2" />
      <Base occupied={onFirst} size={size} className="absolute right-0 top-1/2 -translate-y-1/2" />
    </div>
  );
}
