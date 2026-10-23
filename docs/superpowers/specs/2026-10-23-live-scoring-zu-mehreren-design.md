# Live-Scoring zu mehreren

Design-Dokument, 2026-10-23. Projekt 2 von zwei. Setzt Projekt 1 voraus
(`2026-10-23-accounts-und-rollen-design.md`) — ohne Accounts gibt es kein „wer ist drin"
und kein Scorer-Recht.

Betrifft ausschließlich das **Legacy-Scoring** (`ScoringPage`, `useScoring`,
`GameScoringService`). Der Spielbogen bleibt unberührt und bleibt Einzelbedienung.

## Warum

Hung scort und schlägt im selben Spiel. Wenn er an die Platte muss, liegt das Telefon auf
der Bank und niemand trägt ein. Umgekehrt: wenn zwei auf eigene Faust mitschreiben, steht
der At-Bat doppelt drin, und das merkt man drei Innings später.

Zweiter Grund, vom User selbst genannt und mindestens so wichtig: **Zuschauen ist der
Lehrplan.** Scoring lernt keiner aus der Anleitung. Wer auf der Bank das Feld live
mitlaufen sieht und bei jedem Out die Bewegung mitbekommt, versteht nach zwei Spielen, was
passiert — und dem traut man dann auch den Stift zu. Das Zuschauen ist die Rampe ins
Mitmachen, kein Beiwerk.

## Ziele

- Jeder Angemeldete kann einem laufenden Spiel live zusehen, ohne irgendwo draufzudrücken.
- Es ist sichtbar, wer gerade im Spiel drin ist.
- Genau einer schreibt. Die anderen sehen, wer das ist, und können den Stift übernehmen.
- Änderungen sind als Bewegung erkennbar, nicht als stilles Umspringen von Zahlen.

## Nicht-Ziele

- Kein gleichzeitiges Schreiben, keine Konfliktauflösung, kein Zusammenführen.
- Kein Chat, keine Reaktionen, keine Benachrichtigungen aufs Telefon.
- Der Spielbogen kriegt das nicht. Nicht in diesem Projekt.
- Kein Offline-Betrieb des Zuschauens.

## Anti-Ziele

- **Ein bestehender Ablauf wird schwergängiger.** Wer heute allein scort, darf keinen
  Klick mehr brauchen als vorher. Insbesondere: wer den Stift hat, merkt nichts von dem
  ganzen Mechanismus.
- **Ein Regress im Scoring.** Dieser Pfad wird im Projekt bewusst risikoscheu behandelt.
  Wenn das Risiko nicht klein und belegbar ist, wird nicht gebaut.
- **Der Stift klemmt.** Keine Lage, in der niemand mehr schreiben kann, weil jemand das
  Telefon weggesteckt hat.
- **Animation als Selbstzweck.** Sie soll Verstehen tragen, nicht hübsch sein. Was blinkt
  ohne Bedeutung, wird weggeguckt.

## Entscheidungen des Users

| Frage | Entscheidung |
|---|---|
| Zuschauen | Darf jeder Angemeldete |
| Schreiben | Nur mit Scorer-Recht am Account (aus Projekt 1). Mehrere dürfen es haben |
| Gleichzeitig schreiben | Nein. Einer hat den Stift, die anderen gucken |
| Stift wechseln | Per Klick übernehmbar, alle sehen den Wechsel |
| Aktualisieren | Automatisch, Push. Kein Knopf, kein Nachladen |
| Wer ist drin | Soll in der Scoring-Ansicht sichtbar sein |
| Änderungen sehen | Per Animation erkennbar, „damit es kein Heckmeck gibt" |
| Umfang | Legacy-Scoring, nicht Spielbogen |
| Offener Korrekturbogen bei Stiftverlust | **Nicht zuklappen.** Grau werden, erklären, weitergucken lassen |
| Aufmerksamkeit | Am Feld sind die Leute beim Spiel, nicht bei der App. Siehe Leitlinie |
| Nginx | Soll ohne den User erledigt werden können, wenn Zugang da ist. Rückfall trotzdem einbauen |

