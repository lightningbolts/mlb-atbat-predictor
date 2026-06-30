import {
  SPRAY_HIT_BALL_OUTLINE,
  SPRAY_HIT_SHADOW,
} from "@/lib/mlb/sprayChartStyle";

interface SprayTrajectoryProps {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  color: string;
  selected?: boolean;
  showLines?: boolean;
  lineWidth?: number;
  ballRadius?: number;
}

/** Hit line + landing dot with shadow underlay for field contrast. */
export function SprayTrajectory({
  homeX,
  homeY,
  x,
  y,
  color,
  selected = false,
  showLines = true,
  lineWidth,
  ballRadius = 2.4,
}: SprayTrajectoryProps) {
  const compact = ballRadius < 2;
  const strokeW = lineWidth ?? (selected ? (compact ? 0.55 : 0.85) : compact ? 0.4 : 0.65);
  const haloW = strokeW + (compact ? 0.35 : 0.55);
  const r = selected ? ballRadius * (compact ? 1.35 : 1.33) : ballRadius;
  const haloR = r + (compact ? 0.45 : 0.85);

  return (
    <g>
      {showLines && (
        <>
          <line
            x1={homeX}
            y1={homeY}
            x2={x}
            y2={y}
            stroke={SPRAY_HIT_SHADOW}
            strokeWidth={haloW}
            strokeLinecap="round"
            opacity={0.6}
          />
          <line
            x1={homeX}
            y1={homeY}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity={selected ? 1 : 0.95}
          />
        </>
      )}
      <circle cx={x} cy={y} r={haloR} fill={SPRAY_HIT_SHADOW} opacity={0.55} />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={color}
        stroke={SPRAY_HIT_BALL_OUTLINE}
        strokeWidth={selected ? 0.85 : 0.65}
      />
    </g>
  );
}
