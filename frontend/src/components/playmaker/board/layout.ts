import { BASE_PATH, HOME, type Box } from './geometry';
import type { PlayMarkers, PlayStep } from './types';

/** Rand um den Inhalt, in Fuss. */
export const PADDING = 20;

/** Darunter wird nicht gezoomt — ein Play mit drei Markern soll kein Mikroskop sein. */
export const MIN_CONTENT_WIDTH = 130;

const MARKER_SHARE_OF_BASE_PATH = 0.3;
const MARKER_MIN_PX = 26;
/** Vorschauen und Thumbnails: nur noch lesbar, nicht mehr treffbar. */
const MARKER_MIN_PX_STATIC = 6;
const MARKER_MAX_PX_TOUCH = 44;
const MARKER_MAX_PX_FINE = 56;

/**
 * Das umschliessende Rechteck ueber alle Marker aller Staende, plus Home, plus Rand.
 *
 * Home ist immer dabei, auch wenn dort niemand steht: ohne Home verliert das Bild seinen
 * Anker und man weiss nicht mehr, wohin man schaut.
 */
export function computeContentBox(steps: PlayStep[]): Box {
  let minX = HOME.x;
  let maxX = HOME.x;
  let minY = HOME.y;
  let maxY = HOME.y;

  const beruecksichtige = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  for (const step of steps) {
    step.markers.defenders.forEach((d) => beruecksichtige(d.x, d.y));
    step.markers.runners.forEach((r) => beruecksichtige(r.x, r.y));
    beruecksichtige(step.markers.ball.x, step.markers.ball.y);
  }

  let x = minX - PADDING;
  const y = minY - PADDING;
  let w = maxX - minX + 2 * PADDING;
  const h = maxY - minY + 2 * PADDING;

  if (w < MIN_CONTENT_WIDTH) {
    x -= (MIN_CONTENT_WIDTH - w) / 2;
    w = MIN_CONTENT_WIDTH;
  }

  return { x, y, w, h };
}

/**
 * Zieht den Ausschnitt auf das Seitenverhaeltnis der Flaeche AUF — nie zu.
 *
 * Damit fuellt das Feld seine Flaeche vollstaendig (kein leerer Streifen) und es geht
 * nichts verloren; der Zuwachs ist schlicht mehr Platz, und Platz ist hier Gras. Der
 * Umweg ueber Beschneiden hat im Entwurf bei 390 px Breite 38 ft je Seite gekostet —
 * LF und RF waren komplett weg.
 *
 * Home bleibt unten verankert: waechst die Hoehe, waechst sie nach oben, weil dort das
 * Outfield liegt und unten das Play anfaengt.
 */
export function fitViewBox(box: Box, areaWidth: number, areaHeight: number): { viewBox: Box; scale: number } {
  if (areaWidth <= 0 || areaHeight <= 0) {
    return { viewBox: box, scale: 1 };
  }

  const areaAspect = areaWidth / areaHeight;
  const boxAspect = box.w / box.h;

  let { x, y, w, h } = box;

  if (boxAspect < areaAspect) {
    const neu = h * areaAspect;
    x -= (neu - w) / 2;
    w = neu;
  } else {
    const neu = w / areaAspect;
    y -= neu - h;
    h = neu;
  }

  return { viewBox: { x, y, w, h }, scale: areaWidth / w };
}

/**
 * Radius eines Markers in Board-Einheiten.
 *
 * Der sichtbare Durchmesser ist 30 % der Base-Weg-Laenge auf dem Schirm. Starre 44 px
 * waren bei 320 px Geraetebreite 46 % des Base-Wegs — das Infield verstopfte, 3B
 * verschwand hinter Runner und Ball. Die Obergrenze haengt am Zeigegeraet: am Finger
 * zaehlt die Trefferflaeche, an Maus und Trackpad die Lesbarkeit.
 */
export function markerRadius(scale: number, pointerFine: boolean, interactive = true): number {
  const basePathPx = BASE_PATH * scale;
  const max = pointerFine ? MARKER_MAX_PX_FINE : MARKER_MAX_PX_TOUCH;
  // Die Untergrenze ist eine Trefferflaechen-Regel. Auf einer 64-px-Vorschau, die niemand
  // antippt, macht sie die Marker groesser als das Infield — dort gilt sie nicht.
  const min = interactive ? MARKER_MIN_PX : MARKER_MIN_PX_STATIC;
  const durchmesserPx = Math.max(min, Math.min(max, basePathPx * MARKER_SHARE_OF_BASE_PATH));
  return durchmesserPx / 2 / scale;
}

/** Trefferflaeche in Board-Einheiten — immer mindestens 44 px, auch wenn der Marker kleiner ist. */
export function hitRadius(scale: number): number {
  return 22 / scale;
}

/**
 * Ein gehaltener Ball sitzt auf der Kante der Scheibe, nicht in ihrer Mitte.
 *
 * Mittig waere er unsichtbar: er traegt keine Kontur und die Scheibe ist dunkel. Auf der
 * Kante bricht seine Silhouette den Kreis auf und man sieht, wer ihn hat.
 *
 * Steht hier und nicht im Board, weil der Editor dieselbe Stelle braucht: er muss den
 * Ball dort treffen, wo er GEZEICHNET wird. Eine Datei, die Komponenten exportiert, soll
 * daneben keine Funktionen exportieren — sonst verliert Fast Refresh den Faden.
 */
export function ballAnchor(markers: PlayMarkers, radius: number): { x: number; y: number } {
  if (!markers.ball.holder) return { x: markers.ball.x, y: markers.ball.y };
  const halter = markers.defenders.find((d) => d.position === markers.ball.holder);
  if (!halter) return { x: markers.ball.x, y: markers.ball.y };
  // Nach rechts oben, weil dort am seltensten ein zweiter Marker steht.
  const winkel = -Math.PI / 4;
  return { x: halter.x + Math.cos(winkel) * radius, y: halter.y + Math.sin(winkel) * radius };
}