## Entscheidungen des Autors

- **Server-Sent Events statt WebSocket.** Der Fluss ist einseitig: Server erzählt, Browser
  hört zu. Geschrieben wird weiter über die bestehenden REST-Aufrufe. SSE braucht keine
  zusätzliche Abhängigkeit — Spring kann `SseEmitter` von Haus aus — und überlebt
  Verbindungsabbrüche mit eingebautem Wiederverbinden.
- **Der Stift ist eine weiche Reservierung, keine Sperre im Datenmodell.** Begründung
  unten.
- **Ereignisse tragen den Zustand nicht, nur eine kleine Beschreibung für die Animation.**
  Der Zustand kommt immer aus `reload()`. Begründung unten.
- **Jedes Ereignis trägt die Herkunft**, damit der auslösende Tab es ignorieren kann.
- **`reload()` wird um Lineup, Wechsel und Game-Zeile erweitert — für alle**, nicht nur
  für Zuschauer. Begründung unten.
- **Zwei Transporte hinter einer Schnittstelle:** Strom als Vorgabe, Nachfragen als
  Rückfall. Nimmt dem Nginx-Risiko die Sperrwirkung.
- **Ablauf des Stifts: 2 Minuten ohne Schreibvorgang**, angehalten solange ein
  Korrekturbogen offen ist. Zahl geraten, soll am Feld überprüft werden.

## Der entscheidende Fund — und wo er endet

`useScoring` lädt nach **jeder** Schreibaktion neu:

```ts
const recordAtBat = useCallback(async (req) => {
  const created = await api.recordAtBat(gameId, req)
  await reload()
  return created
}, [gameId, reload])
```

Das gilt für `recordAtBat`, `undo`, `recordStealingEvent`, `recordAutomaticOut`,
`deleteStealingEvent` und alle vier Uhr-Aktionen. Daraus folgt der Zuschnitt dieses
Projekts: **Zuschauen ist „Ereignis empfangen → `reload()` aufrufen".** Kein
Zusammenführen von Zustand, kein Anwenden einzelner Ereignisse, keine Reihenfolgen-Frage.
Der Zuschauer macht, was der Schreiber ohnehin macht.

**Aber `reload()` deckt nicht alles ab.** Es holt genau drei Dinge: `getAtBats`,
`getStealingEvents`, `getScoreboard`. Drei weitere Teile des Serverzustands hält
`ScoringPage` daneben, jeweils einmal geladen:

| Zustand | Stelle | Wird heute erneuert durch |
|---|---|---|
| `lineup` | `ScoringPage.tsx:112` | nichts |
| `substitutions` | `ScoringPage.tsx:115` | nur die eigene Wechsel-Aktion |
| `currentGame` (daraus `battingSide`, Spielstand, Spielende) | `ScoringPage.tsx:92` | nur die eigenen Aktionen, lokal gesetzt |

Für einen Zuschauer hieße das: richtige Läufer, richtiger Schlagmann — aber **nach einem
Spielerwechsel veraltete Namen im Schlagplan**, kein Seitenwechsel, kein Spielende, keine
korrigierte Gegnerzahl. Die Vorschau auf die nächsten Schlagleute ist genau das, woran man
auf der Bank das Spiel mitliest. Stehengeblieben ist sie wertlos.

**Entscheidung: `reload()` wird für alle erweitert**, Schreiber wie Zuschauer, um Lineup,
Wechsel und die Game-Zeile. Zwei zusätzliche GET-Aufrufe pro Eintrag.

Die Alternative — Zuschauer laden mehr als Schreiber — wäre billiger im Netz und teurer in
allem anderen: sie macht aus einem Pfad zwei, und der zweite ist neuer Code, der für sich
korrekt sein muss. Genau dort laufen Zuschauer- und Schreiberbild irgendwann auseinander,
und niemand merkt es, weil nur der Zuschauer das falsche Bild sieht. Ein Pfad, den alle
benutzen, wird von allen getestet.

