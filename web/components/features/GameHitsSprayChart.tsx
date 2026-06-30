"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  FIELD_SEGMENT_ORDER,
  FIELD_SEGMENT_STYLES,
  FIELD_VIEW_BOX,
  GENERIC_FIELD_SEGMENTS,
  GENERIC_TRANSFORM,
  getBallparkByVenueId,
  mapHitToSvg,
} from "@/lib/mlb/ballparkPaths";
import type { GameHit } from "@/lib/mlb/gameHits";
import { SPRAY_HIT_COLOR_VAR } from "@/lib/mlb/sprayChartStyle";
import { SprayTrajectory } from "@/components/features/SprayChartMarkers";

interface GameHitsSprayChartProps {
  hits: GameHit[];
  venueId?: number | null;
  selectedAtBatIndex?: number | null;
  getHitKey?: (hit: GameHit) => string | number;
  selectedHitKey?: string | number | null;
  onSelectHit?: (hit: GameHit) => void;
  showLineToggle?: boolean;
  className?: string;
}

function SprayLineToggle({
  showLines,
  onChange,
}: {
  showLines: boolean;
  onChange: (showLines: boolean) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-surface p-0.5"
      role="group"
      aria-label="Spray chart display"
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "rounded px-2 py-1 text-[10px] font-medium transition-colors",
          showLines
            ? "bg-surface-elevated text-foreground"
            : "text-muted hover:text-foreground",
        )}
        aria-pressed={showLines}
      >
        Lines
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "rounded px-2 py-1 text-[10px] font-medium transition-colors",
          !showLines
            ? "bg-surface-elevated text-foreground"
            : "text-muted hover:text-foreground",
        )}
        aria-pressed={!showLines}
      >
        Dots
      </button>
    </div>
  );
}

function FieldBackground({ venueId }: { venueId?: number | null }) {
  const park = getBallparkByVenueId(venueId);
  const segments = park?.segments ?? GENERIC_FIELD_SEGMENTS;

  return (
    <>
      {FIELD_SEGMENT_ORDER.map((segment) => {
        const d = segments[segment];
        if (!d) return null;
        const style = FIELD_SEGMENT_STYLES[segment] ?? FIELD_SEGMENT_STYLES.outfield_outer;
        return (
          <path
            key={segment}
            d={d}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        );
      })}
    </>
  );
}

export function GameHitsSprayChart({
  hits,
  venueId,
  selectedAtBatIndex = null,
  getHitKey,
  selectedHitKey = null,
  onSelectHit,
  showLineToggle,
  className,
}: GameHitsSprayChartProps) {
  const [showLines, setShowLines] = useState(true);
  const park = getBallparkByVenueId(venueId);
  const transform = park?.transform ?? GENERIC_TRANSFORM;
  const home = mapHitToSvg(125, 200, transform);
  const resolveKey = getHitKey ?? ((hit: GameHit) => hit.atBatIndex);
  const activeKey = selectedHitKey ?? selectedAtBatIndex;
  const lineToggleEnabled = showLineToggle ?? Boolean(onSelectHit);

  return (
    <div className={cn("w-full", className)}>
      {lineToggleEnabled && hits.length > 0 && (
        <div className="mb-2 flex justify-end">
          <SprayLineToggle showLines={showLines} onChange={setShowLines} />
        </div>
      )}
      <svg
        viewBox={FIELD_VIEW_BOX}
        className="aspect-square w-full border border-border bg-field-chart-bg"
      >
        <FieldBackground venueId={venueId} />
        {hits.map((gameHit) => {
          const { x, y } = mapHitToSvg(gameHit.hit.coordX, gameHit.hit.coordY, transform);
          const hitKey = resolveKey(gameHit);
          const isSelected = activeKey === hitKey;
          const dimmed = activeKey != null && !isSelected;

          return (
            <g
              key={hitKey}
              opacity={dimmed ? 0.35 : 1}
              className={onSelectHit ? "cursor-pointer" : undefined}
              onClick={onSelectHit ? () => onSelectHit(gameHit) : undefined}
              onKeyDown={
                onSelectHit
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectHit(gameHit);
                      }
                    }
                  : undefined
              }
              role={onSelectHit ? "button" : undefined}
              tabIndex={onSelectHit ? 0 : undefined}
            >
              <SprayTrajectory
                homeX={home.x}
                homeY={home.y}
                x={x}
                y={y}
                color={SPRAY_HIT_COLOR_VAR[gameHit.event]}
                selected={isSelected}
                showLines={showLines}
              />
            </g>
          );
        })}
      </svg>
      {park && (
        <p className="mt-1.5 text-center text-[11px] text-subtle">{park.venueName}</p>
      )}
    </div>
  );
}
