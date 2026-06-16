import type { PlayPitch } from "@/types/mlb-live";

export const VIEW_WIDTH_FT = 3.2;
export const PADDING_FT = 0.35;
/** Vertical space reserved below the zone for home plate. */
export const PLATE_AREA_PCT = 16;

export const CHART_HEIGHT_PCT = 100 - PLATE_AREA_PCT;

export const PITCH_BALL_COLOR = "#22c55e";
export const PITCH_STRIKE_COLOR = "#ef4444";
export const PITCH_IN_PLAY_SAFE_COLOR = "#3b82f6";
export const PITCH_IN_PLAY_OUT_COLOR = "#a855f7";
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
    y: Math.min(
      CHART_HEIGHT_PCT,
      Math.max(0, (1 - (pZ - minZ) / (maxZ - minZ)) * CHART_HEIGHT_PCT),
    ),
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
  const top = (1 - (szTop - minZ) / (maxZ - minZ)) * CHART_HEIGHT_PCT;
  const bottom = (1 - (szBottom - minZ) / (maxZ - minZ)) * CHART_HEIGHT_PCT;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Home plate: zone width, shallow depth (broadcast-style catcher view). */
export function homePlatePath(zone: {
  x: number;
  y: number;
  width: number;
  height: number;
}): string {
  const cx = zone.x + zone.width / 2;
  const halfW = zone.width / 2;
  const gap = 1.2;
  const backY = zone.y + zone.height + gap;
  const depth = zone.width * 0.2;
  const pointY = backY + depth;

  return `M${cx - halfW} ${backY} L${cx + halfW} ${backY} L${cx} ${pointY} Z`;
}

export function pitchResultColor(
  pitch: Pick<PlayPitch, "isBall" | "isStrike" | "isInPlay" | "isOut" | "isPitch" | "review">,
): string {
  if (pitch.review) return PITCH_REVIEW_COLOR;
  if (!pitch.isPitch) return PITCH_NEUTRAL_COLOR;
  if (pitch.isInPlay) {
    return pitch.isOut ? PITCH_IN_PLAY_OUT_COLOR : PITCH_IN_PLAY_SAFE_COLOR;
  }
  if (pitch.isBall) return PITCH_BALL_COLOR;
  if (pitch.isStrike) return PITCH_STRIKE_COLOR;
  return PITCH_NEUTRAL_COLOR;
}