Die zwei Aufrufe kosten den Schreiber keine spürbare Zeit: sie laufen parallel zu den
dreien, die er ohnehin macht, und sein Bild wird sowieso erst nach dem letzten gezeichnet.

**Was weiterhin gilt:** der Schreib**pfad** wird nicht angefasst. Kein
`GameScoringService`, kein `recordAtBat`, keine Undo-Logik, keine Inning-Advance. Erweitert
wird das Nachladen, nicht das Schreiben.

## Der aufgeschobene At-Bat

Ein Teil des Spiels, den der erste Entwurf übersehen hatte und der den Stift mitbestimmt.

Bei einem Hit mit Läufern auf Base geht der At-Bat **nicht sofort** zum Server
(`ScoringPage.tsx:311-345`): der `CorrectionSheet` öffnet sich, der Diamond friert lokal
ein (`freezeDiamondUntilCorrection`), und erst die Bestätigung schickt den Eintrag. Dazwischen
können Minuten liegen.

Daraus folgen zwei Regeln, die ohne diesen Umstand nicht nötig wären:

1. **Ein offener Korrekturbogen hält den Stift fest.** Die Zwei-Minuten-Uhr läuft nicht,
   solange der Bogen offen ist. Wer überlegt, ob das ein Hit oder ein Error war, soll nicht
   nebenbei den Stift verlieren. Das ist der häufige Fall, und er muss weich sein.
2. **Wer den Stift bewusst abgibt oder verliert, dessen offener Eintrag wird nicht
   gespeichert.** Sonst entsteht genau der Doppeleintrag, gegen den das Projekt gebaut ist:
   A hält einen Hit offen, B übernimmt und trägt denselben At-Bat ein, A bestätigt
   nachträglich — der At-Bat steht zweimal drin.

Wie Regel 2 aussieht, steht unter „Oberfläche". Sie schließt den Bogen **nicht**.

## Leitlinie: wenig Aufmerksamkeit

Ausdrücklich vom User gesetzt, und sie wiegt in diesem Projekt schwerer als Vollständigkeit:
**am Spielfeldrand ist niemand konzentriert bei der App.** Die Leute wollen aufs Spiel
gucken.

Daraus:

- Nichts verlangt einen Tipp, nur um weiterzugucken. Kein Dialog, der den Blick kostet.
- Kein Zustand springt weg, während jemand hinsieht.
- Die Präsenzleiste ist eine Zeile, kein Panel.
- Zuschauen ist der Grundzustand, kein Modus, den man einschaltet.
- Auf einen Blick erfassbar: wer schlägt, wer steht drauf, wie viele Out.

Wo diese Leitlinie mit Lückenlosigkeit kollidiert, gewinnt sie.

## Server

### Ereignisstrom

`GET /api/games/{gameId}/live` — ein `SseEmitter` pro Zuschauer. Ereignisarten:

| Ereignis | Nutzdaten | Wirkung im Browser |
|---|---|---|
| `changed` | `{ art, herkunft, anzeige }` — siehe unten | `reload()`, danach Animation |
| `presence` | `[{ username, playerName, mayScore }]` | Leiste „wer ist drin" neu zeichnen |
| `pen` | `{ username \| null, seit }` | Stiftanzeige und Knopfzustand |
| `ping` | — | Nur damit Zwischenstellen die Verbindung nicht kappen |

`art` ist eine von `ATBAT`, `STEAL`, `UNDO`, `INNING`, `SUB`, `SIDE`, `SCORE`, `GAME_END`,
`CLOCK`, `RESET`. Die vier mittleren fehlten im ersten Entwurf — sie entstehen in
`GameController`, nicht in `ScoringController`, und ohne sie bliebe das Zuschauerbild
stehen.

