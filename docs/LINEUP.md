# Lineup Editor

Pro Game-Eintrag der GameDay: Lineup mit max 10 Entries (Batting-Order 1..N), Field-Positions, optional EH (Extra Hitter) ohne Field, optional DH-Annotation.

Auto-Generation auch verfügbar: `docs/03-LINEUP-AUTO-GENERATE.md`.

## Routes
- `/gameday/:id` — GameDay-Detail mit Game-Tabs + Lineup-Builder pro Game

## Backend Files
- `application/LineupService.java` — CRUD, Validation
- `domain/service/LineupValidator.java` — pure Regeln
- `domain/model/LineupEntry.java`
- `adapter/in/web/GameController.java` — `POST /api/games/{id}/lineup`

## Domain-Regeln (don't break!)
- **Max 10 LineupEntries** pro Game.
- **Batting-Order sequenziell** 1..N, kein Gap.
- **Field-Positions unique** (P/C/1B/2B/3B/SS/LF/CF/RF). EH **darf** mehrfach (kein Field). `position == null` = nur batten, kein Field.
- **Players in `gameDay.availablePlayers`** — alle Lineup-Player müssen verfügbar sein.
- **Player kann NICHT** Lineup AND Base-Coach im selben Game sein.
- **DH-Annotation:**
  - **DH ist KEINE eigene `LineupEntry`** — sondern `dhBatterPlayerId` auf einem **Field**-Player-Entry
  - Max 1 DH pro Game
  - Nur valide auf Field-Position (NICHT EH, NICHT null-position)
  - DH-Batter muss ein Bench-Player sein (kein Lineup-Player)
  - DH-Batter zählt als 0.5-Game in Stats
- **Swap** (`POST /api/games/{id1}/swap/{id2}`): atomarer Swap von Lineup + Staff + Opponent + Scores zwischen zwei Games auf der **selben** GameDay.

## Lineup-Sets (Varianten je Spieltag)
- Snapshot des ganzen Spieltags: Verfügbare Spieler + Lineups aller Games + Base-Coaches.
- `POST /api/gamedays/{id}/lineup-sets` neu anlegen, `PUT /api/lineup-sets/{id}` **mit aktuellem Stand überschreiben** (ID, Name und Sortierung bleiben), `PATCH` umbenennen, `DELETE` löschen.
- Frontend: `LineupSetBar` (Pills + ⋯-Menü mit Überschreiben/Umbenennen/Löschen), `useLineupSets`. Überschreiben speichert erst alle Game-Lineups, dann snapshotet das Backend — gleiche Reihenfolge wie "Als Set speichern".
- **Coach-Rotation ist Teil des Sets** (seit V57, Tabelle `lineup_set_game_rotation`, eine Zeile je `game_number` mit 1B/3B-Pair + reversed-Flag). `captureCurrentState` liest sie von den Games mit, `applySet` schreibt sie per `setCoachRotation` zurück. Zeilen ohne Rotation werden nicht gespeichert; **Alt-Sets (vor V57) haben keine Zeilen → Rotation wird beim Anwenden geleert**, statt die des vorher geladenen Sets zu erben.
- Der Planner zieht nach `applySet` `getGameDay` neu — sonst zeigen die 1B/3B-Badges im Lineup den alten Stand, u. a. weil `GameStaffService.setStaff` die Rotation serverseitig löscht, sobald ein Coach-Slot besetzt wird.

## Frontend Files
- `components/lineup/LineupBuilder.tsx` — Drag-Drop via @dnd-kit
- `components/lineup/LineupEntryRow.tsx`
- `components/lineup/PlayerPicker.tsx`
- `components/lineup/DHAnnotationModal.tsx`
- `hooks/useLineup.ts`

