import { useMemo, useRef, useState } from 'react'
import { BASES, FULL_FIELD } from './board/geometry'
import { ballAnchor, computeContentBox, fitViewBox, hitRadius, markerRadius } from './board/layout'
import type { MarkerRef, PlayMarkers, PlayStep } from './board/types'

/** Wie weit der gegriffene Marker ueber die Fingerkuppe springt, in CSS-Pixeln. */
const LIFT_PX = 28

/** Wie nah ein Marker an einer Base liegen muss, um einzurasten. In Fuss. */
export const SNAP_RADIUS = 12

interface Optionen {
  /** Die Marker, auf die getroffen wird. */
  markers: PlayMarkers
  /** Fuer den Zuschnitt: alle Staende, nicht nur der gezeigte. */
  steps: PlayStep[]
  vollesFeld: boolean
  groesse: { w: number; h: number }
  pointerFine: boolean
  flaeche: React.RefObject<HTMLDivElement | null>
  beginGesture: () => void
  endGesture: () => void
  moveMarker: (ref: MarkerRef, x: number, y: number) => void
  dropMarker: (ref: MarkerRef, x: number, y: number) => void
  /** Antippen ohne Bewegung — das ist keine Verschiebung, sondern eine Frage. */
  onTapRunner?: (id: string) => void
  onTapBall?: () => void
}

/**
 * Marker mit dem Finger greifen, ziehen, einrasten lassen.
 *
 * Eine Stelle fuer alle Boards, die man bedienen kann — Editor und freies Feld. Vorher
 * lag das nur im Editor; beim zweiten Board waere es kopiert worden und danach
 * auseinandergelaufen. Die Feinheiten, die hier stecken, moechte man nicht zweimal
 * pflegen: der Griff ueber der Fingerkuppe, das Einfrieren des Zuschnitts, die
 * Trefferflaeche des gehaltenen Balls, der zweite Finger, die abgebrochene Geste.
 */
