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

/**
 * Name des Trainingsjahres zu einem Stichtag: `26/27` für November 2026 bis Oktober 2027.
 *
 * Gleiche Schreibweise wie bei den Trainingsperioden ("Wintersaison 25/26"). Rollt am
 * 1. November von selbst weiter — `25/26` wird zu `26/27` wird zu `27/28`.
 */
export function trainingYearLabel(reference?: string): string {
  const start = Number(trainingYearStart(reference).slice(0, 4))
  const short = (year: number) => String(year % 100).padStart(2, '0')
  return `${short(start)}/${short(start + 1)}`
}

/**
 * Beschriftung des Zeitraum-Schalters: `Jahr 26/27`.
 *
 * Das vorangestellte "Jahr" ist nicht Zierde. Blank steht `26/27` neben einer
 * Perioden-Auswahl, in der "Wintersaison 25/26" steht — und wäre dann als eine
 * einzelne Periode lesbar. Das Trainingsjahr umfasst aber **beide**, Winter- und
 * Sommersaison.
 */
export function trainingYearFilterLabel(reference?: string): string {
  return `Jahr ${trainingYearLabel(reference)}`
}

/**
 * Obergrenze der Trainingsbeteiligung: der Spieltag, aber nie in der Zukunft.
 *
 * Ein Spieltag, den man plant, liegt vorn. Die Trainings zwischen heute und ihm stehen
 * längst in der Datenbank (die Periode legt sie im Voraus an), aber niemand kann dort
 * anwesend gewesen sein — sie würden den Nenner aufblähen und kleine Nenner am härtesten
 * treffen, also genau die Neuzugänge. Pendant im Backend:
 * `LineupSuggestionService.countUntil`.
 *
 * @param gameDayDate Spieltag als `YYYY-MM-DD`
 * @param today Stichtag als `YYYY-MM-DD`, sonst heute
 */
export function countUntil(gameDayDate: string, today?: string): string {
  const heute = today ?? new Date().toISOString().slice(0, 10)
  return gameDayDate > heute ? heute : gameDayDate
}

/** Ausgeschriebene Erklärung für Tooltip und Screenreader. */
export function trainingYearTitle(reference?: string): string {
  const start = trainingYearStart(reference)
  const startYear = Number(start.slice(0, 4))
  return `Trainingsjahr ${trainingYearLabel(reference)}: Winter- und Sommersaison zusammen, `
    + `ab 1. November ${startYear}`
}
