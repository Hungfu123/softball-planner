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
        pointe: 'Die Zone bist du',
        satz: 'Brust bis Knie, über der Platte. Zwei Leute, zwei Zonen.',
        Buehne: ZoneAmKoerper,
      },
      {
        id: 'drin',
        pointe: 'Drin ist Strike',
        satz: 'Auch wenn du nicht schwingst.',
        Buehne: DrinIstStrike,
      },
      {
        id: 'auch-strike',
        pointe: 'Auch Strike',
        satz: 'Drei Wege, und alle zählen gleich.',
        Buehne: AuchStrike,
      },
      {
        id: 'count',
        pointe: 'Der Count ist ein Wettlauf',
        satz: 'Vier Balls bringen dich auf die 1. Drei Strikes, und du bist raus.',
        Buehne: CountWettlauf,
      },
      {
        id: 'bunt-wofuer',
        pointe: 'Wofür ein Bunt gut ist',
        satz: 'Kurz ablegen, während die Verteidigung tief steht, und du bist schon unterwegs.',
        Buehne: BuntWofuer,
      },
      {
        id: 'bunt-falle',
        pointe: 'Die Bunt-Falle',
        satz: 'Bei zwei Strikes gebuntet und foul: du bist raus.',
        Buehne: BuntFalle,
      },
    ],
  },
  {
    id: 'getroffen',
    titel: 'Du hast getroffen',
    frage: 'Wohin laufe ich, wann bin ich raus?',
    karten: [
      {
        id: 'lauf',
        pointe: 'Lauf. Sofort.',
        satz: 'Nicht hinsehen, nicht abwarten.',
        Buehne: LaufSofort,
      },
      {
        id: 'foul',
        pointe: 'Foul siehst du nicht',
        satz: 'Zwei Bälle, gleicher Abflug. Einer ist fair, einer ist foul. Nicht dein Call.',
        Buehne: FoulSiehstDuNicht,
      },
      {
        id: 'gefangen',
        pointe: 'Raus: gefangen',
        satz: 'Ball aus der Luft gefangen, bevor er den Boden berührt.',
        Buehne: RausGefangen,
      },
      {
        id: 'wurf-zur-eins',
        pointe: 'Raus: Wurf zur 1',
        satz: 'Der Ball ist vor dir da.',
        Buehne: RausWurfZurEins,
      },
      {
        id: 'getickt',
        pointe: 'Raus: getickt',
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
        pointe: 'Die Base ist sicher',
        satz: 'Steh drauf, und dir passiert nichts.',
        Buehne: BaseIstSicher,
      },
      {
        id: 'release',
        pointe: 'Los erst beim Release',
        satz: 'Erst wenn der Ball die Hand der Pitcherin verlässt. Kein Leadoff.',
        Buehne: LosBeimRelease,
      },
      {
        id: 'wild-pitch',
        pointe: 'Wild Pitch',
        satz: 'Der Ball rutscht am Catcher vorbei. Das ist dein Moment.',
        Buehne: WildPitch,
      },
      {
        id: 'steal',
        pointe: 'Steal',
        satz: 'Dasselbe, nur geplant.',
        Buehne: Steal,
      },
      {
        id: 'tag-up',
        pointe: 'Fly gefangen: erst zurück',
        satz: 'Zurück auf die Base berühren, dann erst los.',
        Buehne: TagUp,
      },
    ],
  },
]

export function findeKapitel(id: string | undefined): Kapitel | undefined {
  return KAPITEL.find(k => k.id === id)
}
