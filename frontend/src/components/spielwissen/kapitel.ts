import type { ComponentType } from 'react'
import { ZoneAmKoerper, DrinIstStrike, AuchStrike, CountWettlauf, BuntWofuer, BuntFalle } from './karten/box'
import { LaufSofort, FoulSiehstDuNicht, RausGefangen, RausWurfZurEins, RausGetickt } from './karten/getroffen'
import { BaseIstSicher, LosBeimRelease, WildPitch, Steal, TagUp } from './karten/base'

/**
 * Die Daten hinter dem Spielwissen: **alle Saetze an einer Stelle**, alle Zeichnungen
 * daneben in `karten/`.
 *
 * Eine Karte ist ein Satz und eine Animation. Der Satz ist Text, die Animation ist eine
 * Komponente — deshalb ist `Buehne` keine Beschreibung, sondern der Bauteil selbst. Jede
 * Karte bewegt etwas anderes; eine Tabelle, aus der man sie generiert, waere nur eine
 * Tabelle mit einem Sonderfall je Zeile.
 *
 * Der Schnitt zwischen dieser Datei und `karten/` ist derselbe wie zwischen `routes.tsx`
 * und `lazyPages.tsx`: Daten hier, Komponenten dort. Beides in einer Datei bricht Fast
 * Refresh, und an Animationen arbeitet man mit vielen kleinen Aenderungen.
 */

export interface BuehnenProps {
  /**
   * Zaehlt bei jedem „nochmal" hoch. Die Buehne haengt ihn an die `key`s ihrer
   * bewegten Teile und faengt dadurch von vorn an.
   */
  lauf: number
  /**
   * Reduzierte Bewegung. Dann zeigt die Buehne **sofort ihren Endzustand**, statt eine
   * Sequenz abzuspielen. Der Endzustand traegt die Auskunft; die Bewegung erklaert sie
   * nur.
   */
  ruhig: boolean
}

export interface KartenDaten {
  id: string
  /** Die Aussage, gross und versal. Steht fuer sich, auch ohne den Satz darunter. */
  pointe: string
  /** Hoechstens ein Satz. Beschriftet, was die Buehne zeigt, und wiederholt sie nicht. */
  satz?: string
  /**
   * Ein oder zwei Woerter fuer die Uebersicht.
   *
   * Nicht die Pointe: die ist ein Satz und steht auf der Karte. Hier geht es nur darum,
   * dass man VOR dem Eintauchen sieht, welches Kapitel die gesuchte Sache traegt — ein
   * Kapitel ist rund drei Bildschirme, und bei drei Kapiteln raet man sonst. Mehrfach
   * vergebene Stichwoerter werden in der Uebersicht zusammengefasst.
   */
  stichwort: string
  /**
   * Die Buehne bringt ihre eigenen Knoepfe mit (Klein/Gross, Weiter/Von vorn) und laeuft
   * nicht von selbst ab. Dann faellt „nochmal" weg: es gaebe nichts zurueckzuholen, und
   * zwei Knoepfe fuer dieselbe Sache sind eine Frage mehr als noetig.
   */
  selbstgesteuert?: boolean
  Buehne: ComponentType<BuehnenProps>
}

export interface Kapitel {
  id: 'box' | 'getroffen' | 'base'
  titel: string
  /** Die Frage, die das Kapitel beantwortet. Steht statt einer Kapitelnummer. */
  frage: string
  karten: KartenDaten[]
}

/**
 * Die Reihenfolge ist der **zeitliche Ablauf eines At-Bats**, nicht eine Ordnung nach
 * Regelkapiteln: in der Box, dann getroffen, dann auf der Base. Ein Neuer erlebt es
 * genau so, und deshalb findet er die Stelle wieder, an der er haengengeblieben ist.
 *
 * Zwei Karten fehlen mit Absicht: „Ein Fuss bleibt drin" und „An der 1 darfst du
 * durchlaufen". Beide haengen an Regeln, die erst im Regelwerk des eigenen Verbands
 * nachgeschlagen werden muessen. Eine falsche Karte ist schlimmer als keine, weil ein
 * Anfaenger sie glaubt und ins Spiel traegt.
 */