`herkunft` ist die Kennung des Browsers, der die Änderung ausgelöst hat. Jeder Tab würfelt
sie beim Start aus, `request<T>` schickt sie als Header `X-Client-Id` bei **jedem** Aufruf
mit — eine Zeile in der gemeinsamen Hülle, nicht im Scoring-Code. Wer sein eigenes Ereignis
empfängt, ignoriert es. Ohne das lädt der Schreiber nach jedem Klick zweimal, und der
zweite Ladevorgang fällt mitten in seine laufenden Aufblitz-Animationen
(`homerunFlash`, `stealFlash`, `scoredFlash`) oder auf einen offenen Korrekturbogen. Das
wäre die wahrscheinlichste Quelle eines Scoring-Regresses im ganzen Projekt.

Eine Kennung je Tab, nicht je Nutzer: wer zwei Geräte benutzt — Handy auf der Bank, Tablet
im Dugout — soll auf dem einen sehen, was er auf dem anderen eingetragen hat.

`anzeige` ist eine kleine, rein beschreibende Nutzlast **allein für die Animation**:
welcher Schlagmann, welches Ergebnis, welcher Läufer von wo nach wo, bei `UNDO` was
zurückgenommen wurde. Sie wird **nie** in den Zustand geschrieben — der kommt
ausschließlich aus `reload()`.

Das weicht die ursprüngliche Regel „keine Nutzdaten" auf, und zwar bewusst. Die Alternative
wäre, die Animation aus dem Unterschied zweier Scoreboards abzuleiten. Dann rechnete der
Browser selbst aus, was passiert ist — eine zweite Auslegung des Spielstands neben der des
Backends, genau die Fehlerklasse, die die Regel vermeiden sollte. Eine Nutzlast, die nur
Bewegung steuert und nie Wahrheit, ist das kleinere Übel.

Eine `LiveScoringHub`-Komponente in `application/` hält die Emitter je Spiel, verteilt,
räumt beim Abbruch auf. Keine Datenbank, kein Zustand der einen Neustart überleben muss —
nach einem Neustart verbinden sich die Browser neu, die Präsenz baut sich in Sekunden neu
auf und der Stift ist frei. Das ist nicht schlimm, es ist der gewünschte Rückfall.

Dass ein Schreibvorgang stattgefunden hat, erfährt der Hub über einen schlanken Filter, der
nach erfolgreicher Antwort (2xx) verteilt. Er hört auf eine **ausdrückliche Liste** von
Pfadmustern, nicht auf `/api/games/**` — unter dem Präfix liegen auch die Lineup-Änderungen
des Planers, die kein Scoring-Ereignis sind:

```
/api/games/*/atbats**        /api/games/*/score
/api/games/*/scoring/**      /api/games/*/batting-side
/api/games/*/stealing-events**  /api/games/*/substitutions
/api/games/*/clock/**        /api/games/*/end
                             /api/games/*/reopen
```

Der Filter ist die risikoärmere Variante gegenüber einem Ereignis aus dem
`GameScoringService`: er erfordert dort keine Zeile Änderung. Die `anzeige`-Nutzlast kann er
aus der Antwort des Endpunkts ableiten, die ohnehin schon den erzeugten At-Bat oder das
Undo-Ergebnis enthält.

### Der Stift

`PenHolder` je Spiel, im Speicher: `{ username, seit, letzterSchreibvorgang }`.

- Wer schreibt und niemand hat den Stift, bekommt ihn automatisch. Wer allein scort, merkt
  nie, dass es ihn gibt.
- `POST /api/games/{id}/live/pen` übernimmt den Stift. Immer erfolgreich — es ist eine
  Übergabe, keine Bitte. Es gibt niemanden, vor dem man einen Mitspieler schützen müsste.
- Liegt der letzte Schreibvorgang länger als zwei Minuten zurück, ist der Stift frei und
  der nächste Schreibvorgang nimmt ihn.
- **Ein offener Korrekturbogen hält den Stift.** Solange er offen ist, schickt der Browser
  alle 30 Sekunden ein Lebenszeichen, und die Uhr läuft nicht. Ohne das verlöre genau der
  den Stift, der gerade am gründlichsten arbeitet.
