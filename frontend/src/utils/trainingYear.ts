/** Monat, in dem das Trainingsjahr beginnt — mit der Winterstruktur der November. */
const TRAINING_YEAR_START_MONTH = 11

/**
 * Beginn des laufenden Trainingsjahres zu einem Stichtag: der letzte 1. November.
 *
 * Die Trainingsbeteiligung zählt ab hier, nicht über ein rollendes Fenster. Das Fenster
 * wächst damit über die Saison — im Februar ist es schmal und aktuell, im September elf
 * Monate breit und entsprechend träge. Bewusst so: ein Trainingsjahr zählt als Ganzes,
 * und der Schnitt im November fällt in die spielfreie Zeit.
 *
 * Pendant im Backend: `LineupSuggestionService.trainingYearStart`. Beide müssen dasselbe
 * Fenster liefern — sonst erklärt die angezeigte Zahl die Auto-Aufstellung nicht mehr.
 *
 * @param reference Stichtag als `YYYY-MM-DD` (der Spieltag), sonst heute.
 * @returns Startdatum als `YYYY-MM-DD`.
 */
export function trainingYearStart(reference?: string): string {
  const date = reference ? new Date(reference + 'T00:00:00') : new Date()
  const year = date.getMonth() + 1 >= TRAINING_YEAR_START_MONTH ? date.getFullYear() : date.getFullYear() - 1
  return `${year}-${String(TRAINING_YEAR_START_MONTH).padStart(2, '0')}-01`
}

/** Beschriftung des Zeitraums in der UI. */
export const TRAINING_YEAR_LABEL = 'Seit Nov.'