export function useBoardGesten({
  markers,
  steps,
  vollesFeld,
  groesse,
  pointerFine,
  flaeche,
  beginGesture,
  endGesture,
  moveMarker,
  dropMarker,
  onTapRunner,
  onTapBall,
}: Optionen) {
  const [drag, setDrag] = useState<{ ref: MarkerRef; dx: number; dy: number } | null>(null)
  const [hint, setHint] = useState<{ x: number; y: number; snapped: boolean } | null>(null)
  const bewegt = useRef(false)
  /** Nur ein Finger zieht. Ein zweiter wuerde sonst den ersten uebernehmen. */
  const zeigerId = useRef<number | null>(null)

  /**
   * Der Zuschnitt wird waehrend des Ziehens eingefroren. Rechnet man ihn laufend neu,
   * wandert das Bild unter dem Finger und man trifft nichts mehr. Eingefroren wird im
   * Zustand, nicht in einem Ref: waehrend des Renderns liest hier niemand ein Ref.
   */
  const [eingefroren, setEingefroren] = useState<ReturnType<typeof fitViewBox> | null>(null)

  const berechnet = useMemo(
    () =>
      fitViewBox(
        vollesFeld ? FULL_FIELD : computeContentBox(steps),
        Math.max(1, groesse.w),
        Math.max(1, groesse.h),
      ),
    [steps, groesse.w, groesse.h, vollesFeld],
  )
  const geometrie = eingefroren ?? berechnet

  const zuBoard = (clientX: number, clientY: number) => {
    const rect = flaeche.current!.getBoundingClientRect()
    return {
      x: geometrie.viewBox.x + (clientX - rect.left) / geometrie.scale,
      y: geometrie.viewBox.y + (clientY - rect.top) / geometrie.scale,
    }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (zeigerId.current !== null) return
    const p = zuBoard(e.clientX, e.clientY)
    const reichweite = Math.max(hitRadius(geometrie.scale), 1)

    type Treffer = { ref: MarkerRef; d: number; x: number; y: number }
    let best: Treffer | null = null
    const pruefe = (ref: MarkerRef, x: number, y: number) => {
      const d = Math.hypot(p.x - x, p.y - y)
      if (best === null || d < best.d) best = { ref, d, x, y } satisfies Treffer
    }
    markers.defenders.forEach(d => pruefe({ kind: 'defender', position: d.position }, d.x, d.y))
    // Auch OUT-Runner: sie sind gezeichnet. Wer sich vertippt hat, muss sie wieder
    // erreichen koennen — sonst hilft nur Rueckgaengig, und nach fuenf Zuegen nichts mehr.
    markers.runners.filter(r => r.status !== 'SCORED').forEach(r => pruefe({ kind: 'runner', id: r.id }, r.x, r.y))

    // Der Ball wird dort geprueft, wo er GEZEICHNET wird — bei einem gehaltenen Ball ist
    // das die Kante der Scheibe, nicht ihr Mittelpunkt. In den Daten liegt er genau auf
    // seinem Halter; ohne das hier gewinnt immer der Verteidiger mit Abstand 0, und der
    // Ball liesse sich nie aus der Hand nehmen — man koennte keinen Wurf zeigen.
    const r = markerRadius(geometrie.scale, pointerFine)
    const ballStelle = ballAnchor(markers, r)
    const ballAbstand = Math.hypot(p.x - ballStelle.x, p.y - ballStelle.y)
    if (!best || ballAbstand < (best as Treffer).d + r * 0.9) {
      best = { ref: { kind: 'ball' }, d: ballAbstand, x: ballStelle.x, y: ballStelle.y } satisfies Treffer
    }

    const treffer = best as Treffer | null
    if (!treffer || treffer.d > reichweite) return
    /**
     * Der Griff darf am Einfangen nicht scheitern.
     *
     * setPointerCapture wirft NotFoundError, wenn der Zeiger nicht (mehr) aktiv ist — in
     * Safari-Randfaellen und immer dann, wenn das Ereignis nicht von einem echten Finger
     * kommt. Ohne das try/catch fliegt der Fehler mitten aus pointerdown heraus und der
     * Zug faengt gar nicht erst an. Ohne Einfangen zieht es sich etwas schlechter, wenn
     * der Finger das Board verlaesst — aber es zieht.
     */
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Weiter ohne Einfangen.
    }
    zeigerId.current = e.pointerId
    beginGesture()
    bewegt.current = false
    setEingefroren(berechnet)
    setDrag({ ref: treffer.ref, dx: treffer.x - p.x, dy: treffer.y - p.y })
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || e.pointerId !== zeigerId.current) return
    const p = zuBoard(e.clientX, e.clientY)
    bewegt.current = true
    const lift = LIFT_PX / geometrie.scale
    const x = p.x + drag.dx
    const y = p.y + drag.dy - lift
    moveMarker(drag.ref, x, y)

    const ziel =
      drag.ref.kind === 'runner'
        ? BASES.find(b => Math.hypot(b.x - x, b.y - y) < SNAP_RADIUS)
        : drag.ref.kind === 'ball'
          ? markers.defenders.find(d => Math.hypot(d.x - x, d.y - y) < SNAP_RADIUS)
          : undefined
    setHint({ x: ziel?.x ?? x, y: ziel?.y ?? y, snapped: Boolean(ziel) })
  }

  const aufraeumen = () => {
    setDrag(null)
    setHint(null)
    setEingefroren(null)
    zeigerId.current = null
    endGesture()
  }

  /** Abbruch (zweiter Finger, Rand-Geste, Kontextmenue): aufraeumen wie beim Loslassen. */
  const onPointerCancel = () => aufraeumen()

  const onPointerUp = () => {
    if (!drag) return
    if (!bewegt.current && drag.ref.kind === 'runner') onTapRunner?.(drag.ref.id)
    if (!bewegt.current && drag.ref.kind === 'ball') onTapBall?.()
    if (hint) dropMarker(drag.ref, hint.x, hint.y)
    aufraeumen()
  }

  return {
    /** Was dem Board durchgereicht wird. */
    boardProps: {
      viewBoxOverride: eingefroren?.viewBox ?? null,
      dropHint: hint,
      dragging: drag?.ref ?? null,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    geometrie,
  }
}
