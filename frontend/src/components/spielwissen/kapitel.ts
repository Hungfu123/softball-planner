import type { ComponentType } from 'react'
import { BOX_KARTEN } from './karten/box'

/**
 * Die Daten hinter dem Spielwissen.
 *
 * Eine Karte ist **ein Satz und eine Animation**. Der Satz ist Text, die Animation ist
 * eine Komponente — deshalb ist `Buehne` keine Beschreibung, sondern der Bauteil selbst.
 * Jede Karte bewegt etwas anderes; eine Tabelle, aus der man sie generiert, gaebe es
 * nicht, sie waere nur eine Tabelle mit einem Sonderfall je Zeile.
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
  /** Hoechstens ein Satz. Beschriftet, was die Buehne zeigt. */
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
 */
export const KAPITEL: Kapitel[] = [
  { id: 'box', titel: 'In der Box', frage: 'Was zählt als Strike?', karten: BOX_KARTEN },
]

export function findeKapitel(id: string | undefined): Kapitel | undefined {
  return KAPITEL.find(k => k.id === id)
}
