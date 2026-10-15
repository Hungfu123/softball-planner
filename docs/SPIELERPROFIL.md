# Spielerprofil & Positions-Profil

Seite je Spieler (`/players/:id`) mit Form-Kurve, Kennzahlen und dem Positions-Profil.
Dazu der umgebaute Kader (`/players`) ohne Reiter.

## Routes

- `/players` — `PlayerManager`: eine Liste, kein Tab-Bar mehr. Schlagreihenfolge ist ein
  Modus über derselben Liste, die WhatsApp-Zuordnung liegt in einem Sheet.
  Die Liste ist eine **Tabelle mit festen Spalten** (Name · Positionen · Spiele): die Chips
  stehen untereinander statt hinter unterschiedlich langen Namen, leere Zellen tragen einen
  Strich, und die Aktionsspalte behält ihre Breite auch unsichtbar — sonst springt die Zeile
  beim Überfahren. Die Spaltenköpfe ersetzen den früheren Erklärsatz zur Rangfolge.
  Deep-Links `?tab=whatsapp` (Training-Badge „unbekannte Wähler") und `?tab=batting`
  funktionieren unverändert — sie öffnen jetzt Sheet bzw. Modus.
- `/players/:id` — `PlayerProfilePage`: Kopf (Name, **Positions-Chips zum Bearbeiten**,
  AVG/OBP/Hits/PA), darunter der Zeitraum und die Karten in dieser Reihenfolge: **erst die
  Lage** (Form, Einsatz und Verfügbarkeit, Stärken und Schwächen), **dann das Nachschlagen**
  (Saison für Saison, letzte Spiele, tatsächlich gespielte Positionen). Am Handy ist das die
  Lesereihenfolge; ab `lg` laufen dieselben Karten in zwei Spalten (links die Lage, rechts
  das Nachschlagen), damit beide Spalten ähnlich hoch werden.

## Positions-Profil

Drei geordnete Slots am Spieler: **primaryPosition / secondaryPosition / tertiaryPosition**.

- Eigenes Enum `PositionSlot` — **nicht** `Position`. Position kennt EH (kein Feldposten)
  und keine Gruppen; PositionSlot kennt kein EH, dafür die Sammelwerte **IF**, **OF**, **IF_OF**.
- Die Namen der Einzelpositionen sind identisch zu `Position` (`FIRST_BASE`, `SS`, …) —
  deshalb ist der Backfill ein direktes Kopieren ohne Mapping.
- **P und C stecken in keiner Gruppe**, auch nicht in IF_OF. Wer wirft oder fängt, wird
  explizit benannt. `PositionSlot.expand()` liefert die abgedeckten `Position`-Werte.

### Regeln (`PositionProfileValidator`, 400 bei Verstoß)

- **Keine Lücken:** Sekundär nur mit Primär, Tertiär nur mit Sekundär.
- **Kein Slot doppelt.**
- **Überlappung erlaubt:** Primär `SS` + Sekundär `IF` heißt „am liebsten Shortstop, sonst
  irgendwo im Infield" — eine Aussage, keine Dublette.

**Bearbeitet wird im Kopf**: die Chips neben dem Namen sind der Knopf, der das Sheet
öffnet (Stift-Icon als Hinweis). Daneben steht das **Geschlecht** als eigener Knopf —
gesetzt zeigt er „Frau"/„Mann", leer „Geschlecht festlegen" (gestrichelt). Er öffnet
dasselbe `GenderSheet` wie der Kader, nur für diese eine Person: eine Mechanik, zwei Orte.
Die Zuordnung ist die Grundlage der Frauen-Quote (`docs/LINEUP.md`), deshalb ist sie im
Profil sichtbar und nicht nur im Sammel-Sheet. Eine eigene Karte weiter unten zeigte dieselben drei
Chips ein zweites Mal — die ist raus. Der Stift im Kopf gehört **nur** den Positionen;
Umbenennen und Archivieren liegen hinter den drei Punkten oben rechts, weil ein Name
einmal getippt und dann nie wieder angefasst wird. Zwei Stifte nebeneinander zeigten auf
zwei verschiedene Dinge.

Die UI hält beide Regeln selbst ein: ein Tap auf eine andernorts vergebene Position
**tauscht** die Slots, und das Abwählen eines Slots lässt die folgenden **aufrücken**.
Das Backend lehnt trotzdem ab — die Regel gehört in die Domäne, nicht nur ins Formular.

### Speicherung

Drei nullable Spalten an `players` (V60), keine eigene Tabelle: feste Anzahl, feste
Reihenfolge, keine Historie gewollt. `PlayerResponse` trägt sie mit, damit Kader und
Pool die Chips ohne Extra-Request zeigen.

### Backfill (V61)

Erstbefüllung aus den tatsächlich gespielten Lineups: meistgespielte Position → Primär,
zweithäufigste → Sekundär, dritthäufigste → Tertiär.

- EH und Einträge ohne Position fließen nicht ein.
- Gleichstand wird nach fester Positions-Reihenfolge aufgelöst (P, C, 1B, 2B, 3B, SS, LF, CF, RF) —
  zwei Läufe liefern dasselbe Ergebnis.
- Gruppen rät der Backfill **nicht**; Sammelwerte setzt das Team von Hand.
- Angefasst werden nur Spieler mit komplett leerem Profil — von Hand Gepflegtes bleibt.

## Form-Kurve

**Laufender Schnitt** über alle At-Bats des gewählten Zeitraums, ein Punkt je Spiel
(`formSeries.cumulativeSeries`). Vorher ein gleitendes Fenster über die letzten 20
At-Bats — das sprang bei jedem Spiel, und zwei Spieler ließen sich nicht vergleichen,
weil hinter jedem Punkt eine andere Stichprobe stand.

Gerechnet wird über die angezeigten Punkte: schneidet der Zeitraum-Filter auf ein Jahr
zu, beginnt die Summe bei dessen erstem Spiel. Rein im Frontend — die Roh-Werte je Spiel
stehen in der Zeitreihe, die `rolling*`-Felder des Backends liest die Kurve nicht mehr.

**Nenner je Kennzahl** (`denominator`): AVG und SLG je At-Bat, OBP und OPS je PA. Die
Kopfzeile nennt ihn mit, damit sich der Wert nachrechnen lässt.

**Die Linie beginnt ab 10 At-Bats** (`MIN_AT_BATS`). Davor sagt der laufende Schnitt
nichts: ein 1-aus-1 im ersten Spiel ergibt kumulativ 1.000 und zöge die Achse auf 1.250
hoch. Die Werte zählen trotzdem ab dem ersten Spiel mit, nur der Anfang der Linie wartet.

**Y-Achse ab 0**, sonst bedeutet derselbe Kurvenverlauf bei zwei Spielern etwas anderes.

**X-Achse: ein Spiel, ein Schritt.** Nach echten Datumsabständen verklumpten Spieltage
und Saisonpausen rissen Löcher. Die Zeit kommt über **Monatsmarken** zurück
(`monthTicks`): liegen fünf Punkte zwischen „Mai" und „Jun", war der Monat dicht; fehlt
ein Monat, gab es dort keine Spiele.

**Spielervergleich, bis zu zwei Mitspieler** (`MAX_COMPARE`): „Vergleichen mit …" zieht
deren Reihen nach (`getPlayerBattingTimeline`, gecacht), die Legende nimmt sie per × wieder
raus. Jede Reihe bekommt einen Endpunkt — ohne ihn liest sie sich wie Dekoration statt wie
ein zweiter Spieler. Spiel 5 liegt über Spiel 5 („nach ebenso vielen Spielen"), die kürzere
Reihe endet früher statt gedehnt zu werden.

Farben (`COMPARE_STYLES`): **`#5964C5` gestrichelt** und **teal-700 gepunktet**. Gewählt
nach Messung, nicht nach Geschmack — gegen Cream (lesbar?), gegen die navy-800 der
Hauptlinie (unterscheidbar?) und auf Sättigung (sieht es nach Hausfarbe aus?):

| Farbe | Sättigung | zu Cream | zu navy-800 | |
|---|---|---|---|---|
| navy-800 (eigene Linie) | 59 % | 16.42 | — | |
| `#5964C5` | 48 % | 4.81 | 3.42 | ✓ |
| teal-700 | 77 % | 5.08 | 3.23 | ✓ |
| navy-400 | **24 %** | 4.70 | 3.49 | wirkt als anderes Blau |
| navy-500 | 36 % | 7.46 | **2.20** | zu nah an der Hauptlinie |
| gray-500 | 3 % | 7.27 | **2.26** | zu nah an der Hauptlinie |
| navy-300 | 32 % | **2.28** | 7.21 | auf Cream zu hell |
| softball-red-300 | 86 % | **1.76** | — | lebt von dunklem Grund |

Die Navy-Leiter gibt den Ton nicht her: wer hell genug für Abstand zur Hauptlinie ist
(navy-400), ist mit 24 % Sättigung ausgewaschen und liest sich neben einem satten
navy-800 als *anderes* Blau statt als dasselbe, nur heller. Wer satt genug ist
(navy-500), steht der Hauptlinie zu nah. Deshalb ein eigener Ton im Hausfarbton 234°,
auf Sättigung gebracht.

**Amber und Emerald sind im Haus belegt** (positiv / Sieg, 35× bzw. 26× in Benutzung),
**Rot** ist negativen Signalen vorbehalten und markiert hier schon den eigenen Endpunkt.
Eine Vergleichslinie darf nicht werten, sie soll unterscheiden. Das Pastellrot der
Spielverlaufs-Seite funktioniert dort auf dunklem Navy (9.86) und fällt auf Cream auf 1.76.

Der Strich ist der zweite Kanal, damit die Reihen auch ohne Farbunterscheidung lesbar
bleiben — auf Papier oder bei Farbsehschwäche.

**Keine Verlaufsflächen unter den Linien.** Bei drei Reihen überlagern sich die Flächen zu
Matsch; die Achse beginnt bei 0, eine Fläche unter einer .400-Linie füllt also zwei Drittel
des Bildes ohne Aussage; und die Fläche unter einer Quote bedeutet nichts — ein Schnitt ist
keine Menge, die sich aufsummiert.

**Antippen und Wischen statt Zielen.** Früher hatte jeder Punkt seine eigene Trefferfläche
— bei 17 Spielen waren die 7–14 px breit, eine Fingerkuppe deckte drei bis sechs davon.
Jetzt liegt **eine** Fläche über dem ganzen Graphen: getippt wird der nächstgelegene Punkt,
und beim Ziehen wandert die Auswahl mit, ohne neu zu zielen (`waehleBeiX`, Pointer-Capture
wo der Browser es kennt). `touch-action: pan-y` lässt das senkrechte Scrollen in Ruhe.

Eine **senkrechte Fanglinie** (gray-400) markiert den gewählten Punkt — die Fingerkuppe
deckt ihn zu, die Linie ragt darüber hinaus. Der Hinweistext nennt je nach Eingabeart
Wischen oder Maus (`[@media(hover:hover)_and_(pointer:fine)]`).

**Unter der Legende steht, wie die Achse zu lesen ist** („Ein Schritt je Spiel · Monate
zeigen, wie dicht sie lagen") — außerhalb der Legende, sonst verschwände der Satz
ausgerechnet beim Vergleich. Er erklärt zugleich, warum ein Monat fehlen kann: dort gab
es keine Spiele.

**Zu wenig At-Bats:** erreicht kein Punkt die Schwelle, wird gar nicht gezeichnet, sondern
„Noch zu wenig At-Bats für eine Kurve — 3 von 10" gezeigt. Vorher zeichnete der Rückfall
genau das, was er für aussagelos erklärt: drei Treffer aus drei Versuchen ergaben einen
Strich quer auf 1.000.

**Detailzeile fest hoch**, damit beim Wandern von Punkt zu Punkt nichts springt; der
Vergleichswert steht auf eigener Zeile statt angehängt, sonst schnitt ihn `truncate` ab.

## Letzte Spiele (`GameLog`) und Saison für Saison (`SeasonTable`)

Beide rechnen aus der Zeitreihe, ohne zweiten Request.

- **Letzte Spiele**: die acht jüngsten zuerst, mit Trefferquote des Abends und dem, was
  sonst passiert ist (RBI, BB, K, SB). Die Kurve zeigt die Richtung, hier steht der Abend.
- **Saison für Saison** ignoriert die Jahres-Chips der Seite absichtlich: ein Vergleich,
  bei dem man die Vergleichsjahre wegklicken kann, vergleicht nichts.

## Zeitraum-Filter (Jahre und Saisons)

**Eine** Chip-Leiste über den Karten: **Alle**, dann die Jahre (nur bei mehreren), dann die
**Saisons**, in denen diese Person gespielt hat — neueste zuerst, bei gewähltem Jahr nur
dessen Saisons. Liga-Saison und Wochenend-Turnier sind verschiedene Spiele; genau so will
man sie lesen.

Der Zeitraum hängt an **einer nativen Auswahl** (`optgroup` Jahr / Saison, Werte `all`,
`year:…`, `season:…`) in der Pillen-Optik der Spiel-Verlauf-Filter (`SELECT_PILL_CLASS`).
Eine Reihe Chips dafür war am Handy entweder drei Reihen hoch oder eine Leiste zum Wischen,
bei der die Hälfte der Saisons unsichtbar blieb. Daneben steht „Zurücksetzen", sobald der
Zeitraum nicht „Alle Spiele" ist. Die Kennzahlen der Kurve (AVG · OBP · SLG · OPS) sitzen
dagegen in **einem Schalter mit vier Stellungen** — vier Werte, immer sichtbar.

Der Filter schaltet **alle** Zahlen um, nicht nur die Kurve:

- Kopf-Kennzahlen, Form-Kurve und letzte Spiele werden aus der Zeitreihe geschnitten —
  kein Request nötig, die Punkte tragen `year` und `seasonId`.
- Teamvergleich (`/years/{year}/batting-stats` bzw. `/seasons/{id}/batting-stats`),
  gespielte Positionen (`/years/{year}/stats` bzw. `/seasons/{id}/stats`) und Einsatz
  (`/players/{id}/usage?year=` bzw. `?seasonId=`) kommen gerechnet aus dem Backend und
  werden beim Wechsel nachgeladen. Stammdaten und Zeitreihe bleiben stehen.
- Beim Nachladen **blassen die betroffenen Karten ab**, statt gegen Skelette getauscht zu
  werden — sonst springt die Seite bei jedem Chip-Tap.
- **Kein Zeitraum-Text in den Karten**: der Filter steht oben und gilt für die ganze Seite.
- Der gleitende Schnitt der Kurve bleibt der laufende Form-Wert über die letzten 20
  At-Bats — er endet nicht an der Saisongrenze, auch wenn die Kurve nur die Spiele
  einer Saison zeigt.
- Die Listen stammen aus der Zeitreihe: ein Jahr oder eine Saison ohne gescorte At-Bats
  taucht nicht auf.
- **Saison für Saison ignoriert den Filter** — sie ist der Vergleich.

## Einsatz und Verfügbarkeit (`UsagePanel`, `GET /api/players/{id}/usage`)

Die Schlagzahlen sagen, wie gut jemand trifft; dieses Bild sagt, wie oft man mit ihm planen
kann. Gerechnet wird im Backend (`PlayerUsageCalculator`), weil Spieltage, Lineups und
Trainings dafür zusammenkommen müssen.

- **Zugesagt** (in `availablePlayers`) und **aufgestellt** (im Lineup oder als DH-Batter)
  stehen getrennt — der Unterschied ist die eigentliche Information.
- **Nur Vergangenes zählt**: ein Spieltag in zwei Wochen sagt nichts über Verlässlichkeit.
  Abgesagte Trainings zählen aus demselben Grund nicht.
- **Gezählt wird ab dem ersten Auftauchen** (erste Zusage, erste Aufstellung oder erstes
  besuchtes Training). Wer im Mai dazugestoßen ist, hat den April nicht versäumt.
- **Schlagplatz**: Schnitt plus Verteilung über alle zehn Plätze — auch die leeren, denn
  die Lücken sind die Aussage. Als DH-Batter zählt der Platz des Gastgebers, weil genau
  dort geschlagen wird.
- Spieltage, nicht Spiele: ein Spieltag hat zwei Spiele, die gewichtete Spielzahl im Kader
  (EH/DH = 0,5) ist eine andere Größe.
- `?year=` / `?seasonId=` (`UsageScope`) schneiden Spieltage **und** die
  Schlagplatz-Verteilung zu (eigene Queries je Jahr und Saison) — sonst stünde eine
  Alle-Jahre-Verteilung neben Saisonquoten.
- **Trainings hängen an keiner Saison.** Im Saison-Zuschnitt bleiben sie leer, statt über
  ein geratenes Datumsfenster hineingerechnet zu werden; die Karte sagt das auch.

## Stärken und Schwächen (`StrengthsPanel`)

Jede Kennzahl gegen den Schnitt des **übrigen** Kaders: AVG, OBP, SLG, OPS, Walk-Quote,
Strikeout-Quote, Steal-Quote. Balken = eigener Wert, Kerbe = Teamschnitt, daneben die
Differenz mit Richtungspfeil.

- Eine Zahl allein sagt wenig — .300 ist stark oder mittelmäßig, je nach Kader.
- **Nur `qualified`-Spieler** (≥ 5 At-Bats) bilden den Schnitt, sonst zöge ein 1-für-1 ihn hoch.
- **Zählwerte werden normiert:** Steals als Quote je Auftritt am Schlag. Rohzahlen würden
  einen Spieler mit 21 Spielen gegen einen mit 90 stellen.
- **Strikeouts sind invertiert** (`higherIsBetter: false`): der Pfeil zeigt die Richtung,
  die Farbe die Wertung — nach oben und trotzdem rot.
- Quelle ist `/api/stats/all-time/batting` (alle Spieler, ein Request) — dieselben Zahlen
  wie auf der Statistik-Seite, keine zweite Rechenwahrheit.

## Dateien

**Backend**
- `domain/model/PositionSlot.java`, `domain/model/PlayerFormPoint.java`, `domain/model/PlayerUsage.java`
- `domain/service/PositionProfileValidator.java`, `domain/service/BattingTimelineCalculator.java`,
  `domain/service/PlayerUsageCalculator.java`
- `application/PlayerProfileService.java` (bewusst neben `BattingStatsService`: die rechnet
  Tabellen über Spieler-Mengen, hier geht es um den Verlauf eines einzelnen)
- `adapter/in/web/PlayerController.java` — `GET /{id}`, `GET /{id}/batting-timeline`,
  `GET /{id}/usage`, `PUT /{id}/positions`
- Ports: `AtBatRepository.findByBatterIdOrderByGameAndSequence`, `GameRepository.findAllByIdWithDetails`,
  `LineupEntryRepository.findGameDayIdsByPlayerId` / `findBattingOrdersByPlayerId`,
  `GameDayRepository.findGameDayIdsByAvailablePlayer`, `TrainingAttendanceRepository.findByPlayerId`
- Migrationen `V60__player_position_profile.sql`, `V61__backfill_position_profile.sql`

**Frontend**
- `components/players/PlayerProfilePage.tsx`, `FormChart.tsx`, `StrengthsPanel.tsx`,
  `GameLog.tsx`, `SeasonTable.tsx`, `UsagePanel.tsx`, `PositionBadges.tsx`, `PositionProfileSheet.tsx`
- `hooks/usePlayerProfile.ts`
- `components/players/PlayerManager.tsx` (Kader ohne Reiter)

## Farbe

Die Seite ist Navy auf Cream. Rot kommt an genau zwei Stellen vor, und beide meinen
Verschiedenes:

- **Gedämpftes Rot (`softball-red-300`) für kleine Labels auf Navy**: die KPI-Beschriftungen
  im Kopf, wie im Spiel-Verlauf. Nur auf dunklem Grund — auf Cream verwäscht dieser Ton.
  Ein zusätzlicher roter Balken am Kopf war einmal da und ist wieder raus: zwei
  Marken-Marker auf einer Fläche sind einer zu viel.
- **Rot als Wertung**: die negativen Differenzen in „Stärken und Schwächen" (emerald für
  die positiven). Diese Zuordnung aus `CLAUDE.md` bleibt unangetastet.
- Dazu **ein** farbiger Punkt in der Kurve: der jüngste. Er sagt „hier steht er gerade",
  nicht „das ist schlecht" — deshalb ist er der einzige gefüllte Punkt der Linie.

Mehr Farbe bekommt die Seite nicht: die Balken in Teamvergleich, Einsatz und Positionen
bleiben Navy. Eine Ampel über Anwesenheitsquoten würde Personen bewerten, nicht Daten.

## Länge am Handy

Die Seite ist ein Dashboard, kein Formular — sie darf scrollen, aber nicht ausufern:

- **Reihenfolge nach Wichtigkeit**, weil die DOM-Reihenfolge am Handy die Lesereihenfolge ist.
  Das Spiel-Log steht deshalb unten: man liest es, wenn man ins Detail will, nicht beim Öffnen.
- **„Tatsächlich gespielt" zeigt vier Posten**, der Rest hinter „Alle n zeigen". Die langen
  Listen sind Aushilfs-Einsätze.
- **Die drei Nachschlage-Karten starten am Handy zugeklappt** (`CollapsibleCard`: „Saison
  für Saison", „Letzte Spiele", „Tatsächlich gespielt"), ab `sm` offen. Zugeklappt tragen sie
  statt der Erklärzeile eine Zusammenfassung („24 gescorte Spiele im Detail", „7 Posten in
  38.5 Spielen"), damit der Kopf nicht leer wirkt. Das bringt **3,1 → 2,3 Bildschirme** am
  390er-Handy.
- Der Zustand **folgt dem Breakpoint** (`useSyncExternalStore` auf der Media Query), bis
  jemand selbst tippt — sonst bliebe eine am Handy zugeklappte Karte auch nach dem Drehen
  oder im Desktop-Fenster zu. Ab dem ersten Tipp gilt die eigene Entscheidung.
- **Keine Tabs**: sie würden genau die Gegenüberstellung zerschneiden, für die man das
  Profil aufmacht (Form neben Einsatz neben Teamvergleich), kosten einen Tap pro Blick und
  bringen Zustand mit (aktiver Tab, Zurück-Button, Deep-Link). Aufklappen erreicht dasselbe
  Ziel, ohne die Reihenfolge zu zerschneiden: die Karten bleiben sichtbar an ihrem Platz.

## Fallstricke

- **Der Graph ist handgezeichnetes SVG** und misst seine Breite per `ResizeObserver`.
  Eine feste `viewBox` skaliert am Handy die Beschriftung mit und drückt die Kurve flach.
- `path.getTotalLength()` fehlt in jsdom — die Einzeichen-Animation ist deshalb defensiv
  gekapselt, sonst brechen Tests.
- **Sheet-Inhalte brauchen eigene Polsterung:** `ResponsiveSheet` setzt im Body bewusst
  kein Padding.
- `AtBatMapper.toDomain` füllt nur `game.id` — Datum, Gegner und Saison kommen über die
  Game-Map in den Calculator, nicht über das AtBat.
- Die **Lineup-Vorschläge lesen das Profil noch nicht** (`LineupSuggestionEngine` bleibt bei
  Fairness + Anwesenheit). Erst Profile pflegen, dann koppeln.
