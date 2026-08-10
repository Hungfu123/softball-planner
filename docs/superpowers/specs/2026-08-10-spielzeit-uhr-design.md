# Spielzeit-Uhr für Legacy-Scoring und Spielbogen

**Datum:** 2026-08-10
**Status:** Design, noch nicht umgesetzt

## Problem

Softballspiele laufen gegen ein Zeitlimit. Die App kennt keines: weder `Game` (Legacy) noch
`Spielbogen` speichern eine Startzeit — beide haben nur `endedAt`. Wer wissen will, wie lange
gespielt wird, schaut aufs Handy und rechnet im Kopf.

Nebenbei: das RFL-Blatt hat ein Feld `Zeit:`, das der Export leer druckt
(`spielbogenPdfExport.ts:35`, fest mit leerem Wert) — zum Handausfüllen.

## Regel, wie sie gilt

Vom Nutzer festgelegt:

- Das Limit wird **pro Spiel** festgelegt, nicht einmal für die Liga.
- Schnellwahl **50** und **90** Minuten, freie Eingabe daneben.
- Die Uhr muss **pausierbar** sein — Regen, Verletzung, Diskussion.
- Bei Ablauf **greift die App nicht ein**. Die Uhr färbt sich, mehr nicht.

Der letzte Punkt ist bewusst so: eine Automatik, die bei Ablauf das Inning abwürgt oder das
Spiel beendet, wäre am Platz schlimmer als eine Regel, die man selbst anwendet. Ein Fehlgriff
beim Starten der Uhr hätte sonst Folgen fürs Spielergebnis.

## Datenmodell

Drei Felder, auf **beiden** Aggregaten (`spielbogen` und `games`):

| Feld | Typ | Bedeutung |
|---|---|---|
| `timer_running_since` | `TIMESTAMP`, nullable | wann die Uhr zuletzt gestartet wurde; `NULL` = pausiert oder nie gestartet |
| `timer_accumulated_seconds` | `INTEGER NOT NULL DEFAULT 0` | was vor der aktuellen Laufphase zusammengekommen ist |
| `time_limit_minutes` | `INTEGER`, nullable | das Limit dieses Spiels; `NULL` = keins gesetzt |

Verstrichene Zeit:

```
läuft   → accumulated + (jetzt − runningSince)
pausiert → accumulated
```

**Warum zwei Felder statt eines Startzeitpunkts:** mit nur einem Zeitstempel ließe sich nicht
pausieren, ohne die Startzeit zu verfälschen. Angesammelte Sekunden plus laufende Spanne ist die
kleinste Darstellung, die Pausen korrekt abbildet und beliebig oft aushält.

**Warum serverseitig und nicht im Browser:** eine Uhr in `localStorage` wäre nach dem ersten
Neuladen weg — mitten im Spiel. Serverseitig übersteht sie Neuladen, Handy-Sperre und
Gerätewechsel, und zwei Leute, die dasselbe Spiel offen haben, sehen dieselbe Zeit.

Migrationen: eine für `spielbogen`, eine für `games`. Höchste vorhandene Version vor dem
Schreiben prüfen (`ls backend/src/main/resources/db/migration/`) — Stand jetzt `V54`.

## Aktionen

Drei Endpunkte je System, spiegelbildlich:

| Aktion | Wirkung |
|---|---|
| Start | `timeLimitMinutes` setzen, `runningSince = jetzt`. Nur erlaubt, wenn die Uhr nicht läuft. |
| Pause | `accumulated += jetzt − runningSince`, `runningSince = NULL`. Nur erlaubt, wenn sie läuft. |
| Fortsetzen | `runningSince = jetzt`. Nur erlaubt, wenn sie pausiert **und** schon einmal gestartet war. |

Doppeltes Starten oder Pausieren wird abgelehnt statt still ignoriert — sonst verschluckt ein
Doppeltipp Zeit oder verdoppelt sie.

