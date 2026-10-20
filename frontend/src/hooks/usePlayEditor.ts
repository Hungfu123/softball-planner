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
  /**
   * Zustand, nicht Ref: ein Blocker muss neu bewerten koennen, wenn sich das aendert.
   * Vorher haftete der Schutz am Fehlerzustand — waehrend der 800-ms-Entprellung und
   * waehrend einer haengenden Anfrage war also etwas ungesichert, ohne dass jemand
   * gewarnt haette. Genau am Platz ohne Netz haengt ein PUT gern dreissig Sekunden.
   */
  const [hatUngesichertes, setHatUngesichertes] = useState(false)
  const schmutzig = useRef(false)
  /** Fassung der Staende. Verhindert, dass eine aeltere Sicherung die neuere freispricht. */
  const fassung = useRef(0)
  const gesicherteFassung = useRef(0)
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

  const markiereSchmutzig = useCallback(() => {
    schmutzig.current = true
    fassung.current += 1
    setHatUngesichertes(true)
  }, [])

  const aendern = useCallback(
    (fn: (entwurf: PlayStep[]) => void, mitSchnappschuss = true) => {
      if (mitSchnappschuss) merken()
      setSteps(prev => {
        const entwurf = kopie(prev)
        fn(entwurf)
        return entwurf
      })
      markiereSchmutzig()
    },
    [merken, markiereSchmutzig],
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
      markiereSchmutzig()
    },
    [cur, markiereSchmutzig],
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
    markiereSchmutzig()
  }, [cur, merken, markiereSchmutzig])

  const duplicateStep = addStep

  const deleteStep = useCallback(
    (index: number) => {
      if (steps.length <= 1) return
      merken()
      setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, ordinal: i + 1 })))
      setCur(c => Math.max(0, Math.min(c, steps.length - 2)))
      markiereSchmutzig()
    },
    [merken, steps.length, markiereSchmutzig],
  )

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const letzter = prev[prev.length - 1]
      setSteps(letzter)
      setCur(c => Math.min(c, letzter.length - 1))
      markiereSchmutzig()
      return prev.slice(0, -1)
    })
  }, [markiereSchmutzig])

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
        if (status === 'ACTIVE') {
          // Zuruecknehmen heisst zuruecknehmen: die Folgestaende haben ihn beim Ausmachen
          // verloren, hier bekommen sie ihn zurueck — an der Stelle, an der er steht.
          for (let i = cur + 1; i < entwurf.length; i++) {
            const folge = entwurf[i].markers.runners
            if (runner && !folge.some(r => r.id === id)) {
              folge.push({ id, x: runner.x, y: runner.y, status: 'ACTIVE' })
            }
          }
          return
        }
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

  /** Bogen oder flach. Gilt fuer den Weg, der IN diesen Stand fuehrt. */
  const setBallTrajectory = useCallback(
    (trajectory: 'AIR' | 'GROUND') =>
      aendern(entwurf => void (entwurf[cur].markers.ball.trajectory = trajectory), false),
    [aendern, cur],
  )

  /** Ohne Schnappschuss: durchschalten ist selbst die Umkehr, das kostet keine Stufe. */
  const cycleDuration = useCallback(() => {
    aendern(entwurf => {
      const aktuell = entwurf[cur].durationMs
      const index = DAUERN.indexOf(aktuell as (typeof DAUERN)[number])
      entwurf[cur].durationMs = DAUERN[(index + 1) % DAUERN.length]
    }, false)
  }, [aendern, cur])

  const setOuts = useCallback(
    (outs: number) => aendern(entwurf => void (entwurf[cur].outs = outs), false),
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

  /**
   * Sichert und raeumt die Schmutz-Marke nur auf, wenn sich seit dem Abschicken nichts
   * geaendert hat. Ohne diesen Vergleich sprach eine aeltere, langsam zurueckkehrende
   * Sicherung die neuere Aenderung frei — und das Verlassen meldete Erfolg, obwohl der
   * letzte Zug nie beim Server war.
   */
  const sichere = useCallback(async (stand: PlayStep[]): Promise<boolean> => {
    const abgeschickt = fassung.current
    setSaveState('speichert')
    try {
      await save(stand)
      gesicherteFassung.current = Math.max(gesicherteFassung.current, abgeschickt)
      if (fassung.current === gesicherteFassung.current) {
        schmutzig.current = false
        setHatUngesichertes(false)
        setSaveState('gespeichert')
      }
      return fassung.current === gesicherteFassung.current
    } catch {
      setSaveState('fehler')
      return false
    }
  }, [save])

  /** Entprelltes Sichern. "speichert" steht nur, solange wirklich eine Anfrage laeuft. */
  useEffect(() => {
    if (!schmutzig.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await sichere(steps)
    }, 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [steps, sichere])

  /**
   * Sofort sichern, ohne auf die Entprellung zu warten.
   *
   * Noetig beim Verlassen des Editors: wer gleich nach einer Bewegung "Zurueck" tippt,
   * ueberholt sonst das Sichern und sieht in der Spieleransicht den alten Stand.
   */
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current)
    if (!schmutzig.current) return true
    return sichere(steps)
  }, [sichere, steps])

  const retrySave = useCallback(() => flushSave(), [flushSave])

  return {
    steps,
    cur,
    beginGesture,
    endGesture,
    /** true, solange etwas ungesichert ist — auch waehrend Entprellung und laufender Anfrage. */
    hatUngesichertes,
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
    setBallTrajectory,
    cycleDuration,
    setOuts,
    setNote,
  }
}
