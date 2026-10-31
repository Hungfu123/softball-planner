import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { BuehnenProps } from './kapitel'

/*
 * Die echten Kapitel entstehen erst in den Kartendateien. Hier stehen drei gestellte,
 * damit die Seite fuer sich geprueft werden kann: getestet wird das Blaettern und der
 * Umgang mit einer Adresse, die es nicht gibt, nicht der Inhalt der Karten.
 */
function Attrappe({ lauf, ruhig }: BuehnenProps) {
  return <div data-testid="buehne" data-lauf={String(lauf)} data-ruhig={String(ruhig)} />
}

const karte = (id: string, pointe: string) => ({ id, stichwort: pointe.split(' ')[0], pointe, Buehne: Attrappe })

vi.mock('./kapitel', async (echt) => {
  const modul = await echt<typeof import('./kapitel')>()
  const KAPITEL = [
    { id: 'box', titel: 'In der Box', frage: 'Was zählt als Strike?', karten: [karte('zone', 'Die Zone bist du'), karte('drin', 'Drin ist Strike')] },
    { id: 'getroffen', titel: 'Du hast getroffen', frage: 'Wohin laufe ich, wann bin ich out?', karten: [{ ...karte('lauf', 'Lauf. Sofort.'), selbstgesteuert: true }] },
    { id: 'base', titel: 'Auf der Base', frage: 'Wann darf ich weiter?', karten: [karte('sicher', 'Die Base ist sicher')] },
  ]
  return { ...modul, KAPITEL, findeKapitel: (id: string | undefined) => KAPITEL.find(k => k.id === id) }
})

const { default: KapitelSeite } = await import('./KapitelSeite')
const { default: SpielwissenHome } = await import('./SpielwissenHome')

function zeige(pfad: string) {
  const router = createMemoryRouter(
    [
      { path: '/spielwissen', element: <SpielwissenHome /> },
      { path: '/spielwissen/:kapitel', element: <KapitelSeite /> },
    ],
    { initialEntries: [pfad] },
  )
  return render(<RouterProvider router={router} />)
}

const weiter = () => fireEvent.click(screen.getByRole('button', { name: 'Nächste Karte' }))
const abspielen = () => fireEvent.click(screen.getByRole('button', { name: 'Abspielen' }))

