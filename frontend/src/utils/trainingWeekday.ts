/**
 * Welcher Wochentag das Pitcher/Catcher-Training trägt.
 *
 * Das P/C-Training lädt nur Pitcher und Catcher ein — in der Trainingsbeteiligung
 * steht es deshalb neben dem Basic-Training, nicht darin. Bis Oktober 2026 war das
 * der Montag, seit der Winterstruktur ist es der Donnerstag.
 *
 * Beim nächsten Strukturwechsel reichen diese beiden Werte — vorher stand der
 * Montag in sieben Dateien.
 */
export const PITCHER_CATCHER_WEEKDAY = 4

/** Beschriftung des Chips, der dieses Training aus der Zählung nimmt. */
export const PITCHER_CATCHER_HINT = 'Donnerstag (P/C)'
