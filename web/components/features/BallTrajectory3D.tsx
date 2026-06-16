"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import {
  buildChartBackgroundGeometry,
  buildParkFieldGeometry,
  computeSceneTrajectoryPoints,
  estimateApexSceneHeight,
  getParkSceneMapper,
  trajectorySceneBounds,
  type FieldLineData,
  type FieldMeshData,
} from "@/lib/mlb/ballparkScene";
import type { HitData } from "@/types/mlb-live";
import type { Vec3 } from "@/lib/mlb/ballTrajectory";

function ParkField({ venueId }: { venueId?: number | null }) {
  const mapper = useMemo(() => getParkSceneMapper(venueId), [venueId]);

  const { meshes, lines, background } = useMemo(() => {
    const field = buildParkFieldGeometry(venueId, mapper);
    return {
      ...field,
      background: buildChartBackgroundGeometry(mapper),
    };
  }, [mapper, venueId]);

  return (
    <group>
      <mesh geometry={background}>
        <meshStandardMaterial color="#1a2e1a" />
      </mesh>
      {meshes.map((mesh: FieldMeshData) => (
        <mesh key={mesh.key} geometry={mesh.geometry}>
          <meshStandardMaterial
            color={mesh.color}
            transparent={mesh.opacity != null && mesh.opacity < 1}
            opacity={mesh.opacity ?? 1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {lines.map((line: FieldLineData) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.color}
          lineWidth={1}
          transparent={line.opacity != null && line.opacity < 1}
          opacity={line.opacity ?? 1}
        />
      ))}
    </group>
  );
}

function TrajectoryPath({ hit, venueId }: { hit: HitData; venueId?: number | null }) {
  const { points, landing } = useMemo(() => {
    const mapper = getParkSceneMapper(venueId);
    const scenePoints = computeSceneTrajectoryPoints(hit, mapper);
    const end = mapper.hitCoordToScene(hit.coordX, hit.coordY, 0);
    return { points: scenePoints, landing: end };
  }, [hit, venueId]);

  return (
    <group>
      <Line points={points} color="#fbbf24" lineWidth={2.5} />
      <mesh position={landing}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Scene({ hit, venueId }: { hit: HitData; venueId?: number | null }) {
  const bounds = useMemo(() => {
    const mapper = getParkSceneMapper(venueId);
    const scenePoints = computeSceneTrajectoryPoints(hit, mapper);
    return trajectorySceneBounds(scenePoints);
  }, [hit, venueId]);

  return (
    <>
      <color attach="background" args={["#0f1a12"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 6]} intensity={0.9} />
      <directionalLight position={[-6, 8, -4]} intensity={0.25} />
      <ParkField venueId={venueId} />
      <TrajectoryPath hit={hit} venueId={venueId} />
      <OrbitControls
        makeDefault
        target={bounds.center}
        enablePan={false}
        minDistance={bounds.radius * 0.5}
        maxDistance={bounds.radius * 3}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

interface BallTrajectory3DProps {
  hit: HitData;
  venueId?: number | null;
  className?: string;
}

export function BallTrajectory3D({ hit, venueId, className }: BallTrajectory3DProps) {
  const cameraPosition = useMemo((): Vec3 => {
    const mapper = getParkSceneMapper(venueId);
    const landing = mapper.hitCoordToScene(hit.coordX, hit.coordY, 0);
    const horiz = Math.hypot(landing[0], landing[2]);
    const peak = hit.launchAngle >= 5 ? estimateApexSceneHeight(hit, horiz) : 0.15;
    const target: Vec3 = [landing[0] * 0.45, peak * 0.45, landing[2] * 0.45];
    const pullBack = Math.max(horiz * 1.15, 4.5);
    return [target[0] * 0.15, pullBack * 0.5, target[2] * 0.15 - pullBack];
  }, [hit, venueId]);

  return (
    <div className={className}>
      <div className="overflow-hidden rounded border border-border bg-[#0f1a12]">
        <Canvas
          camera={{
            position: cameraPosition,
            fov: 48,
            near: 0.1,
            far: 500,
          }}
          gl={{ antialias: true }}
          style={{ height: 280, width: "100%", touchAction: "none" }}
        >
          <Scene hit={hit} venueId={venueId} />
        </Canvas>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-subtle">
        Drag to rotate · scroll to zoom · estimated path from launch angle &amp; distance
      </p>
    </div>
  );
}