- `DELETE …/pen` gibt ihn freiwillig zurück.

**Warum weiche Reservierung und keine Sperre:** Eine echte Sperre müsste den
Schreib-Endpunkt ablehnen, wenn der Anrufer den Stift nicht hat. Das ist genau die Art
Verschärfung eines bestehenden Pfades, die hier nicht passieren darf — ein Admin, der den
Stift aus irgendeinem Grund nicht hat, stünde plötzlich vor einem 409, wo vorher alles
ging. Der Stift lebt daher in der Oberfläche: Knöpfe sind grau, der Hinweis steht da, aber
der Endpunkt nimmt weiter an, was er immer angenommen hat. Doppeleinträge werden dadurch
praktisch unmöglich, nicht theoretisch.

Das ist eine bewusste Abwägung: Regressionsfreiheit vor Lückenlosigkeit. Wer das anders
will, verschärft den Endpunkt später — aber dann als eigene, gemessene Änderung.

### Authentifizierung des Stroms

Hier liegt die eine echte offene Frage. `EventSource` kann keine eigenen Header setzen,
also kommen die Basic-Credentials nicht auf dem gewohnten Weg mit. Drei Wege:

1. **`fetch` mit `ReadableStream`** statt `EventSource`. Header funktionieren, SSE von Hand
   zerlegen, Wiederverbinden selbst schreiben. Etwa fünfzig Zeilen.
2. **Kurzlebiger Token in der URL.** `/api/me` gibt einen aus, gültig ein paar Minuten, der
   Strom akzeptiert ihn. Landet in Server-Logs.
3. **Zusätzliches Cookie beim Anmelden.** Nur für den Strom. Zieht CSRF-Überlegungen nach
   sich, das ist heute abgeschaltet.

Empfehlung: **(1)**. Keine neuen Geheimnisse, keine Logspuren, keine CSRF-Fragen, und das
Wiederverbinden lässt sich ohnehin am besten selbst steuern. Die Entscheidung gehört in
die Planung von Projekt 2, nicht hierher.

### Transport mit Rückfall

Der Browser spricht nicht direkt mit `EventSource`, sondern mit einer **Transport-Schnittstelle**
mit zwei Austauschteilen:

- **Strom (Vorgabe):** offene Leitung, Server schiebt.
- **Nachfragen (Rückfall):** alle 3 Sekunden `reload()`, Präsenz und Stift alle 10. Spürbar
  träger und ohne saubere Animation, aber es funktioniert überall.

Gewechselt wird automatisch: kommt der Strom nach zwei Versuchen nicht zustande oder reißt
er dreimal in kurzer Folge, schaltet der Browser auf Nachfragen und probiert den Strom alle
paar Minuten erneut.

Damit ist das Nginx-Risiko entschärft. Es blockiert nichts mehr, es verschlechtert nur.

### Betrieb

Nginx liegt auf dem Server unter `/opt/softball/nginx/default.conf` und **nicht im
Repository**. Für den Strom braucht es dort `proxy_buffering off` und einen langen
`proxy_read_timeout`. Ohne das sammelt Nginx die Nachrichten, bis genug zusammen ist — das
Out käme nicht nach einer Sekunde an, sondern nach Minuten oder gar nicht.

Das ist Handarbeit auf dem VPS, kein Schritt im automatischen Deploy. Die Umgebung, in der
dieser Entwurf entstanden ist, kommt an den SSH-Schlüssel des Users nicht heran; wer das
umsetzt, braucht entweder eigenen Zugang oder gibt dem User die zwei Zeilen zum selbst
Einsetzen. Ein Eingriff in die Produktiv-Nginx wird vorher einzeln abgestimmt.

Dank des Rückfalls ist das kein Blocker: ohne die Nginx-Änderung läuft das Zuschauen über
Nachfragen, nur träger.

