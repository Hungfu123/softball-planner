import type { Page } from '@playwright/test'

export type Befund = { text: string; kontrast: number; schwelle: number; wo: string }
export type Messung = { aa: Befund[]; unsichtbar: Befund[] }

/**
 * Misst den Text-Kontrast einer gerenderten Seite — im Browser, nicht aus den Klassen.
 * Nur so faellt auf, wenn eine Farbe erst durch Schichtung oder durch das Theme kippt.
 *
 * Gerechnet wird nach WCAG 2.1 in sRGB, mit echter Alpha-Ueberblendung: jede
 * durchsichtige Flaeche wird auf die darunterliegende gerechnet, bis eine deckende
 * kommt. Die Schwelle ist 4,5:1, fuer grossen Text (>= 24px, oder >= 18,66px fett) 3:1.
 *
 * `unsichtbar` (< 1,6:1) ist die harte Grenze: Schrift, die man nicht mehr vom Grund
 * trennen kann. `aa` ist die weichere — dort gibt es Altlasten in beiden Themes.
 *
 * Grenzen, die man kennen muss:
 *   - In SVG malt `fill`, nicht `color`. Das wird beruecksichtigt; die Flaeche darunter
 *     wird aber nur GESCHAETZT (erste Form im Dokument, deren Rahmen den Textmittelpunkt
 *     enthaelt) — bei gestapelten Formen kann das danebenliegen.
 *   - Elemente ohne eigenen Textknoten werden uebersprungen, sonst zaehlte jede
 *     Verschachtelung mehrfach.
 *   - Hintergrundbilder und Verlaeufe sind nicht messbar und gelten als nicht vorhanden.
 */
export async function messeKontrast(page: Page, wurzel?: string): Promise<Messung> {
  return page.evaluate((wurzelSel: string | undefined) => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const cx = cv.getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string): number[] => {
      cx.clearRect(0, 0, 1, 1)
      cx.fillStyle = '#000'
      cx.fillStyle = css
      cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const ueber = (v: number[], h: number[]) =>
      v.slice(0, 3).map((x, i) => x * v[3] + h[i] * (1 - v[3])).concat([1])
    const leucht = (c: number[]) => {
      const [r, g, b] = c.slice(0, 3).map(v => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const K = (a: number[], b: number[]) => {
      const x = leucht(a), y = leucht(b)
      return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)
    }

    // Welche SVG-Form liegt unter diesem Text? Erste im Dokument, deren Rahmen die Mitte
    // des Textes enthaelt — eine Schaetzung, keine Treffermessung.
    const svgGrund = (el: Element): number[] | null => {
      const svg = (el as SVGElement).ownerSVGElement
      if (!svg) return null
      const r = el.getBoundingClientRect()
      const mx = r.left + r.width / 2, my = r.top + r.height / 2
      for (const kand of svg.querySelectorAll('rect,circle,ellipse,path,polygon')) {
        const kr = kand.getBoundingClientRect()
        if (mx < kr.left || mx > kr.right || my < kr.top || my > kr.bottom) continue
        const f = getComputedStyle(kand).fill
        if (f && f !== 'none') {
          const c = rgba(f)
          if (c[3] > 0) return c
        }
      }
      return null
    }

    const grund = (el: Element): number[] => {
      const stapel: number[][] = []
      const sv = svgGrund(el)
      if (sv) stapel.push(sv)
      let n: Element | null = (el as SVGElement).ownerSVGElement ?? el
      while (n) {
        const c = rgba(getComputedStyle(n).backgroundColor)
        if (c[3] > 0) stapel.push(c)
        n = n.parentElement
      }
      stapel.push([255, 255, 255, 1])
      let acc = stapel[stapel.length - 1]
      for (let i = stapel.length - 2; i >= 0; i--) acc = ueber(stapel[i], acc)
      return acc
    }

    const aa: { text: string; kontrast: number; schwelle: number; wo: string }[] = []
    const unsichtbar: typeof aa = []

    const start = wurzelSel ? document.querySelector(wurzelSel) : null
    if (wurzelSel && !start) return { aa, unsichtbar }
    const kandidaten = start ? [start, ...start.querySelectorAll('*')] : [...document.querySelectorAll('*')]

    kandidaten.forEach(el => {
      const eigene = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
      if (!eigene || eigene.length > 60) return
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.2) return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      // WCAG 1.4.3 nimmt inaktive Bedienelemente aus: ein ausgegrauter Knopf DARF
      // schwach sein, das ist seine Aussage. Sichtbar bleiben muss er trotzdem —
      // dafuer steht die Flaeche, nicht die Schrift.
      if (el.closest('button:disabled,fieldset:disabled,[disabled],[aria-disabled="true"]')) return

      const imSvg = !!(el as SVGElement).ownerSVGElement
      const gemalt = imSvg && cs.fill !== 'none' ? cs.fill : cs.color
      const hg = grund(el)
      const vg = ueber(rgba(gemalt), hg)
      const k = K(vg, hg)

      const px = parseFloat(cs.fontSize)
      const gross = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700)
      const schwelle = gross ? 3 : 4.5
      if (k >= schwelle) return

      const klassen = (el as HTMLElement).className
      const wo = `${el.tagName.toLowerCase()}.${String(
        typeof klassen === 'string' ? klassen : (klassen as unknown as SVGAnimatedString)?.baseVal ?? '',
      ).split(' ').slice(0, 3).join('.')}`
      const befund = { text: eigene.slice(0, 40), kontrast: k, schwelle, wo }
      aa.push(befund)
      if (k < 1.6) unsichtbar.push(befund)
    })

    return { aa, unsichtbar }
  }, wurzel)
}

