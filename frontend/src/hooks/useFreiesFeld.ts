import { useCallback, useEffect, useRef, useState } from 'react'
import { BASES, DEFAULT_DEFENSE, FULL_FIELD, HOME, POSITIONS } from '@/components/playmaker/board/geometry'
import type { MarkerRef, PlayMarkers } from '@/components/playmaker/board/types'
import { SNAP_RADIUS } from '@/components/playmaker/useBoardGesten'

const SPEICHER = 'playmaker-freies-feld'

/** Fuenf Stufen, wie im Editor. Fingerbedienung produziert Fehlgriffe. */
const UNDO_TIEFE = 5

const kopie = <T,>(wert: T): T => JSON.parse(JSON.stringify(wert))

/** Rand, der innerhalb des Feldes frei bleibt, damit ein Marker nie halb abgeschnitten ist. */
const RAND = 10

/**
 * Haelt einen Marker im sichtbaren Feld.
 *
 * Ohne das liess sich der Ball hinter den Zaun ziehen: das freie Feld zeigt den ganzen
 * Platz mit festem Ausschnitt, also war er danach nicht mehr da — und damit auch nicht
 * mehr greifbar. Im Editor faellt das nicht auf, weil der Zuschnitt dort dem Inhalt folgt
 * und mitwaechst.
 */
function insFeld(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(FULL_FIELD.x + FULL_FIELD.w - RAND, Math.max(FULL_FIELD.x + RAND, x)),
    y: Math.min(FULL_FIELD.y + FULL_FIELD.h - RAND, Math.max(FULL_FIELD.y + RAND, y)),
  }
}

/**
 * Die Ausgangslage: neun Verteidiger, keine Runner, Ball an HOME.
 *
 * Der Ball liegt NICHT beim Pitcher wie in einem Play, sondern an der Platte. Das freie
 * Feld faengt beim Schlag an: von dort zieht man ihn in die Richtung, ueber die man
 * gerade redet.
 */
export function standardfeld(): PlayMarkers {
  return {
    defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
    runners: [],
    ball: { state: 'LOOSE', holder: null, x: HOME.x, y: HOME.y, trajectory: 'AIR' },
  }
}

interface Zustand {
  markers: PlayMarkers
  /** Wo der Ball lag, bevor er zuletzt bewegt wurde — Anfang der gestrichelten Bahn. */
  ballVorher: { x: number; y: number } | null
  /** Die Bahn davor, blass. So ist eine Kette aus zwei Wuerfen lesbar. */
  ballDavor: { x: number; y: number } | null
}

function frisch(): Zustand {
  return { markers: standardfeld(), ballVorher: null, ballDavor: null }
}

/**
 * Liest den Stand aus dem Geraet.
 *
 * Fehlt er, ist er kaputt oder gesperrt (privates Fenster), faengt das Feld frisch an —
 * das ist immer eine brauchbare Antwort. Geprueft wird nur grob: ob neun Verteidiger und
 * ein Ball da sind. Wer die Daten von Hand verbiegt, bekommt ein frisches Feld, keinen
 * Absturz mitten in der Pause.
 */
function lies(): Zustand {
  try {
    const roh = localStorage.getItem(SPEICHER)
    if (!roh) return frisch()
    const gelesen = JSON.parse(roh) as Zustand
    const m = gelesen?.markers
    if (!m || !Array.isArray(m.defenders) || m.defenders.length !== 9 || !m.ball || !Array.isArray(m.runners)) {
      return frisch()
    }
    return gelesen
  } catch {
    return frisch()
  }
}

/**
 * Das freie Feld: ein Board zum Draufzeigen, das nichts im Katalog anlegt.
 *
 * Der Stand liegt im Geraet, nicht auf dem Server — deshalb funktioniert es ohne Netz,
 * auch beim allerersten Mal, und deshalb ueberlebt es das Schliessen der App. "Nicht
 * gespeichert" heisst hier NICHT im Katalog, nicht weg beim Zumachen.
 */
