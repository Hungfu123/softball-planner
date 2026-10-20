/**
 * Die Geometrie des Softballfeldes.
 *
 * Koordinaten sind Board-Einheiten: eine Einheit ist ein Fuss, der Ursprung liegt oben
 * links, y zeigt nach unten (SVG-Konvention), Home liegt bei (155, 218). Die Masse sind
 * Fastpitch-Damen und gegen die Regelmasse geprueft:
 *
 *   Base-Weg 60 ft · Home nach 2B 84,85 ft (60·√2) · Pitching-Distanz 43 ft
 *   Pitcher's Circle 8 ft Radius · Skinned Infield: Bogen mit 60 ft Radius UM DIE PLATE,
 *   also bis 103 ft ab Home — 18 ft hinter der zweiten Base · Zaun 215 ft · Backstop 25 ft
 *
 * Nicht massstaeblich und mit Absicht: Bases (15 in), Home Plate (17 in), Pitching Plate
 * (24×6 in) und die Spieler-Marker. Eine Base waere 0,6 % der Bildbreite — am Handy zwei
 * Pixel. Der Platz ist massstaeblich, die Objekte darauf sind es nicht.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const HOME: Point = { x: 155, y: 218 };

/** Base-Weg in Board-Einheiten. Grundlage fuer die Marker-Groesse. */
export const BASE_PATH = 60;

/** Halbe Diagonale: 60·√2 / 2 — die Bases liegen auf den Achsen durch Home. */
const HALF_DIAGONAL = (BASE_PATH * Math.SQRT2) / 2;

export const FIRST_BASE: Point = { x: HOME.x + HALF_DIAGONAL, y: HOME.y - HALF_DIAGONAL };
export const SECOND_BASE: Point = { x: HOME.x, y: HOME.y - BASE_PATH * Math.SQRT2 };
export const THIRD_BASE: Point = { x: HOME.x - HALF_DIAGONAL, y: HOME.y - HALF_DIAGONAL };

/** Reihenfolge wie der Runner laeuft: Home, 1, 2, 3. */
export const BASES: Point[] = [HOME, FIRST_BASE, SECOND_BASE, THIRD_BASE];

export const PITCHING_PLATE: Point = { x: HOME.x, y: HOME.y - 43 };
export const CIRCLE_RADIUS = 8;
export const SKIN_RADIUS = 60;
export const FENCE_RADIUS = 215;
export const BACKSTOP_RADIUS = 25;

/** Foul-Pfosten: 215 ft ab Home auf den 45-Grad-Linien. */
const POLE_OFFSET = FENCE_RADIUS / Math.SQRT2;
export const RIGHT_POLE: Point = { x: HOME.x + POLE_OFFSET, y: HOME.y - POLE_OFFSET };
export const LEFT_POLE: Point = { x: HOME.x - POLE_OFFSET, y: HOME.y - POLE_OFFSET };

/**
 * Wo der Sandbogen die Foul-Linie trifft.
 *
 * Schnittpunkt des Kreises um die Pitching Plate (Radius 60) mit der Linie y = x ab Home:
 * loest 2d² − 2·43·d + 43² − 60² = 0, ergibt rund 82 ft ab Home — also 22 ft hinter der
 * ersten Base. Der Sand hoert nicht an den Bases auf.
 */
const SKIN_ON_FOUL_LINE = (43 + Math.sqrt(2 * SKIN_RADIUS * SKIN_RADIUS - 43 * 43)) / 2;

export const SKIN_RIGHT: Point = { x: HOME.x + SKIN_ON_FOUL_LINE, y: HOME.y - SKIN_ON_FOUL_LINE };
export const SKIN_LEFT: Point = { x: HOME.x - SKIN_ON_FOUL_LINE, y: HOME.y - SKIN_ON_FOUL_LINE };

/** Fair Territory vom Home bis zum Zaun. */
export const FAIR_TERRITORY_PATH =
  `M${HOME.x},${HOME.y} L${RIGHT_POLE.x},${RIGHT_POLE.y} ` +
  `A${FENCE_RADIUS},${FENCE_RADIUS} 0 0,0 ${LEFT_POLE.x},${LEFT_POLE.y} Z`;

/** Skinned Infield: Bogen um die Pitching Plate, begrenzt von den Foul-Linien. */
export const SKIN_PATH =
  `M${HOME.x},${HOME.y} L${SKIN_RIGHT.x},${SKIN_RIGHT.y} ` +
  `A${SKIN_RADIUS},${SKIN_RADIUS} 0 0,0 ${SKIN_LEFT.x},${SKIN_LEFT.y} Z`;

export const FOUL_LINES_PATH =
  `M${HOME.x},${HOME.y} L${RIGHT_POLE.x},${RIGHT_POLE.y} ` +
  `M${HOME.x},${HOME.y} L${LEFT_POLE.x},${LEFT_POLE.y}`;

export const FENCE_PATH =
  `M${RIGHT_POLE.x},${RIGHT_POLE.y} ` +
  `A${FENCE_RADIUS},${FENCE_RADIUS} 0 0,0 ${LEFT_POLE.x},${LEFT_POLE.y}`;

/** Das ganze Feld inklusive Backstop — der Ausschnitt fuer Desktop und Tablet. */
export const FULL_FIELD: Box = {
  x: LEFT_POLE.x - 8,
  y: HOME.y - FENCE_RADIUS - 8,
  w: RIGHT_POLE.x - LEFT_POLE.x + 16,
  h: FENCE_RADIUS + BACKSTOP_RADIUS + 16,
};

export const POSITIONS = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'] as const;
export type PositionCode = (typeof POSITIONS)[number];

/**
 * Normalaufstellung. Ein-Tipp-Reset im Editor und Ausgangspunkt jedes neuen Plays.
 * Tiefen aus der Praxis: Infield knapp hinter den Base-Linien, Outfield auf 160 bis 185 ft.
 */
export const DEFAULT_DEFENSE: Record<PositionCode, Point> = {
  P: { x: HOME.x, y: PITCHING_PLATE.y + 7 },
  C: { x: HOME.x, y: HOME.y + 8 },
  '1B': { x: HOME.x + 36, y: HOME.y - 52 },
  '2B': { x: HOME.x + 22, y: HOME.y - 78 },
  SS: { x: HOME.x - 22, y: HOME.y - 78 },
  '3B': { x: HOME.x - 36, y: HOME.y - 52 },
  LF: { x: HOME.x - 90, y: HOME.y - 156 },
  CF: { x: HOME.x, y: HOME.y - 185 },
  RF: { x: HOME.x + 90, y: HOME.y - 156 },
};
