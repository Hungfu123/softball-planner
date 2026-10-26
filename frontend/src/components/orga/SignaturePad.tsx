import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/shared'

/**
 * Unterschrift mit dem Finger — einmal, dann steht sie in jeder Abrechnung.
 *
 * Die Leinwand hat eine **feste** Groesse (600 × 200) und wird per CSS auf die
 * Breite gezogen; die Zeigerposition rechnet sich ueber das Verhaeltnis um. Vorher
 * richtete sie sich nach `clientWidth` — stand sie beim Aufbau mit Breite 0 da
 * (Sheet faehrt gerade ein, Karte noch nicht gemessen), war sie 0 Pixel breit, jeder
 * Strich ging ins Leere und `toDataURL` lieferte ein leeres Bild. Gespeichert wurde
 * dann nichts, ohne dass man es sah.
 *
 * Heraus kommt ein PNG als Data-URL, durchsichtig wo nichts gezeichnet wurde —
 * sonst saesse ein weisser Kasten ueber dem Formular.
 */
const BREITE = 600
const HOEHE = 200

export function SignaturePad({ value, onChange }: {
  value: string | null
  onChange: (png: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnet = useRef(false)
  const [leer, setLeer] = useState(!value)

  // Nur beim Aufbau und wenn von aussen eine andere Unterschrift kommt. Nicht bei
  // jedem Strich: `canvas.width` zu setzen loescht die Leinwand.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = BREITE
    canvas.height = HOEHE
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#193253'
    if (!value) return
    const bild = new Image()
    bild.onload = () => ctx.drawImage(bild, 0, 0, BREITE, HOEHE)
    bild.src = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * BREITE,
      y: ((e.clientY - box.top) / box.height) * HOEHE,
    }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    zeichnet.current = true
    const { x, y } = punkt(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    // Ein Tipp ohne Zug soll auch einen Punkt setzen, nicht nur ein Zug.
    ctx.lineTo(x, y)
    ctx.stroke()
    setLeer(false)
  }

  const zieh = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zeichnet.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = punkt(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const ende = () => {
    if (!zeichnet.current) return
    zeichnet.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const loeschen = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setLeer(true)
    onChange(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Unterschrift
        </span>
        <Button variant="ghost" size="sm" type="button" onClick={loeschen} disabled={leer}>
          Neu zeichnen
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Feld zum Unterschreiben"
        role="img"
        onPointerDown={start}
        onPointerMove={zieh}
        onPointerUp={ende}
        onPointerCancel={ende}
        onPointerLeave={ende}
        // Ohne das scrollt die Seite unter dem Finger weg, statt zu zeichnen.
        style={{ touchAction: 'none', aspectRatio: `${BREITE} / ${HOEHE}` }}
        className="w-full rounded-xl border border-dashed border-cream-300 bg-white cursor-crosshair"
      />
      <p className="text-[11px] text-gray-500 mt-1">
        {leer
          ? 'Mit dem Finger oder der Maus unterschreiben, dann unten speichern.'
          : 'Sieht gut aus — jetzt unten speichern, dann steht sie in jeder Abrechnung.'}
      </p>
    </div>
  )
}