export function useFreiesFeld() {
  const [zustand, setZustand] = useState<Zustand>(lies)
  const [undoStack, setUndoStack] = useState<Zustand[]>([])
  const gesteMerkte = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(zustand))
    } catch {
      // Gesperrter Speicher: dann haelt der Stand eben nur, solange die Seite offen ist.
    }
  }, [zustand])

  const merken = useCallback(() => {
    setUndoStack(prev => [...prev, kopie(zustand)].slice(-UNDO_TIEFE))
  }, [zustand])

  /**
   * Der Schnappschuss entsteht beim ERSTEN echten Schritt einer Geste, nicht beim
   * Greifen: ein Antippen ohne Bewegung soll keine Stufe verbrauchen, und ein Zug ueber
   * das Feld soll nicht Dutzende Mikroschritte hinterlassen.
   */
  /** Wo der Ball lag, als die Geste anfing — der Anfang der Bahn, die gleich entsteht. */
  const ballStart = useRef<{ x: number; y: number } | null>(null)
  const ballVerschoben = useRef(false)

  const beginGesture = useCallback(() => {
    gesteMerkte.current = false
    ballVerschoben.current = false
    ballStart.current = { x: zustand.markers.ball.x, y: zustand.markers.ball.y }
  }, [zustand])
  const endGesture = useCallback(() => {
    gesteMerkte.current = false
  }, [])
  const merkeEinmalProGeste = useCallback(() => {
    if (gesteMerkte.current) return
    gesteMerkte.current = true
    merken()
  }, [merken])

  const aendern = useCallback((fn: (entwurf: Zustand) => void) => {
    setZustand(prev => {
      const entwurf = kopie(prev)
      fn(entwurf)
      return entwurf
    })
  }, [])

  const moveMarker = useCallback(
    (ref: MarkerRef, rohX: number, rohY: number) => {
      const { x, y } = insFeld(rohX, rohY)
      merkeEinmalProGeste()
      /**
       * Die Entscheidung faellt HIER, nicht in der Updater-Funktion.
       *
       * React ruft Updater im Entwicklungsmodus doppelt auf. Stand das Merken des
       * Bahn-Anfangs darin, setzte der erste Durchlauf das Flag und der zweite
       * uebersprang die Zuweisung — und der zweite ist der, dessen Ergebnis React behaelt.
       * Die Bahn blieb dadurch unsichtbar. Updater muessen rein bleiben.
       */
      const bahnAnfang =
        ref.kind === 'ball' && !ballVerschoben.current && ballStart.current ? ballStart.current : null
      if (bahnAnfang) ballVerschoben.current = true

      aendern(entwurf => {
        const m = entwurf.markers
        if (ref.kind === 'defender') {
          const d = m.defenders.find(n => n.position === ref.position)
          if (d) {
            d.x = x
            d.y = y
          }
          if (m.ball.holder === ref.position) {
            m.ball.x = x
            m.ball.y = y
          }
        } else if (ref.kind === 'runner') {
          const r = m.runners.find(n => n.id === ref.id)
          if (r) {
            r.x = x
            r.y = y
          }
        } else {
          // Der Ball verlaesst die Hand, sobald man ihn anfasst — sonst liesse sich kein
          // Wurf zeigen.
          //
          // Die Bahn beginnt da, wo er lag, als die Geste anfing. Festgehalten wird das
          // einmal je Geste: waehrend des Ziehens kommen Dutzende Ereignisse, und ab dem
          // zweiten waere "wo er vorher lag" schon die Stelle von eben. Dabei rutscht die
          // bisherige Bahn eine Stufe nach hinten und wird blass — so bleibt eine Kette
          // aus zwei Wuerfen lesbar.
          if (bahnAnfang) {
            entwurf.ballDavor = entwurf.ballVorher
            entwurf.ballVorher = bahnAnfang
          }
          m.ball.x = x
          m.ball.y = y
          m.ball.holder = null
          m.ball.state = 'LOOSE'
        }
      })
    },
    [aendern, merkeEinmalProGeste],
  )

  const dropMarker = useCallback(
    (ref: MarkerRef, rohX: number, rohY: number) => {
      const { x, y } = insFeld(rohX, rohY)
      aendern(entwurf => {
        const m = entwurf.markers
        if (ref.kind === 'runner') {
          const r = m.runners.find(n => n.id === ref.id)
          if (r) {
            const base = BASES.find(b => Math.hypot(b.x - x, b.y - y) < SNAP_RADIUS)
            r.x = base?.x ?? x
            r.y = base?.y ?? y
          }
        } else if (ref.kind === 'ball') {
          const halter = m.defenders.find(d => Math.hypot(d.x - x, d.y - y) < SNAP_RADIUS)
          m.ball.x = halter?.x ?? x
          m.ball.y = halter?.y ?? y
          m.ball.holder = halter?.position ?? null
          m.ball.state = halter ? 'IN_HAND' : 'LOOSE'
        }
      })
    },
    [aendern],
  )

  /** Runner an einer Base setzen oder, wenn dort schon einer steht, wegnehmen. */
  const toggleBase = useCallback(
    (index: number) => {
      merken()
      aendern(entwurf => {
        const base = BASES[index]
        const da = entwurf.markers.runners.find(r => Math.hypot(r.x - base.x, r.y - base.y) < SNAP_RADIUS)
        if (da) {
          entwurf.markers.runners = entwurf.markers.runners.filter(r => r.id !== da.id)
        } else {
          entwurf.markers.runners.push({
            id: `f${Date.now().toString(36)}${entwurf.markers.runners.length}`,
            x: base.x,
            y: base.y,
            status: 'ACTIVE',
          })
        }
      })
    },
    [aendern, merken],
  )

  /** Angetippter Runner verschwindet. Auf dem freien Feld gibt es keine Outs. */
  const removeRunner = useCallback(
    (id: string) => {
      merken()
      aendern(entwurf => {
        entwurf.markers.runners = entwurf.markers.runners.filter(r => r.id !== id)
      })
    },
    [aendern, merken],
  )

  const reset = useCallback(() => {
    merken()
    setZustand(frisch())
  }, [merken])

  const undo = useCallback(() => {
    // Beide Zustaende getrennt setzen. Ein setState in der Updater-Funktion eines anderen
    // waere unrein und liefe im Entwicklungsmodus doppelt.
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      return prev.slice(0, -1)
    })
    setZustand(prev => (undoStack.length === 0 ? prev : undoStack[undoStack.length - 1]))
  }, [undoStack])

  return {
    markers: zustand.markers,
    ballVorher: zustand.ballVorher,
    ballDavor: zustand.ballDavor,
    canUndo: undoStack.length > 0,
    beginGesture,
    endGesture,
    moveMarker,
    dropMarker,
    toggleBase,
    removeRunner,
    reset,
    undo,
  }
}
