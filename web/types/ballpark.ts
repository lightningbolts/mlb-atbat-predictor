export interface BallparkFieldInfo {
  capacity: number | null;
  turfType: string | null;
  roofType: string | null;
  leftLine: number | null;
  left: number | null;
  leftCenter: number | null;
  center: number | null;
  rightCenter: number | null;
  right: number | null;
  rightLine: number | null;
}

export interface BallparkTransform {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  padding: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface BallparkData {
  venueId: number;
  venueName: string;
  teamId: number;
  teamName: string;
  teamAbbrev: string;
  stadiumSlug: string;
  fieldInfo: BallparkFieldInfo;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  transform: BallparkTransform;
  segments: Record<string, string>;
  svgPath: string;
}

export interface BallparkIndex {
  generatedAt: string;
  coordinateSystem: string;
  sources: { fieldInfo: string; wallPaths: string };
  parks: Record<string, BallparkData>;
  bySlug: Record<string, number>;
}