## Häufige Fallstricke
- **DH-Verständnis falsch:** Code-Reviewer denken oft DH ist eigener Eintrag (wie Baseball-Convention). Hier NICHT — `dhBatterPlayerId` ist Annotation auf Field-Player.
- **Batting-Order-Gaps nach Delete:** Backend renumberiert automatisch. Frontend sollte nach API-Response neu laden.
- **Player in zwei Games gleichzeitig**: nicht verboten (verschiedene Games auf gleicher GameDay = parallele Spiele möglich, falls Liga das so mappt).
- **Cascade bei Availability-Change** siehe `docs/GAMEDAY.md`.
- **Fehlermeldung zu einem fremden Tab:** "Lineup speichern" persistiert ALLE Games des Spieltags (`saveAllGames`), nicht nur den offenen Tab. Validierungsfehler werden deshalb mit `Spiel {n}: …` geprefixt und nennen Spielernamen (Name-Map aus `LineupService.playerNamesFor`), sonst ist die Meldung im UI nicht zuordenbar.
- **DH-Batter vs. Base Coach:** der DH-Batter schlägt und darf nicht coachen. Der Planner räumt den Coach-Slot beim Setzen des DH automatisch frei (`handleSetDhBatter`), analog zu `handleAddPlayer` — sonst kommt der Konflikt erst als 400 beim Speichern.

## Frauen-Quote der Liga (`LineupGenderRule`)

Mindestens **zwei Frauen auf dem Feld**, davon mindestens **eine im Infield**. Infield ist
alles außer Outfield — **P und C zählen dazu**. Ein EH schlägt nur und zählt nicht, ein
DH-Batter ebenso wenig: gezählt wird, wer tatsächlich auf dem Feld steht.

- Grundlage ist `Player.gender` (V62, nullable): `FEMALE`, `MALE`, `DIVERSE`.
  **Nur `FEMALE` zählt für die Quote.** Nicht zugeordnet und `DIVERSE` zählen nicht —
  niemand gilt stillschweigend als Mann, und was für „divers" sportrechtlich gilt,
  entscheidet der Verband, nicht diese App. Kommt von dort eine Regelung, ist es eine
  Zeile in `LineupGenderRule.count`. Gepflegt wird das an zwei Stellen: im Kader
  unter „Geschlecht" (ein Sheet für alle, zwei Taps je Person) und im Spielerprofil über
  den Knopf neben den Positions-Chips.
- **Die Auto-Aufstellung hält die Quote ein**, solange genug Frauen da sind. Der Hinweis im
  Editor erscheint also nur bei von Hand gebauten Aufstellungen oder wenn an diesem Spieltag
  weniger als zwei Frauen zugesagt haben.
- **Der Hinweis unterscheidet beide Fälle:** fehlt die zweite Frau im Kader des Tages, sagt
  er „Heute ist nur eine Frau dabei" statt eine Umstellung zu fordern, die es nicht gibt.
- **Die Regel meldet, sie verbietet nicht.** `POST /api/games/{id}/lineup/check` prüft auch
  einen noch nicht gespeicherten Entwurf und liefert Hinweise; `PUT /lineup` speichert
  weiterhin alles. An einem Spieltag mit zu wenigen Frauen muss sich eine Aufstellung
  speichern lassen.
- Der Lineup-Editor ruft den Check entdrosselt (400 ms) auf und zeigt die Hinweise über
  dem Bogen. Gerechnet wird im Backend — die Regel soll nicht zweimal existieren.

## Auto-Aufstellung (`LineupSuggestionEngine`)

Reihenfolge der Kriterien beim Befüllen:

1. **Jeder Anwesende spielt mindestens einmal** — wer an diesem Spieltag noch kein Spiel
   hatte, kommt vor allen anderen. Erst wenn alle einmal dran waren, zählt der Rest.
   (Base-Coaches sind raus — sie stehen am Spielfeldrand und zählen nicht als Einsatz.)
2. **Trainingsbeteiligung** — wer öfter im Training steht, spielt mehr. Das ist der
   eigentliche Verteilungsschlüssel, nicht die bisherige Spielzahl. Gerechnet wird als
   **Quote**, nicht als Zähler: besucht ÷ stattgefunden **seit dem ersten Auftauchen**
   des Spielers (`TrainingParticipationCalculator`) — wer im Mai dazukam, hat den April
   nicht versäumt. Das **P/C-Training zählt nicht mit**: dort sind nur Pitcher und
   Catcher eingeladen, wer nur Basic kann läge sonst strukturell hinten. Der Nenner hat
   eine Untergrenze von 3 (`MIN_DENOMINATOR`) — sonst stünde, wer zwei Wochen vor dem
   Spieltag neu dazukommt und beide Male da war, mit 2/2 = 1.0 vor jedem Stammspieler.
