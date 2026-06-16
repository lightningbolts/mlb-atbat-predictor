"use client";

import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/hooks/useLivePredictions";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  error: string | null;
}

export function ConnectionIndicator({ status, error }: ConnectionIndicatorProps) {
  if (status === "connected" && !error) return null;

  const label =
    status === "error" || status === "disconnected"
      ? "Feed offline"
      : "Connecting";

  return (
    <div
      className="absolute right-2 top-10 z-10 border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-400"
      role="status"
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
          status === "connected" ? "bg-neutral-500" : "bg-red-500",
        )}
      />
      {label}
      {error && <span className="ml-1 text-neutral-600">— {error}</span>}
    </div>
  );
}
