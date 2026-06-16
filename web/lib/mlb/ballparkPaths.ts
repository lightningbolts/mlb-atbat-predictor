import ballparkIndex from "@/data/ballparks/index.json";
import type { BallparkData, BallparkIndex, BallparkTransform } from "@/types/ballpark";

const index = ballparkIndex as BallparkIndex;

/** Map MLBAM coordX/coordY (hc_x/hc_y) to normalized 0–100 SVG coords. */
export function mapHitToSvg(
  coordX: number,
  coordY: number,
  transform: BallparkTransform,
): { x: number; y: number } {
  return {
    x: transform.offsetX + (coordX - transform.minX) * transform.scale,
    y: transform.offsetY + (coordY - transform.minY) * transform.scale,
  };
}

export function getBallparkByVenueId(venueId: number | null | undefined): BallparkData | null {
  if (venueId == null) return null;
  return index.parks[String(venueId)] ?? null;
}

/** Segments drawn back-to-front for the spray chart field background. */
export const FIELD_SEGMENT_ORDER = [
  "outfield_outer",
  "outfield_inner",
  "infield_outer",
  "infield_inner",
  "foul_lines",
  "home_plate",
] as const;

export const FIELD_SEGMENT_STYLES: Record<
  string,
  { fill: string; stroke: string; strokeWidth: number; opacity?: number }
> = {
  outfield_outer: { fill: "#243524", stroke: "#3d5c3d", strokeWidth: 0.5 },
  outfield_inner: { fill: "none", stroke: "#3d5c3d", strokeWidth: 0.25, opacity: 0.4 },
  infield_outer: { fill: "#2a3f2a", stroke: "#4a6b4a", strokeWidth: 0.4 },
  infield_inner: { fill: "none", stroke: "#4a6b4a", strokeWidth: 0.25, opacity: 0.5 },
  foul_lines: { fill: "none", stroke: "#4a6b4a", strokeWidth: 0.3, opacity: 0.6 },
  home_plate: { fill: "#e5e5e5", stroke: "#ffffff", strokeWidth: 0.3 },
};

/** Generic symmetric field used when venue is unknown. */
export const GENERIC_FIELD_SEGMENTS: Record<string, string> = {
  outfield_outer: "M 8 92 Q 50 8 92 92 Z",
  infield_outer: "M 50 88 L 68 70 L 50 52 L 32 70 Z",
};

/** Approximate transform for generic chart (maps coordX/coordY with home ≈ 125,200). */
export const GENERIC_TRANSFORM: BallparkTransform = {
  minX: 29,
  maxX: 221,
  minY: 38,
  maxY: 210,
  padding: 3,
  scale: 0.42,
  offsetX: 3,
  offsetY: 3,
};

export { index as ballparkIndex };