Das Limit darf auch nachträglich geändert werden (Schiedsrichter entscheidet um). Eigener
Endpunkt oder Teil von Start — Umsetzungsdetail.

## Darstellung

**Beide Scoring-Kopfzeilen** tragen die Uhr, neben Inning und Outs
(`SpielbogenPage.tsx` um Zeile 641 ff., `ScoringPage.tsx` entsprechend).

- Nie gestartet: ein unauffälliger Knopf „Zeit" oder ein Uhr-Symbol.
- Läuft: verstrichene Zeit `MM:SS`, und wenn ein Limit gesetzt ist zusätzlich die
  verbleibende — die verbleibende ist die Zahl, die am Platz zählt.
- Pausiert: Zeit steht, deutlich als pausiert erkennbar (nicht bloß „läuft nicht mehr weiter",
  das sieht man erst nach Sekunden).
- Limit überschritten: die Anzeige färbt sich in die Warnfarbe des Projekts (Amber, siehe
  `styles/index.css:6`) und zählt weiter — nicht ins Negative kippen, sondern
  „**+3:20 über Limit**". Rot ist reserviert für Outs und Fehler, hier wäre es zu laut.

**Start-Dialog:** zwei Knöpfe `50 min` und `90 min`, daneben ein freies Feld. Über
`ResponsiveSheet` oder `ConfirmModal`, dem Rest der App entsprechend.

**PDF:** das Feld `Zeit:` mit der Startzeit füllen, sobald eine existiert. Nur die Uhrzeit des
Starts, nicht die Dauer — auf dem RFL-Blatt steht dort die Anfangszeit.

## Uhr-Abweichung zwischen Gerät und Server

Die verstrichene Zeit entsteht aus Server-Zeitstempeln, angezeigt wird sie aber im Browser, der
sekündlich weiterzählt. Geht die Handy-Uhr falsch, driftet die Anzeige.

**Regel:** der Server liefert die verstrichenen Sekunden als Zahl mit, nicht nur die
Zeitstempel. Das Frontend zählt von diesem Wert lokal weiter und gleicht bei jedem Laden neu ab.
Damit ist die angezeigte Zeit unabhängig davon, wie das Gerät eingestellt ist.

## Randfälle

- **Spiel endet, während die Uhr läuft.** Die Uhr friert ein — **abgeleitet, nicht geschrieben**:

  ```
  bezugszeit  = endedAt ?? jetzt
  verstrichen = accumulated + (läuft ? bezugszeit − runningSince : 0)
  ```

  Damit muss keine der vier Stellen angefasst werden, die `endedAt` setzen (inklusive der zwei
  Walkoff-Pfade in `SpielbogenScoringService`). Der Grundsatz dieser Arbeit: **die Uhr liest den
  Spielzustand, sie schreibt nie hinein**, und der Spielablauf schreibt so selten wie möglich in
  die Uhr.

- **Spiel wird wieder geöffnet** (`reopen`) — der eine Fall, der doch einen Schreibvorgang
  braucht. Fällt `endedAt` weg, verlöre die Ableitung ihre Obergrenze und würde schlagartig alle
  Stunden seit Spielende mitzählen; die Anzeige spränge von 93 Minuten auf vierzehn Stunden.

  **Regel:** beim Wiederöffnen wird die Uhr pausiert und die bis dahin gelaufene Zeit gebucht
  (`accumulated += endedAt − runningSince`, `runningSince = NULL`) — berechenbar, weil `endedAt`
  in diesem Moment noch gesetzt ist. Drei Aufrufstellen statt vier, und inhaltlich richtig: wer
  ein Spiel wieder aufmacht, startet die Uhr bewusst neu.

- **Scoring wird zurückgesetzt** (`/reset` beim Spielbogen, `DELETE /scoring` beim Legacy). Die
  bestehenden Reset-Pfade werden **nicht angefasst**. Stattdessen bekommt die Uhr eine eigene
  Zurücksetzen-Aktion. Ein zurückgesetztes Spiel zeigt bis dahin die alte Zeit — sichtbar und
  vom Nutzer korrigierbar, statt eine weitere Kopplung in bestehenden Code zu ziehen.