export const KAPITEL: Kapitel[] = [
  {
    id: 'box',
    titel: 'In der Box',
    frage: 'Was zählt als Strike?',
    karten: [
      {
        id: 'zone',
        stichwort: 'Zone',
        pointe: 'Die Zone bist du',
        satz: 'Brust bis Knie, über der Platte. Zwei Leute, zwei Zonen.',
        selbstgesteuert: true,
        Buehne: ZoneAmKoerper,
      },
      {
        id: 'drin',
        stichwort: 'Strike',
        pointe: 'Drin ist Strike',
        satz: 'Auch wenn du nicht schwingst.',
        Buehne: DrinIstStrike,
      },
      {
        id: 'auch-strike',
        stichwort: 'Strike',
        pointe: 'Auch Strike',
        satz: 'Drei Wege, und alle zählen gleich.',
        Buehne: AuchStrike,
      },
      {
        id: 'count',
        stichwort: 'Count',
        pointe: 'Der Count ist ein Wettlauf',
        satz: 'Vier Balls bringen dich auf die 1. Drei Strikes, und du bist out.',
        Buehne: CountWettlauf,
      },
      {
        id: 'bunt-wofuer',
        stichwort: 'Bunt',
        pointe: 'Wofür ein Bunt gut ist',
        satz: 'Kurz ablegen, während die Verteidigung tief steht, und du bist schon unterwegs.',
        Buehne: BuntWofuer,
      },
      {
        id: 'bunt-falle',
        stichwort: 'Bunt',
        pointe: 'Die Bunt-Falle',
        satz: 'Bei zwei Strikes gebuntet und foul: du bist out.',
        Buehne: BuntFalle,
      },
    ],
  },
  {
    id: 'getroffen',
    titel: 'Du hast getroffen',
    frage: 'Wohin laufe ich, wann bin ich out?',
    karten: [
      {
        id: 'lauf',
        stichwort: 'Laufen',
        pointe: 'Lauf. Sofort.',
        satz: 'Nicht hinsehen, nicht abwarten.',
        Buehne: LaufSofort,
      },
      {
        id: 'foul',
        stichwort: 'Foul',
        pointe: 'Foul siehst du nicht',
        satz: 'Zwei Bälle, gleicher Abflug. Einer ist fair, einer ist foul. Nicht dein Call.',
        Buehne: FoulSiehstDuNicht,
      },
      {
        id: 'gefangen',
        stichwort: 'Out',
        pointe: 'Out: gefangen',
        satz: 'Ball aus der Luft gefangen, bevor er den Boden berührt.',
        Buehne: RausGefangen,
      },
      {
        id: 'wurf-zur-eins',
        stichwort: 'Out',
        pointe: 'Out: Wurf zur 1',
        satz: 'Der Ball ist vor dir da.',
        Buehne: RausWurfZurEins,
      },
      {
        id: 'getickt',
        stichwort: 'Out',
        pointe: 'Out: getickt',
        satz: 'Jemand berührt dich mit dem Ball, während du auf keiner Base stehst.',
        Buehne: RausGetickt,
      },
    ],
  },
  {
    id: 'base',
    titel: 'Auf der Base',
    frage: 'Wann darf ich weiter?',
    karten: [
      {
        id: 'sicher',
        stichwort: 'Base',
        pointe: 'Die Base ist sicher',
        satz: 'Steh drauf, und dir passiert nichts. Außer wenn hinter dir jemand nachrückt: dann musst du weiter.',
        Buehne: BaseIstSicher,
      },
      {
        id: 'release',
        stichwort: 'Release',
        pointe: 'Los erst beim Release',
        satz: 'Erst wenn der Ball die Hand der Pitcherin verlässt. Kein Leadoff, und zu früh ist out.',
        selbstgesteuert: true,
        Buehne: LosBeimRelease,
      },
      {
        id: 'wild-pitch',
        stichwort: 'Wild Pitch',
        pointe: 'Wild Pitch',
        satz: 'Der Ball rutscht am Catcher vorbei. Das ist dein Moment. Auf der nächsten Base bleibst du dann stehen.',
        Buehne: WildPitch,
      },
      {
        id: 'steal',
        stichwort: 'Steal',
        pointe: 'Steal',
        satz: 'Dasselbe, nur geplant. Angekommen heißt auch hier: stehenbleiben.',
        Buehne: Steal,
      },
      {
        id: 'tag-up',
        stichwort: 'Tag up',
        pointe: 'Fly gefangen: erst dann los',
        satz: 'Bis der Ball gefangen ist, bleibst du auf der Base. Dann erst darfst du.',
        selbstgesteuert: true,
        Buehne: TagUp,
      },
    ],
  },
]

export function findeKapitel(id: string | undefined): Kapitel | undefined {
  return KAPITEL.find(k => k.id === id)
}

/** Die Stichwoerter eines Kapitels, jedes nur einmal und in der Reihenfolge der Karten. */
export function stichworte(kapitel: Kapitel): string[] {
  return [...new Set(kapitel.karten.map(k => k.stichwort))]
}