Der Service Worker cacht `/api`-GETs mit `NetworkFirst`. Der Strom-Endpunkt muss davon
ausgenommen werden, sonst frisst der Cache die Verbindung.

## Oberfläche

### Präsenzleiste

Eine schmale Zeile in der `ScoringPage`: wer ist gerade drin, wer hat den Stift. Auf dem
Handy eine Reihe kleiner Kreise mit Initialen, der Stiftinhaber hervorgehoben. Tippen
zeigt die Namen.

Für wen das Scorer-Recht gilt, daneben „Übernehmen". Für alle anderen gar kein Knopf — nicht
ein grauer, den man nicht drücken kann.

### Zuschauer-Modus

Wer den Stift nicht hat, sieht dieselbe Seite. Diamond, Schlagplan, Scoreboard, alles wie
gewohnt. Nur die Eingabeknöpfe sind ausgegraut, und darüber steht, wer gerade scort.

Es gibt bewusst keine eigene Zuschauer-Ansicht. Wer zusehen lernt, soll genau das Bild
sehen, das er später selbst bedient.

### Die Tür

Die Route ist `/gameday/:id/scoring/:gameIndex`, und der einzige Weg dorthin führt heute
über den `GameDayPlanner` — eine Planungsseite, die Projekt 1 Spielern verschließt. Ohne
eine eigene Tür gäbe es das Zuschauen, und niemand fände es.

- Ein neuer Lese-Endpunkt beantwortet „läuft gerade ein Spiel, und wenn ja, welches".
- Auf dem Spieler-Dashboard aus Projekt 1 erscheint dann eine Kachel „Spiel läuft — zusehen".
- `ScoringPage` läuft außerhalb des `Layout` und hat keine Navigation. Sie bekommt einen
  Zurück-Knopf, der dorthin führt, wo man hergekommen ist.

### Stiftverlust mit offenem Korrekturbogen

Der Bogen **klappt nicht zu**. Er wird grau: oben eine Zeile „Lisa scort jetzt — das hier
wird nicht gespeichert", die eigene Eingabe bleibt sichtbar, ein Knopf „Schließen".
Dahinter läuft das Spiel live weiter.

Das folgt der Leitlinie: niemandem springt etwas weg, während er hinsieht, und niemand muss
tippen, um weitergucken zu dürfen. Der Eintrag ist verloren — das ist der Preis dafür, dass
er nicht doppelt in den Bogen kommt — aber der Verlust wird erklärt statt vollzogen.

Wer übernehmen will, wird vorher gewarnt: „Hung hat gerade einen Eintrag offen. Trotzdem
übernehmen?" Meistens reicht das, und Lisa wartet zehn Sekunden oder ruft rüber. Nur wer
diese Frage bewusst mit Ja beantwortet, nimmt jemandem etwas weg.

### Animation

Jede Änderung, die durch den Strom kommt, wird als Bewegung gezeigt, nicht als Sprung.
Der Zweck ist, dass man auf der Bank mitkriegt, *was* passiert ist, ohne hinzugucken was
sich geändert hat.

- Runner wandern über die Base-Wege, sie springen nicht
- Der neue Eintrag im Schlagplan blendet ein und wird kurz unterlegt
- Ein Out zählt sichtbar hoch
- Beim Inning-Wechsel läuft das Feld einmal durch
- Beim Undo läuft die Bewegung **rückwärts** — das ist der Fall, in dem Zuschauer sonst
  rätseln

Für den, der den Stift hat, bleibt alles wie heute: seine eigene Aktion wird sofort gezeigt,
ohne Wartezeit auf eine Animation. Die Animation gilt dem, der zusieht.

Bewegungsdauern in der Größenordnung 200–400 ms, Beschleunigung weich. `prefers-reduced-motion`
wird respektiert — dann bleibt die kurze farbige Unterlegung, die Bewegung fällt weg.

