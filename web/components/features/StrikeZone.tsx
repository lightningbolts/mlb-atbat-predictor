"use client";

import { PitchSequence } from "@/components/features/PitchSequence";
import type { PlayPitch } from "@/types/mlb-live";

interface StrikeZoneProps {
  pitches: PlayPitch[];
  className?: string;
}

/** Dashboard wrapper — delegates to PitchSequence. */
export function StrikeZone({ pitches, className }: StrikeZoneProps) {
  return <PitchSequence pitches={pitches} className={className} />;
}
