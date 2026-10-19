import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/shared'

/**
 * Unterschrift mit dem Finger — einmal, dann steht sie in jeder Abrechnung.
 *
 * Gezeichnet wird auf einer Leinwand in doppelter Aufloesung, damit die Linie auf
 * dem Papier nicht ausfranst. Heraus kommt ein PNG als Data-URL; wo nichts
 * gezeichnet wurde, bleibt es durchsichtig, sonst saesse ein weisser Kasten
 * ueber dem Formular.
 */
export function SignaturePad({ value, onChange }: {
  value: string | null
  onChange: (png: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnet = useRef(false)
  const [leer, setLeer] = useState(!value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = 2
    canvas.width = canvas.clientWidth * scale
    canvas.height = canvas.clientHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#10133F'

    if (value) {
      const bild = new Image()
      bild.onload = () => ctx.drawImage(bild, 0, 0, canvas.clientWidth, canvas.clientHeight)
      bild.src = value
    }
  }, [value])

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    zeichnet.current = true
    const { x, y } = punkt(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const zieh = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zeichnet.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = punkt(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setLeer(false)
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
        onPointerLeave={ende}
        // Ohne das scrollt die Seite unter dem Finger weg, statt zu zeichnen.
        style={{ touchAction: 'none' }}
        className="w-full h-28 rounded-xl border border-dashed border-cream-300 bg-white cursor-crosshair"
      />
      <p className="text-[11px] text-gray-500 mt-1">
        {leer ? 'Mit dem Finger oder der Maus unterschreiben.' : 'Steht ab jetzt in jeder Abrechnung.'}
      </p>
    </div>
  )
}
