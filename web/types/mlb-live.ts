export interface PitchReview {
  isOverturned: boolean;
  reviewType: string;
  playerName?: string;
}

export interface PlayPitch {
  pitchNumber: number;
  typeCode: string;
  typeDescription: string;
  callDescription: string;
  callCode: string;
  balls: number;
  strikes: number;
  startSpeed: number;
  plateX: number;
  plateZ: number;
  isStrike: boolean;
  isBall: boolean;
  isPitch: boolean;
  strikeZoneTop: number;
  strikeZoneBottom: number;
  review?: PitchReview;
}

export interface HitData {
  launchSpeed: number;
  launchAngle: number;
  totalDistance: number;
  trajectory: string;
  hardness: string;
  location: string;
  coordX: number;
  coordY: number;
  /** Pitch thrown on the contact event */
  pitchType?: string;
  pitchTypeCode?: string;
  pitchSpeed?: number;
  endSpeed?: number;
  extension?: number;
  plateTime?: number;
  zone?: number;
  spinRate?: number;
  spinDirection?: number;
  breakHorizontal?: number;
  breakVertical?: number;
  breakVerticalInduced?: number;
  pfxX?: number;
  pfxZ?: number;
}

export interface PlayDetail {
  atBatIndex: number;
  batterId: number;
  batterName: string;
  batterHits: number;
  batterAtBats: number;
  pitcherName: string;
  event: string;
  description: string;
  inning: number;
  halfInning: string;
  awayScore: number;
  homeScore: number;
  isScoringPlay: boolean;
  pitches: PlayPitch[];
  hit: HitData | null;
}

export interface PlayByPlayEntry {
  atBatIndex: number;
  inning: number;
  halfInning: string;
  batterId: number;
  batterName: string;
  batterHits: number;
  batterAtBats: number;
  event: string;
  description: string;
  awayScore: number;
  homeScore: number;
  isScoringPlay: boolean;
  detail: PlayDetail;
}

export interface LiveGameState {
  gamePk: number;
  gameStatus: string;
  awayTeam: string;
  awayAbbrev: string;
  homeTeam: string;
  homeAbbrev: string;
  awayRuns: number;
  homeRuns: number;
  batterName: string;
  pitcherName: string;
  inning: number;
  inningHalf: string;
  balls: number;
  strikes: number;
  outs: number;
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  atBatPitches: PlayPitch[];
  plays: PlayByPlayEntry[];
  observedAt: string;
}

interface PitchEventRaw {
  isPitch?: boolean;
  index?: number;
  pitchNumber?: number;
  reviewDetails?: {
    isOverturned?: boolean;
    inProgress?: boolean;
    reviewType?: string;
    player?: { fullName?: string };
  };
  details?: {
    description?: string;
    event?: string;
    eventType?: string;
    isStrike?: boolean;
    isBall?: boolean;
    hasReview?: boolean;
    call?: { code?: string; description?: string };
    type?: { code?: string; description?: string };
  };
  count?: { balls?: number; strikes?: number; outs?: number };
  pitchData?: {
    startSpeed?: number;
    endSpeed?: number;
    extension?: number;
    plateTime?: number;
    zone?: number;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    coordinates?: {
      pX?: number;
      pZ?: number;
      pfxX?: number;
      pfxZ?: number;
    };
    breaks?: {
      breakHorizontal?: number;
      breakVertical?: number;
      breakVerticalInduced?: number;
      spinRate?: number;
      spinDirection?: number;
    };
  };
  hitData?: {
    launchSpeed?: number;
    launchAngle?: number;
    totalDistance?: number;
    trajectory?: string;
    hardness?: string;
    location?: string;
    coordinates?: { coordX?: number; coordY?: number };
  };
}

export interface AllPlayRaw {
  result?: {
    event?: string;
    description?: string;
    eventType?: string;
    awayScore?: number;
    homeScore?: number;
  };
  about?: {
    atBatIndex?: number;
    inning?: number;
    halfInning?: string;
    isScoringPlay?: boolean;
    isComplete?: boolean;
  };
  matchup?: {
    batter?: { id?: number; fullName?: string };
    pitcher?: { fullName?: string };
  };
  playEvents?: PitchEventRaw[];
}

export interface MLBLiveFeedResponse {
  gameData: {
    status: { abstractGameState: string };
    teams: {
      away: { name: string; abbreviation?: string };
      home: { name: string; abbreviation?: string };
    };
  };
  liveData: {
    linescore: {
      currentInning?: number;
      inningState?: string;
      teams?: {
        away: { runs?: number };
        home: { runs?: number };
      };
      offense?: {
        first?: { id: number } | null;
        second?: { id: number } | null;
        third?: { id: number } | null;
      };
    };
    plays: {
      allPlays?: AllPlayRaw[];
      currentPlay: {
        matchup: {
          batter: { fullName: string };
          pitcher: { fullName: string };
        };
        count: { balls: number; strikes: number; outs: number };
        about: { inning?: number; halfInning?: string };
        result?: { description?: string };
        playEvents?: PitchEventRaw[];
      };
    };
  };
}