**Für die Prüfung heißt das:** `playwright.config.ts` setzt `reducedMotion: 'reduce'` für
die ganze Suite. Die Zuschauer-Animation läuft dort also grundsätzlich nicht. Entweder
bekommt sie einen eigenen Projekteintrag in der Playwright-Konfiguration, oder sie bleibt
ungetestet — dann steht das hier als bewusste Lücke, nicht als Versehen.
Dark-Only wie der Rest, Rot nur für negative Signale (Out, Stranding).

## Risiken

| Risiko | Gegenmittel |
|---|---|
| **Regress im Scoring** | Schreibpfad wird nicht angefasst. E2E-Suite (77 Tests) vor dem Merge, wie in CLAUDE.md gefordert |
| **Der Stift klemmt** | Zwei Minuten Leerlauf gibt ihn frei. Übernehmen gelingt immer. Neustart gibt ihn frei |
| **Zwei schreiben trotzdem gleichzeitig** | Möglich, weil der Endpunkt nicht sperrt. Bewusst in Kauf genommen — die Oberfläche macht es unwahrscheinlich |
| **SSE kommt durch Nginx nicht durch** | Vor dem Bau am Server prüfen. Steht als erster Schritt im Plan |
| **Der Service Worker frisst den Strom** | Endpunkt vom Caching ausnehmen |
| **Viele Zuschauer, viele `reload()`** | Zwölf Leute × ein Rundlauf je At-Bat. Unkritisch. Falls doch: Ereignisse auf ~500 ms bündeln |
| **Animation lenkt den ab, der scort** | Für den Stiftinhaber keine Animation seiner eigenen Aktion |
| **Der Schreiber lädt nach jedem eigenen Klick zweimal** | Jedes Ereignis trägt die Herkunft, der eigene Tab ignoriert sie |
| **Doppeleintrag über den aufgeschobenen At-Bat** | Stiftverlust verwirft den offenen Bogen. Warnung vor der Übernahme |
| **Zuschauer sieht nach einem Wechsel falsche Namen** | `reload()` holt Lineup, Wechsel und Game-Zeile mit — für alle |
| **Niemand findet das Zuschauen** | Kachel auf dem Spieler-Dashboard, Zurück-Knopf auf der Scoring-Seite |
| **Mobile Verbindung bricht ab** | Wiederverbinden, danach einmal `reload()`. Die Leiste zeigt „Verbindung weg" |

## Reihenfolge

1. `reload()` um Lineup, Wechsel und Game-Zeile erweitern. Allein ausgeliefert und mit der
   E2E-Suite abgesichert, **bevor** irgendetwas Neues dazukommt — das ist der einzige
   Schritt, der den bestehenden Scoring-Ablauf berührt, und er soll nicht mit anderen
   Änderungen in einem Topf landen
2. Transport-Schnittstelle im Frontend, zunächst nur mit Nachfragen. Zuschauen funktioniert
   ab hier schon, ohne jede Server-Änderung
3. Strom, Präsenz, Stift im Backend; Strom als zweiter Transport im Frontend
4. Nginx auf dem VPS. Vorher abstimmen
5. Zuschauer-Modus in `ScoringPage`: Knopfzustände, Präsenzleiste, Stift übernehmen,
   Zugang übers Spieler-Dashboard
6. Animationen, zuletzt und einzeln

Nach Schritt 2 ist das Zuschauen da und nützlich, wenn auch träge. Jeder weitere Schritt
macht es besser, keiner ist Voraussetzung für den Nutzen davor.

## Was offen bleibt

- Wie der Strom authentifiziert wird — die drei Wege oben, Empfehlung (1).
- Ob zwei Minuten die richtige Zeit für den Stiftablauf sind. Am Feld messen.
- Ob die Präsenz auch zeigen soll, wer auf der Spiel**tag**-Seite ist, oder nur im Spiel.
- Ob der Spielbogen das später auch bekommt. Dieser Entwurf sagt nichts dazu.
- Ob die Zuschauer-Animation einen eigenen Playwright-Eintrag ohne `reducedMotion`
  bekommt.
- Genaue Form der `anzeige`-Nutzlast je Ereignisart.
