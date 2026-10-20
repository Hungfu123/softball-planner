import { useCallback, useEffect, useRef, useState } from 'react'
import { BASES, DEFAULT_DEFENSE, HOME, POSITIONS } from '@/components/playmaker/board/geometry'
import type { MarkerRef, Play, PlayStep } from '@/components/playmaker/board/types'

/** Fuenf Stufen. Fingerbedienung produziert Fehlgriffe, eine Stufe reicht dafuer nicht. */
const UNDO_TIEFE = 5

const DAUERN = [1200, 2000, 600] as const

/** Wie nah ein Marker an einer Base liegen muss, um einzurasten. In Fuss. */
export const SNAP_RADIUS = 12

export type SaveState = 'gespeichert' | 'speichert' | 'fehler'

const kopie = <T,>(wert: T): T => JSON.parse(JSON.stringify(wert))

/**
 * Der Zustand des Editors.
 *
 * Jede Aenderung legt vorher eine Kopie auf den Rueckgaengig-Stapel — beim GREIFEN, nicht
 * beim Loslassen, sonst fehlt der Stand vor der Bewegung.
 */
export function usePlayEditor(play: Play, save: (steps: PlayStep[]) => Promise<void>) {
  const [steps, setSteps] = useState<PlayStep[]>(() => kopie(play.steps))
  const [cur, setCur] = useState(0)
  const [undoStack, setUndoStack] = useState<PlayStep[][]>([])
  const [saveState, setSaveState] = useState<SaveState>('gespeichert')
  const schmutzig = useRef(false)
  const gesteMerkte = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const merken = useCallback(() => {
    setUndoStack(prev => [...prev, kopie(steps)].slice(-UNDO_TIEFE))
  }, [steps])

  /**
   * Eine zusammenhaengende Geste beginnt — genau hier wird fuer Rueckgaengig gemerkt.
   *
   * Nicht in jedem Schritt der Bewegung: ein Zug ueber das Feld loest Dutzende
   * pointermove-Ereignisse aus, und der Stapel waere danach voll Mikroschritte. Ein Undo
   * haette dann nur ein paar Pixel zurueckgenommen.
   */
  const beginGesture = useCallback(() => {
    gesteMerkte.current = false
  }, [])

  /**
   * Der Schnappschuss entsteht beim ERSTEN echten Schritt der Geste, nicht beim Greifen.
   * Wer einen Marker nur antippt, ohne ihn zu bewegen, soll keine Rueckgaengig-Stufe
   * verbrauchen — sonst sind nach fuenf Fehlgriffen alle fuenf Stufen leer.
   */
  const merkeEinmalProGeste = useCallback(() => {
    if (gesteMerkte.current) return
    gesteMerkte.current = true
    merken()
  }, [merken])

  const endGesture = useCallback(() => {
    gesteMerkte.current = false
  }, [])

  const aendern = useCallback(
    (fn: (entwurf: PlayStep[]) => void, mitSchnappschuss = true) => {
      if (mitSchnappschuss) merken()
      setSteps(prev => {
        const entwurf = kopie(prev)
        fn(entwurf)
        return entwurf
      })
      schmutzig.current = true
    },
    [merken],
  )

  /** Verschiebt einen Marker im aktuellen Stand. Einrasten passiert beim Loslassen. */
  const moveMarker = useCallback(
    (ref: MarkerRef, x: number, y: number) => {
      merkeEinmalProGeste()
      aendern(entwurf => {
        const marker = entwurf[cur].markers
        if (ref.kind === 'defender') {
          const d = marker.defenders.find(n => n.position === ref.position)
          if (d) {
            d.x = x
            d.y = y
          }
          if (marker.ball.holder === ref.position) {
            marker.ball.x = x
            marker.ball.y = y
          }
        } else if (ref.kind === 'runner') {
          const r = marker.runners.find(n => n.id === ref.id)
          if (r) {
            r.x = x
            r.y = y
          }
        } else {
          marker.ball.x = x
          marker.ball.y = y
          marker.ball.holder = null
          marker.ball.state = 'LOOSE'
        }
      }, false)
    },
    [aendern, cur, merkeEinmalProGeste],
  )

  /**
   * Beim Loslassen einrasten: Runner an Bases, Ball an Verteidiger.
   * Ein gehaltener Ball bekommt wieder einen Halter und damit die Kantendarstellung.
   */
  const dropMarker = useCallback(
    (ref: MarkerRef, x: number, y: number) => {
      setSteps(prev => {
        const entwurf = kopie(prev)
        const marker = entwurf[cur].markers
        if (ref.kind === 'runner') {
          const r = marker.runners.find(n => n.id === ref.id)
          if (r) {
            const base = BASES.find(b => Math.hypot(b.x - x, b.y - y) < SNAP_RADIUS)
            r.x = base?.x ?? x
            r.y = base?.y ?? y
          }
        } else if (ref.kind === 'ball') {
          const halter = marker.defenders.find(d => Math.hypot(d.x - x, d.y - y) < SNAP_RADIUS)
          marker.ball.x = halter?.x ?? x
          marker.ball.y = halter?.y ?? y
          marker.ball.holder = halter?.position ?? null
          marker.ball.state = halter ? 'IN_HAND' : 'LOOSE'
        }
        return entwurf
      })
      schmutzig.current = true
    },
    [cur],
  )

  const addStep = useCallback(() => {
    merken()
    setSteps(prev => {
      const entwurf = kopie(prev)
      const neu = kopie(entwurf[cur])
      neu.id = undefined
      entwurf.splice(cur + 1, 0, neu)
      return entwurf.map((s, i) => ({ ...s, ordinal: i + 1 }))
    })
    setCur(c => c + 1)
    schmutzig.current = true
  }, [cur, merken])

  const duplicateStep = addStep

  const deleteStep = useCallback(
    (index: number) => {
      if (steps.length <= 1) return
      merken()
      setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, ordinal: i + 1 })))
      setCur(c => Math.max(0, Math.min(c, steps.length - 2)))
      schmutzig.current = true
    },
    [merken, steps.length],
  )

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const letzter = prev[prev.length - 1]
      setSteps(letzter)
      setCur(c => Math.min(c, letzter.length - 1))
      schmutzig.current = true
      return prev.slice(0, -1)
    })
  }, [])

  const resetDefense = useCallback(() => {
    aendern(entwurf => {
      entwurf[cur].markers.defenders = POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] }))
    })
  }, [aendern, cur])

  const addRunner = useCallback(() => {
    aendern(entwurf => {
      const marker = entwurf[cur].markers
      const naechste = `r${Date.now().toString(36)}${marker.runners.length}`
      marker.runners.push({ id: naechste, x: HOME.x, y: HOME.y, status: 'ACTIVE' })
    })
  }, [aendern, cur])

  /**
   * Setzt einen Runner auf OUT oder SCORED oder entfernt ihn ganz.
   *
   * Ohne das liess sich kein Rundown, keine Bunt-Defense und kein First-and-Third zu Ende
   * bauen — also jede Kategorie, deren Plays mit einem Out enden. Der Marker bleibt im
   * Stand stehen (durchgestrichen) und fehlt erst im naechsten: so sieht man den Tag noch,
   * statt dass der Runner eine halbe Sekunde vorher verschwindet.
   */
  const setRunnerStatus = useCallback(
    (id: string, status: 'ACTIVE' | 'OUT' | 'SCORED') => {
      aendern(entwurf => {
        const runner = entwurf[cur].markers.runners.find(r => r.id === id)
        if (runner) runner.status = status
        // Ab dem naechsten Stand ist er weg.
        for (let i = cur + 1; i < entwurf.length; i++) {
          entwurf[i].markers.runners = entwurf[i].markers.runners.filter(r => r.id !== id)
        }
      })
    },
    [aendern, cur],
  )

  /** Entfernt einen Runner aus diesem und allen folgenden Staenden. */
  const removeRunner = useCallback(
    (id: string) => {
      aendern(entwurf => {
        for (let i = cur; i < entwurf.length; i++) {
          entwurf[i].markers.runners = entwurf[i].markers.runners.filter(r => r.id !== id)
        }
      })
    },
    [aendern, cur],
  )

  const cycleDuration = useCallback(() => {
    aendern(entwurf => {
      const aktuell = entwurf[cur].durationMs
      const index = DAUERN.indexOf(aktuell as (typeof DAUERN)[number])
      entwurf[cur].durationMs = DAUERN[(index + 1) % DAUERN.length]
    })
  }, [aendern, cur])

  const setOuts = useCallback(
    (outs: number) => aendern(entwurf => void (entwurf[cur].outs = outs)),
    [aendern, cur],
  )

  /**
   * Ohne Schnappschuss: eine Notiz von zwoelf Zeichen haette sonst zwoelf Tiefenkopien
   * auf den Stapel gelegt und die fuenf Stufen komplett geleert.
   */
  const setNote = useCallback(
    (note: string) => aendern(entwurf => void (entwurf[cur].note = note), false),
    [aendern, cur],
  )

  /** Entprelltes Sichern. "speichert" steht nur, solange wirklich eine Anfrage laeuft. */
  useEffect(() => {
    if (!schmutzig.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaveState('speichert')
      try {
        await save(steps)
        schmutzig.current = false
        setSaveState('gespeichert')
      } catch {
        setSaveState('fehler')
      }
    }, 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [steps, save])

  /**
   * Sofort sichern, ohne auf die Entprellung zu warten.
   *
   * Noetig beim Verlassen des Editors: wer gleich nach einer Bewegung "Zurueck" tippt,
   * ueberholt sonst das Sichern und sieht in der Spieleransicht den alten Stand.
   */
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current)
    if (!schmutzig.current) return true
    setSaveState('speichert')
    try {
      await save(steps)
      schmutzig.current = false
      setSaveState('gespeichert')
      return true
    } catch {
      setSaveState('fehler')
      return false
    }
  }, [save, steps])

  const retrySave = useCallback(() => flushSave(), [flushSave])

  return {
    steps,
    cur,
    beginGesture,
    endGesture,
    /** true, solange noch etwas ungesichert ist. */
    get hatUngesichertes() {
      return schmutzig.current
    },
    setCur,
    step: steps[cur],
    saveState,
    retrySave,
    flushSave,
    canUndo: undoStack.length > 0,
    moveMarker,
    dropMarker,
    addStep,
    duplicateStep,
    deleteStep,
    undo,
    resetDefense,
    addRunner,
    setRunnerStatus,
    removeRunner,
    cycleDuration,
    setOuts,
    setNote,
  }
}