describe('Kapitelseite', () => {
  it('zeigt Titel, Frage und die erste Karte', () => {
    zeige('/spielwissen/box')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('In der Box')
    expect(screen.getByText('Was zählt als Strike?')).toBeInTheDocument()
    expect(screen.getByText('Die Zone bist du')).toBeInTheDocument()
  })

  /*
   * Eine Karte auf einmal: eine Animation, die etwas erklaert, braucht die ganze Flaeche
   * und einen Anfang, den man nicht verpasst. Lagen alle untereinander, liefen bei
   * 393x760 bis zu drei gleichzeitig.
   */
  it('zeigt immer nur eine Karte', () => {
    zeige('/spielwissen/box')

    expect(screen.getAllByTestId('buehne')).toHaveLength(1)
    expect(screen.queryByText('Drin ist Strike')).not.toBeInTheDocument()
  })

  it('blättert vor und zurück und sagt, wo man ist', async () => {
    zeige('/spielwissen/box')
    expect(screen.getByText('1 von 2')).toBeInTheDocument()

    weiter()

    // AnimatePresence laesst die alte Karte erst abtreten (mode="wait").
    await waitFor(() => expect(screen.getByText('Drin ist Strike')).toBeInTheDocument())
    expect(screen.getByText('2 von 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vorherige Karte' }))

    await waitFor(() => expect(screen.getByText('Die Zone bist du')).toBeInTheDocument())
  })

  /*
   * Pointe, Satz und „nochmal" standen frueher IN der Karte. Sie stehen jetzt auf der
   * Seite — unter der Buehne und unten am Rand, wie die Notiz und die Wiedergabeleiste
   * unter einem Play.
   */
  it('zeigt die Aussage unter der Bühne und startet sie mit „nochmal" neu', () => {
    zeige('/spielwissen/box')

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Die Zone bist du')
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '0')

    abspielen()
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal' }))

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '1')
  })

  /*
   * **Die Karte wartet, wie ein Play wartet.** Sie lief frueher los, sobald die Seite
   * stand: wer gerade noch die Ueberschrift las, sah nur das Ende und daneben ein
   * „nochmal", das scheinbar nichts tat — es holte eine Bewegung zurueck, die man nie
   * hatte anfangen sehen.
   *
   * Jetzt steht erst das Standbild (derselbe Endzustand, den auch reduzierte Bewegung
   * zeigt — die Auskunft steckt darin), daneben Amber auf ▶. Erst nach dem Abspielen
   * gibt es etwas zu wiederholen, und erst dann steht dort „nochmal".
   */
  it('wartet mit der Bewegung, bis man abspielt', () => {
    zeige('/spielwissen/box')

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
    expect(screen.queryByRole('button', { name: 'Nochmal' })).not.toBeInTheDocument()

    abspielen()

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'false')
    expect(screen.queryByRole('button', { name: 'Abspielen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nochmal' })).toBeInTheDocument()
  })

  it('wartet auch auf der nächsten Karte wieder', async () => {
    zeige('/spielwissen/box')
    abspielen()

    weiter()

    await waitFor(() => expect(screen.getByText('Drin ist Strike')).toBeInTheDocument())
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
    expect(screen.getByRole('button', { name: 'Abspielen' })).toBeInTheDocument()
  })

  /* Wer eigene Knoepfe mitbringt, bedient sich selbst: kein ▶ und kein ↻ daneben. */
  it('lässt eine selbstgesteuerte Karte ohne Abspielen und ohne „nochmal"', () => {
    zeige('/spielwissen/getroffen')

    expect(screen.queryByRole('button', { name: 'Abspielen' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nochmal' })).not.toBeInTheDocument()
  })

  /* Beim Blaettern faengt der Zaehler bei null an: die neue Karte laeuft ohnehin los. */
  it('setzt den Zähler beim Blättern zurück', async () => {
    zeige('/spielwissen/box')
    abspielen()
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal' }))
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '1')

    weiter()

    await waitFor(() => expect(screen.getByText('Drin ist Strike')).toBeInTheDocument())
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '0')
  })

  it('kommt auf der ersten Karte nicht weiter zurück', () => {
    zeige('/spielwissen/box')

    expect(screen.getByRole('button', { name: 'Vorherige Karte' })).toBeDisabled()
  })

  /*
   * Die Kapitel folgen dem zeitlichen Ablauf eines At-Bats. Wer durch ist, geht weiter.
   *
   * Der Knopf heisst auch hier „Weiter" und nicht mehr wie das Kapitel dahinter: derselbe
   * Weg vorwaerts wie unter einem Play, also dasselbe Wort und dieselbe Breite. Wohin es
   * geht, sagt die Kopfzeile der naechsten Seite — ein Knopf, der seinen Zielnamen traegt,
   * wird so lang wie dieser Name und schiebt den Stand in der Mitte ab.
   */
  it('führt nach der letzten Karte ins nächste Kapitel', async () => {
    zeige('/spielwissen/box')
    weiter()

    await waitFor(() => expect(screen.getByRole('link', { name: /Du hast getroffen/ }))
      .toHaveAttribute('href', '/spielwissen/getroffen'))
  })

  it('bietet im letzten Kapitel den Weg zurück zur Übersicht', () => {
    zeige('/spielwissen/base')

    expect(screen.getByRole('link', { name: 'Fertig' })).toHaveAttribute('href', '/spielwissen')
  })

  /*
   * Die Adresse steht jedem offen. Ein Tippfehler darf keine leere Seite ergeben, auf der
   * man nicht merkt, dass man falsch ist.
   */
  it('schickt ein unbekanntes Kapitel zurück auf die Übersicht', () => {
    zeige('/spielwissen/quatsch')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Spielwissen')
    expect(screen.getByRole('link', { name: /In der Box/ })).toBeInTheDocument()
  })

  /* Offense muss ohne Netz gehen. Ein einziger Abruf hier braeche das Versprechen. */
  it('ruft nichts unter /api ab', () => {
    const rufe: string[] = []
    const alt = globalThis.fetch
    globalThis.fetch = ((eingabe: RequestInfo | URL) => {
      rufe.push(String(eingabe))
      return Promise.reject(new Error('kein Netz im Test'))
    }) as typeof fetch

    try {
      zeige('/spielwissen/box')
    } finally {
      globalThis.fetch = alt
    }

    expect(rufe.filter(u => u.includes('/api'))).toEqual([])
  })
})
