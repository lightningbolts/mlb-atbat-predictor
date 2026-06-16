import type { HitData } from "@/types/mlb-live";

/** MLBAM home plate in hc_x / hc_y space. */
const HOME_COORD_X = 125;
const HOME_COORD_Y = 200;

const GRAVITY_FT_S2 = 32.174;
const MPH_TO_FPS = 1.467;

export type Vec3 = [number, number, number];

function horizontalBearing(hit: HitData): number {
  const dx = hit.coordX - HOME_COORD_X;
  const dz = HOME_COORD_Y - hit.coordY;
  if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) return 0;
  return Math.atan2(dx, dz);
}

function scaleHorizontalToDistance(points: Vec3[], targetDistance: number): Vec3[] {
  const last = points[points.length - 1];
  const horiz = Math.hypot(last[0], last[2]);
  if (horiz < 0.01) return points;
  const scale = targetDistance / horiz;
  return points.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
}

function flyBallPath(hit: HitData, segments: number): Vec3[] {
  const distance = Math.max(hit.totalDistance, 1);
  const bearing = horizontalBearing(hit);
  const angleRad = (Math.max(hit.launchAngle, 0) * Math.PI) / 180;
  const v0 = Math.max(hit.launchSpeed, 1) * MPH_TO_FPS;

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const flightTime = (2 * v0 * sinA) / GRAVITY_FT_S2;

  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * flightTime;
    const x = v0 * cosA * Math.sin(bearing) * t;
    const y = Math.max(v0 * sinA * t - 0.5 * GRAVITY_FT_S2 * t * t, 0);
    const z = v0 * cosA * Math.cos(bearing) * t;
    points.push([x, y, z]);
  }

  return scaleHorizontalToDistance(points, distance);
}

function groundBallPath(hit: HitData, segments: number): Vec3[] {
  const distance = Math.max(hit.totalDistance, 1);
  const bearing = horizontalBearing(hit);
  const hopDistance = Math.min(distance * 0.12, 35);
  const hopHeight = Math.min(Math.max(hit.launchAngle * 0.2, 1.5), 10);
  const hopSegments = Math.max(Math.floor(segments * 0.25), 4);
  const rollSegments = segments - hopSegments;

  const points: Vec3[] = [];

  for (let i = 0; i <= hopSegments; i += 1) {
    const t = i / hopSegments;
    const z = hopDistance * t;
    const x = Math.sin(bearing) * z;
    const zDir = Math.cos(bearing) * z;
    const y = hopHeight * 4 * t * (1 - t);
    points.push([x, y, zDir]);
  }

  for (let i = 1; i <= rollSegments; i += 1) {
    const t = i / rollSegments;
    const z = hopDistance + (distance - hopDistance) * t;
    points.push([Math.sin(bearing) * z, 0, Math.cos(bearing) * z]);
  }

  return points;
}

function isGroundBall(hit: HitData): boolean {
  const traj = hit.trajectory.toLowerCase();
  return traj.includes("ground") || traj.includes("bunt") || hit.launchAngle < 5;
}

/** Estimated flight path in feet: X = 3B side, Y = height, Z = toward outfield. */
export function computeTrajectoryPoints(hit: HitData, segments = 72): Vec3[] {
  if (hit.totalDistance <= 0 && hit.launchSpeed <= 0) {
    return [
      [0, 0, 0],
      [0, 0, 1],
    ];
  }

  if (isGroundBall(hit)) {
    return groundBallPath(hit, segments);
  }

  return flyBallPath(hit, segments);
}
