import type { ComponentType } from 'react'
import { ZoneAmKoerper, DrinIstStrike, AuchStrike, CountWettlauf, DritterStrikeAmBoden, EinFussBleibtDrin, BuntWofuer, BuntFalle } from './karten/box'
import { LaufSofort, FoulSiehstDuNicht, RausGefangen, RausWurfZurEins, RausGetickt, DurchlaufenAnDerEins } from './karten/getroffen'
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
  /**
   * Wie schwer, in drei Stufen — in der Uebersicht als Punkte.
   *
   * Nicht „wie kompliziert sind die Regeln", sondern **wie viel muss man vorher wissen**:
   * die Box versteht jeder am ersten Tag, der Lauf danach braucht die Box, und auf der
   * Base stehen Dinge, die ein Anfaenger erst im Spiel braucht (Steal, Tag Up).
   */
  stufe: 1 | 2 | 3
  karten: KartenDaten[]
}

/**
 * Die Reihenfolge ist der **zeitliche Ablauf eines At-Bats**, nicht eine Ordnung nach
 * Regelkapiteln: in der Box, dann getroffen, dann auf der Base. Ein Neuer erlebt es
 * genau so, und deshalb findet er die Stelle wieder, an der er haengengeblieben ist.
 *
 * **Quelle der Regeln** ist das Regelwerk „Offizielle Softballregeln 2026 bis 2029,
 * Fastpitch" des Deutschen Baseball und Softball Verbands (Uebersetzung der
 * WBSC-Regeln, gueltig ab 1. April 2026, softball-regeln.de). Drei Karten standen
 * vorher aus, weil niemand nachgeschlagen hatte, und eine vierte sagte es falsch: der
 * Start von der Base haengt seit dieser Fassung am **Schrittfuss** und nicht am Release
 * (5.10.3 b.ii). Die Regelnummer steht jeweils im Kommentar der Buehne.
 */
export const KAPITEL: Kapitel[] = [
  {
    id: 'box',
    titel: 'In der Box',
    frage: 'Was zählt als Strike?',
    stufe: 1,
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
        id: 'dritter-strike',
        stichwort: 'Dritter Strike',
        pointe: 'Dritter Strike am Boden',
        satz: 'Fängt der Catcher ihn nicht, darfst du zur 1 laufen. Aber nur, wenn die 1 frei ist. Bei zwei Outs immer.',
        selbstgesteuert: true,
        Buehne: DritterStrikeAmBoden,
      },
      {
        id: 'ein-fuss',
        stichwort: 'Box',
        pointe: 'Ein Fuß bleibt drin',
        satz: 'Willst du ganz raus: Hand hoch und Time abwarten. Geben muss es der Ump.',
        selbstgesteuert: true,
        Buehne: EinFussBleibtDrin,
      },
      {
        id: 'bunt-wofuer',
        stichwort: 'Bunt',
        pointe: 'Wofür ein Bunt gut ist',
        satz: 'Kurz ablegen, während die Verteidigung tief steht. Der vor dir kommt weiter, dafür gehst du selbst out.',
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
    stufe: 2,
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
        satz: 'Der Ball ist vor dir da. Fangen muss ihn einer, mit dem Fuß auf der Base.',
        Buehne: RausWurfZurEins,
      },
      {
        id: 'getickt',
        stichwort: 'Out',
        pointe: 'Out: getickt',
        satz: 'Jemand berührt dich mit dem Ball, während du auf keiner Base stehst.',
        Buehne: RausGetickt,
      },
      {
        id: 'durchlaufen',
        stichwort: 'Die 1',
        pointe: 'An der 1 läufst du durch',
        satz: 'Nicht bremsen. Danach direkt zurück auf die Base. Biegst du Richtung 2 ab, darf man dich ticken.',
        Buehne: DurchlaufenAnDerEins,
      },
    ],
  },
  {
    id: 'base',
    stufe: 3,
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
        pointe: 'Los, wenn der Fuß landet',
        satz: 'Kein Leadoff. Du bleibst auf der Base, bis der Schrittfuß der Pitcherin den Boden berührt. Früher ist out.',
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
