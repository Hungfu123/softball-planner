/** Die Typen, die Board, Editor und Wiedergabe teilen. Spiegel der Backend-Records. */

export type PositionCode = 'P' | 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF';

export type BallState = 'AT_BAT' | 'IN_HAND' | 'IN_FLIGHT' | 'LOOSE';
export type RunnerStatus = 'ACTIVE' | 'OUT' | 'SCORED';
export type Trajectory = 'AIR' | 'GROUND';
export type GameState = 'ANY' | 'CLOSE_LATE' | 'AHEAD' | 'BEHIND';

export interface Defender {
  position: PositionCode;
  x: number;
  y: number;
}

export interface Runner {
  id: string;
  x: number;
  y: number;
  status: RunnerStatus;
}

export interface Ball {
  state: BallState;
  /** Positionskuerzel des Fielders, der ihn haelt — sonst null. */
  holder: PositionCode | null;
  x: number;
  y: number;
  trajectory: Trajectory;
}

export interface PlayMarkers {
  defenders: Defender[];
  runners: Runner[];
  ball: Ball;
}

export interface PlayStep {
  id?: number;
  ordinal: number;
  durationMs: number;
  note: string | null;
  outs: number;
  markers: PlayMarkers;
}

export interface Play {
  id: number;
  title: string;
  categoryId: number;
  gameState: GameState;
  gameStateNote: string | null;
  counterpartPlayId: number | null
  /** Platz im Kapitel. Wer keinen hat, steht dahinter, nach id. Siehe `kapitelFolge`. */
  sortOrder?: number | null;
  steps: PlayStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayCategory {
  id: number;
  name: string;
  sortOrder: number;
}

/** Was gerade am Finger haengt. */
export type MarkerRef =
  | { kind: 'defender'; position: PositionCode }
  | { kind: 'runner'; id: string }
  | { kind: 'ball' };
