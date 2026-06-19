"use client";

import { OrbitControls } from "@react-three/drei";
import type { Vec3 } from "@/lib/mlb/ballTrajectory";

export const TRAJECTORY_CONTROLS_HINT =
  "Drag to rotate · right-drag to pan · scroll to zoom";

interface TrajectoryOrbitControlsProps {
  target: Vec3;
  minDistance: number;
  maxDistance: number;
}

/** Shared orbit controls for batted-ball 3D views — rotate, zoom, and pan on the field plane. */
export function TrajectoryOrbitControls({
  target,
  minDistance,
  maxDistance,
}: TrajectoryOrbitControlsProps) {
  return (
    <OrbitControls
      makeDefault
      target={target}
      enablePan
      screenSpacePanning={false}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}
