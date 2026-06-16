import type { PlayPitch } from "@/types/mlb-live";

export const VIEW_WIDTH_FT = 3.2;
export const PADDING_FT = 0.35;

export const PITCH_BALL_COLOR = "#22c55e";
export const PITCH_STRIKE_COLOR = "#ef4444";
export const PITCH_NEUTRAL_COLOR = "#737373";
export const PITCH_REVIEW_COLOR = "#f59e0b";

export function toSvgPercent(
  pX: number,
  pZ: number,
  szTop: number,
  szBottom: number,
): { x: number; y: number } {
  const minX = -VIEW_WIDTH_FT / 2;
  const maxX = VIEW_WIDTH_FT / 2;
  const minZ = szBottom - PADDING_FT;
  const maxZ = szTop + PADDING_FT;

  return {
    x: Math.min(100, Math.max(0, ((pX - minX) / (maxX - minX)) * 100)),
    y: Math.min(100, Math.max(0, (1 - (pZ - minZ) / (maxZ - minZ)) * 100)),
  };
}

export function zoneRectPercent(szTop: number, szBottom: number) {
  const zoneWidth = 1.42;
  const minX = -VIEW_WIDTH_FT / 2;
  const maxX = VIEW_WIDTH_FT / 2;
  const minZ = szBottom - PADDING_FT;
  const maxZ = szTop + PADDING_FT;

  const left = ((-zoneWidth / 2 - minX) / (maxX - minX)) * 100;
  const right = ((zoneWidth / 2 - minX) / (maxX - minX)) * 100;
  const top = (1 - (szTop - minZ) / (maxZ - minZ)) * 100;
  const bottom = (1 - (szBottom - minZ) / (maxZ - minZ)) * 100;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function pitchResultColor(pitch: Pick<PlayPitch, "isBall" | "isStrike" | "isPitch" | "review">): string {
  if (pitch.review) return PITCH_REVIEW_COLOR;
  if (!pitch.isPitch) return PITCH_NEUTRAL_COLOR;
  if (pitch.isBall) return PITCH_BALL_COLOR;
  if (pitch.isStrike) return PITCH_STRIKE_COLOR;
  return PITCH_NEUTRAL_COLOR;
}