- **Nie gestartet.** Alles bleibt leer, nichts bricht. Die Uhr ist optional — wer sie nicht
  nutzt, merkt nichts von ihr.
- **Limit gesetzt, Uhr nie gestartet.** Keine Warnung, keine Färbung. Ohne Startzeit gibt es
  nichts zu überschreiten.
- **Zwei Geräte am selben Spiel.** Beide sehen dieselbe Zeit, weil sie vom Server kommt. Pausiert
  eines, sieht es das andere beim nächsten Laden — nicht sofort, es gibt keine Push-Verbindung.
  Akzeptiert; die Uhr ist kein Wettkampfinstrument.
- **Pause über Mitternacht** oder sehr lange Pausen: `accumulated` ist ein Integer in Sekunden,
  das reicht weit über jede Spieldauer.

## Nicht Teil dieser Arbeit

- **Automatik bei Ablauf** — kein erzwungenes Spielende, kein blockierter Inning-Wechsel. Vom
  Nutzer ausdrücklich so entschieden.
- **Ein liga-weites Standardlimit.** Es wird pro Spiel gesetzt.
- **Push-Aktualisierung zwischen Geräten.** Wer aktualisiert, sieht den neuen Stand.
- **Zeitmessung pro Inning oder Halbinning.** Nur die Gesamtdauer.
- **Nachträgliches Korrigieren der verstrichenen Zeit.** Wer sich vertippt hat, setzt zurück und
  startet neu. Ein Editierfeld für „gelaufene Minuten" lädt zu Fehlern ein und wurde nicht
  verlangt.

## Tests

**Backend**, je System:

- Start setzt `runningSince` und das Limit; ein zweiter Start wird abgelehnt
- Pause bucht die Spanne aufs Konto und leert `runningSince`; eine zweite Pause wird abgelehnt
- Fortsetzen nach Pause zählt weiter, ohne die angesammelte Zeit zu verlieren
- Fortsetzen ohne vorherigen Start wird abgelehnt
- Mehrfacher Wechsel Start → Pause → Fortsetzen → Pause summiert korrekt
- Spielende stoppt eine laufende Uhr
- Reset setzt Uhr zurück, lässt das Limit stehen
- Die Antwort enthält die verstrichenen Sekunden als Zahl, nicht nur die Zeitstempel

**Frontend:**

- Anzeige formatiert `MM:SS` und zeigt bei gesetztem Limit die verbleibende Zeit
- Überschreitung färbt und zeigt `+MM:SS über Limit`, kippt nicht ins Negative
- Pausiert ist als Zustand erkennbar, nicht nur an einer stehenden Zahl
- Der Start-Dialog bietet 50 und 90 und akzeptiert freie Eingabe
- Ohne gestartete Uhr rendert die Kopfzeile unverändert wie heute — **Regressionsschutz**, die
  Uhr darf für alle bestehenden Spiele unsichtbar bleiben

**Vor dem Merge:**

- `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- `cd frontend && npm test && npm run build && npm run lint`
- `cd frontend && npm run test:e2e` — die Suite deckt das Legacy-Scoring dicht ab, und dessen
  Kopfzeile wird angefasst
- Von Hand: Uhr starten, pausieren, fortsetzen, Seite neu laden und prüfen, dass die Zeit
  stimmt. Das Neuladen ist der eigentliche Test — dafür liegt die Uhr auf dem Server.

## Offen

Ob die Uhr im **Legacy** und im **Spielbogen** dieselbe Komponente teilt oder zweimal gebaut
wird. Die Anzeige ist identisch, die Datenquelle nicht. Eine geteilte präsentationale Komponente
mit zwei dünnen Anbindungen wäre sauber — zu entscheiden, wenn die Kopfzeilen beider Seiten
nebeneinander liegen.