export function bericht(befunde: Befund[]): string {
  return befunde
    .slice(0, 8)
    .map(b => `    ${b.kontrast.toFixed(2)}:1 (noetig ${b.schwelle}) — „${b.text}" in ${b.wo}`)
    .join('\n')
}

/**
 * Dasselbe, aber mit dem Zeiger auf dem Element. Der normale Prüfer fährt nie mit der
 * Maus über etwas — alles, was erst beim Überfahren die Farbe wechselt, liegt außerhalb
 * seines Blickfelds. Genau dort sitzen im Dunkeln die lautesten Fehler: `hover:bg-cream-100`
 * macht eine Zeile cremefarben, unter weißer Schrift.
 *
 * Gemessen wird je Element einzeln: anfahren, markieren, nur diesen Teilbaum messen,
 * Markierung weg. Elemente, die sich nicht anfahren lassen (verdeckt, außerhalb des
 * Sichtfelds, zwischendurch verschwunden), werden übersprungen — ein nicht erreichbarer
 * Hover ist kein Befund.
 */
export async function messeHover(page: Page, grenze = 30): Promise<Messung> {
  const ziele = page.locator('button:not([disabled]), a[href], [role="button"]')
  const anzahl = Math.min(await ziele.count(), grenze)
  const aa: Befund[] = []
  const unsichtbar: Befund[] = []

  for (let i = 0; i < anzahl; i++) {
    const el = ziele.nth(i)
    try {
      if (!(await el.isVisible())) continue
      await el.hover({ timeout: 1000 })
      await el.evaluate(n => n.setAttribute('data-kontrast-ziel', ''))
    } catch {
      continue
    }
    const m = await messeKontrast(page, '[data-kontrast-ziel]')
    await page
      .evaluate(() => document.querySelector('[data-kontrast-ziel]')?.removeAttribute('data-kontrast-ziel'))
      .catch(() => {})
    aa.push(...m.aa)
    unsichtbar.push(...m.unsichtbar)
  }
  return { aa, unsichtbar }
}

export type Flaeche = { wo: string; farbe: string; tinte: string; gross: string }

/**
 * Helle Flächen im Dunkelmodus. Erlaubt ist genau eine Sorte: die bewusste Umkehrung —
 * heller Grund mit DUNKLER Schrift, wie der aktive Reiter im Band. Alles andere ist eine
 * Fläche, die beim Umstellen vergessen wurde, und trägt dann weiße Schrift auf hellem
 * Grund.
 *
 * Diese Prüfung findet, was der Kontrast-Prüfer nicht finden kann: eine leere Fläche ohne
 * eigenen Text. Genau so blieb `html` cremefarben — unsichtbar, bis man am Handy
 * überscrollt und hinter der dunklen Seite Papier aufblitzt.
 */
export async function helleFlaechenOhneDunkleTinte(page: Page): Promise<Flaeche[]> {
  return page.evaluate(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const cx = cv.getContext('2d', { willReadFrequently: true })!
    const leucht = (css: string): number | null => {
      cx.clearRect(0, 0, 1, 1)
      cx.fillStyle = '#000'
      cx.fillStyle = css
      cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      if (d[3] < 200) return null // durchsichtig: keine eigene Fläche
      const [r, g, b] = [d[0], d[1], d[2]].map(v => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const treffer: { wo: string; farbe: string; tinte: string; gross: string }[] = []
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') return
      const r = el.getBoundingClientRect()
      if (r.width * r.height < 400) return
      const grund = leucht(cs.backgroundColor)
      if (grund === null || grund < 0.5) return
      const tinte = leucht(cs.color)
      if (tinte !== null && tinte < 0.2) return // bewusste Umkehrung: heller Grund, dunkle Tinte
      const klassen = (el as HTMLElement).className
      treffer.push({
        wo: `${el.tagName.toLowerCase()}.${String(typeof klassen === 'string' ? klassen : '')
          .split(' ')
          .slice(0, 3)
          .join('.')}`,
        farbe: cs.backgroundColor,
        tinte: cs.color,
        gross: `${Math.round(r.width)}x${Math.round(r.height)}`,
      })
    })
    return treffer
  })
}