3. **Spiele an diesem Spieltag** — verteilt die Zusatzspiele unter gleich oft Trainierenden.
4. **Frauen-Quote — erzwungen, kein Kriterium.** Sind zwei Frauen verfügbar, stehen auch
   zwei auf dem Feld, egal wie selten sie im Training waren. Weichen muss, wer in der
   Reihenfolge am weitesten unten steht, und unter denen zuerst, wer an diesem Spieltag
   schon gespielt hat — der Mindest-Einsatz der anderen bleibt so erhalten.
5. **Positions-Profil** — verteilt werden die Posten nach Erst-/Zweit-/Drittposition. In
   jedem Schritt kommt der Posten dran, für den es gerade die wenigsten passenden Profile
   gibt, sonst schnappt sich ein beliebiger Posten den einzigen Pitcher.
6. **Auffüllen** — bleiben Posten ohne Profil-Anwärter, werden sie nach obiger Reihenfolge besetzt.
   Die Aufstellung ist immer komplett.
7. **Infield-Quote** — steht danach keine Frau im Infield, tauscht sie mit dem Mann, bei
   dem beide hinterher am besten passen (gemessen am Profil).

Der Zufall bleibt als Tiebreaker: gleich platzierte Spieler und gleich knappe Posten werden
gemischt, damit zweimal „Auto" nicht zweimal dasselbe liefert.

Der Mindest-Einsatz ist eine Reihenfolge, keine Garantie: Sind mehr Leute da als Plätze an
diesem Spieltag (zwei Spiele = 18 Feldplätze), kommen zwangsläufig welche nicht dran — dann
sind es die mit der geringsten Trainingsbeteiligung.

### Zeitraum: das Trainingsjahr, nicht ein rollendes Fenster

Gezählt wird **seit dem letzten 1. November** (`LineupSuggestionService.trainingYearStart`,
Frontend-Pendant `frontend/src/utils/trainingYear.ts`). Das Fenster wächst also über die
Saison: im Februar schmal und aktuell (~35 Trainings), im September elf Monate breit
(~105) und entsprechend träge — wer im Winter fleißig war und seit Mai fehlt, steht dort
noch weit oben. Bewusst so entschieden: ein Trainingsjahr zählt als Ganzes, und der
Schnitt im November fällt in die spielfreie Zeit.

In der UI heißt der Zeitraum **`Jahr 26/27`** für November 2026 bis Oktober 2027
(`trainingYearFilterLabel`), das Label rollt am 1. November von selbst weiter. Das
vorangestellte „Jahr" grenzt gegen die Perioden ab: blank stünde `26/27` neben einer
Auswahl, in der „Wintersaison 25/26" steht, und wäre als *eine* Periode lesbar — gemeint
sind aber **Winter- und Sommersaison zusammen**. Der Tooltip (`trainingYearTitle`)
schreibt das aus.

Dasselbe Fenster benutzen das Trainings-Panel im Planer und der Spielerpool, damit die
angezeigte Zahl die Aufstellung erklärt. Vorher liefen drei verschiedene Fenster
nebeneinander: Engine 3 Monate ab heute, Panel 84 Tage ab Spieltag, Spielerpool 90 Tage
ab Spieltag — auf dem Desktop sichtbar nebeneinander.

Willst du stattdessen ein rollendes Fenster (reagiert schneller, bestraft eine lange
Abwesenheit härter), ist es je eine Zeile an den beiden oben genannten Stellen.

### Welcher Wochentag das P/C-Training trägt

Der Tag steckt an zwei Stellen als Konstante: `LineupSuggestionService.PITCHER_CATCHER_WEEKDAY`
(Backend, für die Quote) und `frontend/src/utils/trainingWeekday.ts` (Frontend, für den
Chip in Spielerpool und Trainings-Panel). Bis Oktober 2026 war es der Montag, seit der
Winterstruktur der Donnerstag. **Beim nächsten Strukturwechsel müssen beide mitziehen** —
plus die Datumsangaben in `StatsDrawer.test.tsx`, die bewusst am konkreten Label hängen.

Die Kopplung an den Wochentag hat eine bekannte Grenze: ein Zeitraum, der über einen
Strukturwechsel reicht, lässt sich damit nicht sauber schneiden — vor dem Wechsel bedeutet
derselbe Wochentag etwas anderes. Betroffen sind das „Gesamt"-Fenster im Spielerpool und
Spieltage, deren 3-Monats-Fenster vor den Wechsel zurückreicht. Sauber lösen ließe sich das
nur über `Training.type` statt über den Wochentag.
