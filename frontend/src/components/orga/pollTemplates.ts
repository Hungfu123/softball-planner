import type { GameDayResponse, WhatsappPollRequest } from '@/types'
import { isoDate } from './pollSchedule'

type TemplateFields = Pick<WhatsappPollRequest, 'title' | 'message' | 'options' | 'allowMultipleAnswers'>

const WEEKDAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function parts(gameDay: GameDayResponse) {
  const d = new Date(gameDay.date + 'T00:00:00')
  return {
    weekday: WEEKDAY_LONG[d.getDay()],
    short: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    place: gameDay.location?.trim() || gameDay.label?.trim() || '',
  }
}

/** Auswärtsspiel: Mehrfachauswahl, damit Spielen + Auto zusammen gehen. */
export function awayTemplate(gameDay: GameDayResponse): TemplateFields {
  const { weekday, short, place } = parts(gameDay)
  return {
    message: `Wer ist am ${weekday} (${short}) dabei?`,
    title: place ? `Spieltag in ${place} dabei?` : `Spieltag am ${short} dabei?`,
    options: ['Ja ich will spielen', 'Ich habe ein Auto und würde fahren', 'Nein'],
    allowMultipleAnswers: true,
  }
}

/** Heimspieltag: Einzelauswahl — spielen ODER helfen ODER nicht können. */
export function homeTemplate(gameDay: GameDayResponse): TemplateFields {
  const { weekday, short } = parts(gameDay)
  return {
    message: `Heimspieltag am ${weekday} (${short}) — wer ist dabei?`,
    title: `Heimspieltag ${short}`,
    options: [
      'Ja, ich spiele (und helfe natürlich mit)',
      'Ich komme zum Aufbauen/Anfeuern/Catering helfen',
      'Ich kann nicht :(',
    ],
    allowMultipleAnswers: false,
  }
}

/** 7 Tage vor dem Spieltag, aber nie in der Vergangenheit (Backend lehnt das ab). */
export function defaultSendDate(gameDayDate: string, todayIso: string): string {
  const d = new Date(gameDayDate + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  // Lokales Datum, nicht toISOString() (UTC → Off-by-one nahe Mitternacht, siehe pollSchedule.isoDate).
  const iso = isoDate(d)
  return iso < todayIso ? todayIso : iso
}
