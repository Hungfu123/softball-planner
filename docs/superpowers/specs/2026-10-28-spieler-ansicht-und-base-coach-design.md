# Spieler-Ansicht und Base-Coach-Regel — Entwurf

**Stand:** 28.10.2026
**Stößt um:** Teile von `2026-10-27-aufstellung-teilen-design.md` und den gesamten Plan
`2026-10-28-aufstellung-teilen.md` (noch nicht gebaut).

## Worum es geht

Zwei Dinge, die sich an einer Stelle berühren.

**Erstens:** Die Aufstellung soll Spielern gehören, nicht nur dem Trainer — aber erst, wenn
sie steht. Der Trainer baut sie tagelang um; dabei soll keiner zugucken. Ist sie fertig,
geht ein PDF in die WhatsApp-Gruppe, und dort schauen die Leute auch hin: tags vorher oder
auf der Hinfahrt. Die App ist nicht der Zustellweg. Sie ist die Fassung, die nie veraltet —
sagt jemand Samstag früh ab, ist das PDF im Verlauf falsch, bis ein neues kommt, die App
dagegen sofort richtig.

**Zweitens:** Die App bildet Base Coaches anders ab, als das Team sie tatsächlich einteilt.
Das ist beim Durchsprechen der Spieler-Ansicht herausgekommen, und es muss vorher geklärt
sein — die Ansicht zeigt die Coaches ja.

### Warum jetzt

Der Entwurf vom 27.10. hatte eine Seite entworfen, die der Trainer teilt. Beim Nachfragen
stellte sich heraus: verteilt wird über WhatsApp, und zwar als PDF. Die Seite war auf den
falschen Leser zugeschnitten. Derselbe Inhalt, anderer Adressat — und damit andere
Entscheidungen bei fast jedem Detail.

## Was dieser Entwurf umstößt

| Vom 27.10. | Jetzt |
|---|---|
| Teilen-Seite für den Trainer, Link in die Zwischenablage | Spieler-Ansicht in der App, kein Link, kein Teilen-Knopf |
| Zwei Knöpfe im Planer („Vorschau", „Teilen") | Keine neuen Knöpfe im Planer |
| Auswechslungen als Pfeil im Schlagplatz | Fällt weg |
| Coach-Rotation als Pfeilzeile `Dat → Mike #8–#10` | Fällt weg, siehe Teil 2 |
| Spieler sehen vergangene Spieltage ab `date < heute` | Ab `date <= heute`, und am Spieltag ab 7 Uhr |

**Was vom 27.10. gilt und nicht wiederholt wird:** die Platzrechnung für 393 × 760, die drei
Feldgeometrien im Haus und die Empfehlung, `FieldView` zu benutzen statt eine vierte
anzulegen, das Kürzen über `getDisplayName()`, der Zoom als Weg zum Detail, der ruhige
Umgang mit dem leeren Fall, und dass `FieldView` auf Tokens umgestellt werden muss, sonst
fällt die Seite durch `kontrast.spec.ts`.

## Ziele

- Ein Spieler sieht, wo er spielt und an welchem Schlagplatz — sobald die Aufstellung steht.
- Der Trainer kann tagelang umbauen, ohne dass jemand mitliest.
- Am Spieltag selbst steht die Aufstellung da, auch wenn der Trainer das Freigeben vergisst.
- Die App bildet ab, wie das Team Base Coaches wirklich einteilt.
- Der Satz zur Coach-Regel ist kurz genug, dass ihn jemand im Vorbeigehen liest.

## Keine Ziele

- **Kein Ersatz für das PDF.** Das PDF bleibt der Kanal. Die App ist die zweite Quelle.
- **Keine Benachrichtigung.** Niemand wird angestupst, wenn freigegeben wird. Das macht die
  WhatsApp-Gruppe.
- **Kein Mitrechnen im Spiel.** Die App leitet nicht aus dem Spielverlauf ab, wer gerade
  Coach ist. Ausdrückliche Entscheidung des Betreibers.
- **Kein Teilen-Link.** Entfällt mit dem Adressatenwechsel.
- **Keine Bearbeitung für Spieler.** War nie möglich und bleibt es.

## Was ein Fehlschlag wäre, auch wenn es technisch läuft

- Ein Spieler sieht einen Zwischenstand, den der Trainer noch umwirft.
- Die Oberfläche behauptet „noch nicht freigegeben", während die Aufstellung längst für alle
  sichtbar ist. (Dieser Fehler steckt heute im Branch `feature/aufstellung-freigeben`, bei
  vergangenen Spieltagen.)
- Eine Rolle liest den Entwurf tagelang mit, während die Regel für alle anderen greift.
- Der Coach-Satz ist so lang, dass er auf 160 Pixel Breite umbricht und keiner ihn liest.
- Die Spieler-Ansicht zeigt dasselbe wie der Planer, nur ohne Knöpfe — dann war sie überflüssig.

---

## Teil 1 — Wer sieht die Aufstellung

### Die Regel

Sichtbar, wenn **eine** dieser Bedingungen zutrifft:

1. **Trainer** (ADMIN/SUPERADMIN) — er stellt sie auf.
2. **Scorer** (`mayScore`) **am Spieltag** — sonst wäre der Spielbogen leer, wenn das Spiel
   losgeht.
3. **Freigegeben** — der Trainer hat den Schalter gelegt.
4. **Spieltag ist heute und es ist nach 7 Uhr, oder der Spieltag ist vorbei.**

Sonst: leere Antwort, kein Fehler. Die Oberfläche erklärt die Leere mit einem Satz; sie
behauptet nicht, dass es nichts gibt.

Das sind die vier Zweige, die im Branch `feature/aufstellung-freigeben` bereits gebaut sind —
mit zwei Unterschieden. Der vierte lautet dort `date < heute` und wird zu „`date < heute`
**oder** (`date == heute` und Uhrzeit ≥ 07:00)". Der zweite gilt dort immer und bekommt
weiter unten eine Schranke.

### Die 7 Uhr

Mitternacht war dem Betreiber zu früh — da baut er unter Umständen noch um. Die genaue
Uhrzeit ist ihm egal, Hauptsache morgens. **Festlegung: 07:00 Europe/Berlin.** Keine
Einstellung, keine Spalte, eine Konstante.

Es ist **keine automatische Freigabe**, sondern ein Zweig in derselben Sichtbarkeitsregel:
kein geplanter Lauf, keine Uhr, kein Schreibvorgang, der ausfallen kann. `lineupsReleasedAt`
bleibt leer, wenn der Trainer nicht selbst freigibt.

### Der Scorer sieht sie am Spieltag, nicht vorher

Ein Scorer ist kein eigener Rang: `ScoringPermission.darfSchreiben` liest `may_score` am
Konto, die Rolle bleibt `PLAYER`. Er bekommt damit dieselbe Seite wie alle anderen
(`Startseite` schaltet auf `me.role === 'PLAYER'`) — und Zweig 2 öffnet ihm dort die
Aufstellung **immer**, auch am Mittwoch, während alle anderen „steht noch nicht" lesen. Das
ist genau das Leck, gegen das dieses Vorhaben gebaut wird, für eine Rolle offen gelassen und
ohne jeden Hinweis, dass er einen Zwischenstand vor sich hat.

Das Schließen kostet ihn nichts. **Zweig 3 gilt für ihn wie für alle** — ist freigegeben,
sieht er sie, und freigegeben wird meist am Tag vorher. Zweig 4 deckt den Spieltag ohnehin ab,
denn kein Spiel beginnt vor 7 Uhr.

Damit trägt Zweig 2 am Ende genau einen Fall: **nicht freigegeben und vor 7 Uhr am
Spieltag** — der Morgen, an dem der Trainer es vergessen hat. Dafür soll er da sein, für
nichts sonst.

**Festlegung: Zweig 2 gilt nur, wenn der Spieltag heute ist.** Der Scorer sieht die
Aufstellung ab Mitternacht am Spieltag — Einrichten am Morgen bleibt möglich, das Mitlesen
über Tage ist zu.

Was dabei wegfällt, ist schmal: den Spielbogen am **Vorabend** vorbereiten, **ohne dass
freigegeben ist**. Ist freigegeben — der Normalfall —, ändert sich für ihn nichts. Falls
sich der andere Fall doch als nötig herausstellt, ist die Abhilfe ein Tag mehr im Vergleich
(`date <= heute + 1`), kein Umbau.

### Zeitzone — der enge Weg, nicht der breite

Der Container hat **keine Zeitzone gesetzt** (weder Dockerfile noch Compose noch
`application.properties`) und läuft damit auf UTC. 07:00 im Code wären im Sommer 09:00
deutscher Zeit.

Ein früherer Stand dieses Entwurfs empfahl, die Zeitzone des Containers auf `Europe/Berlin`
zu stellen. **Das wird hier nicht gemacht.** Nachgezählt:

- 18 Migrationen legen Spalten als `TIMESTAMP` **ohne** Zeitzone an; nur `app_user` (V70) und
  `audit_event` (V71) sind `TIMESTAMPTZ`. Alle bisherigen Zeilen halten UTC-Wanduhrzeit.
- 17 Stellen füllen Spalten per `DEFAULT NOW()` — also aus **Postgres**, in dessen eigener
  Sitzungszone, nicht aus dem Backend. Der Datenbank-Container trägt ebenfalls kein `TZ`.
- Die Umstellung würde jede historische Zeit im Display um 1–2 Stunden verschieben,
  einschließlich des Feldes `Zeit:` auf dem RFL-Bogen. **Der geht an den Verband.**
- Testcontainers startet jedes Mal eine leere Datenbank. Eine grüne Suite beweist hier nichts.

**Festlegung: die 7 Uhr werden an genau dieser einen Stelle ausdrücklich in
`Europe/Berlin` gerechnet.** Nichts Historisches bewegt sich, keine Datenmigration über
zwanzig Spalten, kein Risiko für ein Blatt, das das Haus verlässt.

Die Zeitzone des ganzen Hauses geradezuziehen bleibt richtig — aber als **eigenes Vorhaben**
mit eigener Datenmigration, nicht als Nebensatz in einem Vorhaben über die Spieler-Ansicht.

### Wer die Sichtbarkeit entscheidet: das Backend

Heute rechnet der Browser mit:

```ts
return !gameDay.lineupsReleasedAt && gameDay.date >= new Date().toISOString().slice(0, 10)
```

Das ist das **UTC**-Datum im Browser gegen ein Backend, das `LocalDate.now()` in der
Container-Zone rechnet. Zwei Uhren, zwei Zonen, eine Regel. Mit einer Uhrzeitschwelle
verdoppelt sich die Angriffsfläche, und genau dieser Fehler steht oben unter „Was ein
Fehlschlag wäre".

**Festlegung:** `GameDayResponse` trägt den fertigen Zustand — sichtbar ja/nein und welcher
Fall aus dem UX-Teil gilt. Die Oberfläche zeichnet ihn nur noch. `stehtNochNicht` in
`utils/aufstellungsauskunft.ts` entfällt ersatzlos.

**`stehtNochNicht` ist nicht die einzige Stelle mit einer eigenen Uhr.** `PlayerDashboard`
hat ein eigenes `heute()` — ebenfalls `new Date().toISOString().slice(0, 10)`, also das
UTC-Datum. Daran hängt, welcher Spieltag überhaupt angezeigt wird (`date >= heute()`) und ob
der Kopf „heute" sagt. Im Sommer steht der Spieltag damit bis 2 Uhr nachts noch als
kommender da. Das ist derselbe Fehler, nur eine Karte weiter, und gehört mit derselben
Antwort erschlagen: das Datum kommt aus dem Backend, nicht aus dem Browser.

`AufstellungSichtbarkeit` bekommt dafür eine **einsetzbare Uhr** (`Clock`), sonst ist
„06:59 gegen 07:01" nicht prüfbar.

Das ist auch die Richtung, in die CLAUDE.md zeigt: Fachlogik ins Backend, die Oberfläche ist
der visuelle Helfer.

### Die Leiste im Planer

Heute hat sie drei Zustände (nicht freigegeben / freigegeben / seit der Freigabe geändert)
und erscheint bei jedem Spieltag. Das ist bei vergangenen Spieltagen falsch — sie behauptet
„noch nicht freigegeben", obwohl längst jeder draufgucken darf.

Künftig vier Lagen nach Datum:

| Spieltag | Leiste |
|---|---|
| in der Zukunft | die drei Zustände wie bisher, mit Knopf |
| heute, vor 7 Uhr | „Ab 7 Uhr für alle sichtbar", Knopf bleibt (früher freigeben geht) |
| heute ab 7 Uhr | „Für alle sichtbar · seit 7 Uhr", kein Knopf |
| vorbei | „Für alle sichtbar · Spieltag vorbei", kein Knopf |

**Die Zeile nennt den Grund, nicht nur den Zustand.** Wo gestern ein Knopf stand, steht heute
keiner mehr; „Für alle sichtbar" allein lässt den Trainer suchen, was er falsch gemacht hat.
Der Zusatz sagt ihm, warum nichts mehr zu tun ist. Punktfarben im UX-Teil.

### Was bleibt, wie es ist

- Die Freigabe selbst samt Fingerabdruck („seit der Freigabe geändert") und der Erinnerung
  auf der Werkbank.
- Freigabe und PDF bleiben **unabhängig**. Das PDF entsteht, wann der Trainer will.
- Alle elf Lesewege, die im Branch geschlossen wurden.

---

## Teil 2 — Base Coach

### Wie das Team es wirklich macht

- **Mehr Leute als Schlagplätze:** Base Coaches werden benannt — jemand von der Bank oder
  jemand, der nicht schlägt (DH-Host). Das kann auch wechseln.
- **Genau so viele wie Schlagplätze:** niemand ist frei. Dann coachen **die letzten beiden,
  die aus waren.** Zu Beginn, wenn noch keiner aus war: die **unteren beiden der
  Schlagreihenfolge**.

Beides kann nebeneinander stehen: ist für eine Base jemand benannt und für die andere nicht,
gilt für die eine der Name und für die andere die Regel.

### Was die App heute stattdessen hat

Zwei Mechanismen:

1. **`GameStaff`** mit `BASE_COACH_1ST` / `BASE_COACH_3RD`. Die Prüfung erlaubt nur, wer
   nicht schlägt — Bank oder DH-Host, nie ein Schläger. **Das passt und bleibt unverändert.**
2. **`CoachRotationPair`** — ein festes Schlagplatz-Paar (`POS_1_6` … `POS_5_10`, also X und
   X+5) mit *Primary* und *Backup*: einer steht die meiste Zeit an der Base, der andere
   übernimmt während dessen Warmup und Schlag. Dazu `…Reversed` für die Richtung,
   `resolveRotation`, `recommendRotationPair`, `scoreRotationPair` und ein Auswähler im Planer.

Mechanismus 2 ist eine **Näherung** der tatsächlichen Regel — bei rund fünf Schlägern je
Inning wandert „wer zuletzt aus war" ungefähr um fünf Plätze weiter. Aber er erzählt eine
andere Geschichte (Primary/Backup, Warmup-Fenster) und verlangt eine Auswahl, die der Trainer
gar nicht treffen will.

### Entscheidung

**`CoachRotationPair` fällt weg, ganz.** Mit ihm der Auswähler im Planer und die vier Spalten
am Spiel (`firstBaseCoachRotation`, `thirdBaseCoachRotation` und die beiden `…Reversed`).

An seine Stelle tritt eine Regel ohne Auswahl: **ist kein Coach benannt, gilt „die letzten
beiden Aus", und das Startpaar sind die unteren beiden der Schlagreihenfolge.** Das leitet
sich vollständig aus der Aufstellung ab — nichts zu speichern, nichts zu pflegen.

**Der Rückbau reicht weiter als vier Spalten.** Nachgesehen:

- `lineup_set_game_rotation` (V57) — eigene Tabelle, Entity, Mapper, Domänenmodell
  `LineupSetGameRotation`, DTO, Logik in `LineupSetService`, Abdeckung in
  `LineupSetIntegrationTest`. Acht Backend-Dateien nennen den Typ.
- `PUT /api/games/{id}/coach-rotation` (`GameController:60`) samt `SetCoachRotationRequest`.
- `coachRotation.ts` im Frontend (`resolveRotation`, `recommendRotationPair`,
  `scoreRotationPair`, `validRotationPairs`) und die Rotationsprosa im großen PDF.
- `LineupRow.tsx` hebt heute die beiden Coach-Schlagplätze hervor (`getPairPositions`).

**Alles davon geht.** Das Enum lässt sich nicht halb entfernen. Gespeicherte Lineup-Sets
verlieren damit ein Feld, das es nicht mehr gibt — alles andere an ihnen bleibt.

Die Hervorhebung in `LineupRow` **fällt weg.** Erster Gedanke war, sie umziehen zu lassen —
auf die beiden Schlagplätze, die sich als Startpaar ergeben. Aber die stehen fest: es sind
immer die untersten beiden der Reihenfolge. Eine Markierung, die nie etwas anderes markiert
als die letzten zwei Zeilen, ist Dekoration und keine Auskunft. Heute ist sie das Ergebnis
einer Wahl des Trainers; künftig wäre sie eine Konstante in Farbe.

Die Auskunft trägt stattdessen der Satz aus diesem Teil — er steht unter dem Feld, auf dem
PDF und in der Spieler-Ansicht und nennt die Nummern im Klartext. Zweimal dasselbe sagen,
einmal davon stumm, hilft niemandem.

### Wo die Regel gerechnet wird

Geteilt, und zwar an der Naht zwischen Sache und Sprache:

- **Wer coacht** ist Fachlogik und kommt aus dem **Backend** — je Spiel die benannten Coaches
  und, wo keiner benannt ist, die beiden Startschlagplätze. Damit fällt es automatisch unter
  die Sichtbarkeitsregel aus Teil 1.
- **Wie es dasteht** ist Darstellung und lebt in **einer** Funktion im Frontend, die PDF und
  Spieler-Ansicht gemeinsam benutzen. Das ist die einzige Art, „gleichlautend" zu garantieren,
  statt es zu versprechen.

### Der Satz

Kurz, wenige Wörter, gleichlautend auf dem PDF und in der App:

```
Coaches: zuletzt aus · #9 #10
```

Ist eine Base benannt, steht dort der Name, und die Regel gilt nur für die andere:

```
1B Jan · 3B zuletzt aus · #10
```

Die genaue Schreibweise bleibt der Umsetzung überlassen; die Länge nicht — **rund 28
Zeichen**, sonst bricht die Zeile um. Begründung im UX-Teil.

### Was dabei verlorengeht

Die ausformulierte Rotation im großen PDF (*„3B Coach: Dat. Mike coacht bei Schlag #8–#10,
bis Dat vom Schlag zurück ist."*) verschwindet mitsamt ihrer Logik. Das ist beabsichtigt: sie
beschreibt eine Einteilung, die das Team nicht so macht.

---

## Teil 3 — Die Spieler-Ansicht

### Was draufsteht

Vier Dinge, sonst nichts:

1. **Das Feld** mit den neun Positionen.
2. **Die Schlagreihenfolge.**
3. **Die Base Coaches** — Namen oder der Satz aus Teil 2.
4. **Die Bank** — wer zugesagt hat und in diesem Spiel nicht spielt.

Keine Auswechslungen, keine Rotationsfenster, keine Knöpfe. Nur lesen.

### Die Bank zeigt Namen — das ist neu

Heute sieht ein Spieler nur, **ob er selbst** auf der Zusageliste steht, nicht wer sonst. Die
Bank verrät das. In der WhatsApp-Umfrage sieht es ohnehin jeder, und der Betreiber hat dem
ausdrücklich zugestimmt — es steht hier, weil es eine Offenlegung ist und nicht aus der
Aufstellung folgt.

Die Zusageliste selbst bleibt, was sie ist: **eine Zusage ist keine Aufstellung.** Sie hängt
nicht an der Freigabe und wird durch sie nicht verborgen.

### Wo sie lebt

Im Spieler-Dashboard (`PlayerDashboard` auf `/spielbetrieb`), an der Stelle, wo heute die
reine Liste steht (`LineupLesen`) — nicht als eigene Route und nicht als zweite Seite neben
dem Planer. Wer mehrere Spiele am Spieltag hat, schaltet zwischen ihnen um, wie heute schon.

Der Weg dorthin: `/` trägt die Kachel „Nächster Spieltag", die dorthin führt; der zweite
Reiter geht auch direkt hin.

**Nur der nächste Spieltag ist erreichbar, und das bleibt so.** `useNaechsterSpieltag`
filtert `date >= heute()` — um Mitternacht verschwindet der Spieltag aus der Seite. Das
Fenster der Ansicht ist damit **7 Uhr bis Mitternacht desselben Tages**, und genau dafür ist
sie gedacht: die Fassung, die auf der Hinfahrt noch stimmt. Vergangene Aufstellungen sind
nach der Regel aus Teil 1 zwar offen, haben aber keinen Weg in der Oberfläche. Ein Rückblick
ist ein eigenes Vorhaben, kein Nebensatz hier.

Ob daraus derselbe Baustein wird, den der Trainer im Planer sieht, bleibt der Umsetzung
überlassen. Was **nicht** passieren darf: eine vierte Feldgeometrie.

### Der leere Fall

Leer heißt zweierlei, und beides darf nicht denselben Satz bekommen. Der Zustand des
**Spieltags** kommt aus `GameDayResponse` (Teil 1), die Leere steht am **einzelnen Spiel** —
ein Spieltag kann freigegeben sein, während Spiel 2 noch keine Aufstellung hat.

| Spieltag | Spiel | Satz |
|---|---|---|
| gesperrt | egal | „Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier." |
| offen | leer | eigener Satz: für dieses Spiel steht noch keine, der Trainer macht sie später |
| offen | gefüllt | kein Satz, die Ansicht steht da |

Der erste Satz stimmt mit der 7-Uhr-Regel weiter — am Spieltag ist sie ja sichtbar. Der
heutige zweite („Sobald der Trainer sie macht …") passt und kann bleiben, muss aber vom
ersten unterscheidbar sein. Sonst erklärt dieselbe Zeile zwei verschiedene Lagen, und der
Spieler weiß nicht, ob er warten oder nachfragen soll.

Den Fall „Spieltag vorbei" gibt es in der Spieler-Ansicht **nicht**: sie zeigt nur den
nächsten Spieltag, und der ist nie vergangen. Ein früherer Stand dieses Entwurfs sah dafür
eine eigene Fassung vor; sie entfällt.

**Keine Coaches, keine Bank:** keine Zeile, keine Striche.

**„Bin ich dabei?" liest denselben Zustand.** `meinePlatzierung` trägt heute eigene Leersätze
(„Es gibt noch keine Aufstellung — sie erscheint hier, sobald sie steht."). Fällt
`stehtNochNicht` weg, müssen beide Karten aus derselben Quelle sprechen — sonst sagt die obere
„gibt es noch keine" und die untere „noch nicht freigegeben", auf einem Bildschirm.

---

## UX und UI

### Die Leiste beantwortet eine Frage, nicht zwei

Heute mischt sie zwei Auskünfte: ob freigegeben ist, und ob sich seitdem etwas geändert hat.
Mit der 7-Uhr-Regel kämen eine dritte und eine vierte dazu — und zwei davon können einander
widersprechen („nicht freigegeben" und trotzdem sichtbar).

Deshalb: **die Leiste beantwortet ab jetzt genau eine Frage — sehen die Spieler das gerade?**
Die Freigabe ist nur einer der Gründe für ein Ja. „Seit der Freigabe geändert" bleibt als
Zusatz, weil es den Trainer etwas kostet, wenn er es nicht erfährt.

| Lage | Punkt | Zeile | Knopf |
|---|---|---|---|
| künftig, nichts aufgestellt | grau | Noch nichts aufgestellt | Freigeben (gesperrt) |
| künftig, nicht freigegeben | amber | Noch nicht für Spieler freigegeben | Freigeben |
| künftig, freigegeben | accent | Für Spieler sichtbar · Sa 09:12 | zurücknehmen |
| künftig, seitdem geändert | amber | Seit der Freigabe geändert · Sa 09:12 | Erneut freigeben · zurücknehmen |
| heute, vor 7 Uhr | grau | Ab 7 Uhr für alle sichtbar | Früher freigeben |
| heute ab 7 Uhr | accent | Für alle sichtbar · seit 7 Uhr | — |
| Spieltag vorbei | accent | Für alle sichtbar · Spieltag vorbei | — |

Der Punkt behält seine Bedeutung: **accent = sichtbar, amber = du könntest etwas tun,
grau = nichts zu tun.**

**Vor 7 Uhr am Spieltag ist der Punkt grau, nicht amber.** Amber heißt „du könntest etwas
tun" — hier ist Nichtstun richtig, die Aufstellung wird von selbst sichtbar. Ein amberner
Punkt wäre eine Warnfarbe ohne Anlass, und davon gibt es in der Leiste schon zwei. Der Knopf
bleibt trotzdem: früher freigeben darf er.

**Die erste Zeile ist nur ein Text, kein neues Verhalten.** Heute steht dort „Noch nicht für
Spieler freigegeben", obwohl noch gar nichts dasteht, und der Knopf ist bereits gesperrt
(`disabled={!hatAufstellung}`). Es ändert sich der Satz, nicht die Mechanik.

**Der Rückfrage-Text bleibt nur deshalb richtig.** „Die Aufstellung verschwindet dann wieder
aus der Spieler-Ansicht" stimmt am Spieltag nach 7 Uhr nicht mehr — dort ist der Knopf
aber weg. Fällt diese Zeile der Tabelle, muss auch der Satz im `ConfirmModal` nach.

### Der Coach-Satz muss in eine Zeile

Unter dem Feld stehen rund 160 Pixel — bei 11 Pixel Schrift etwa **28 Zeichen**. „Base
Coaches: die letzten beiden Aus · Start #9, #10" ist doppelt so lang und bricht um. Also:

```
Coaches: zuletzt aus · #9 #10
1B Jan · 3B zuletzt aus · #10
```

**Die Schlagnummer trägt die Verbindung, nicht der Name.** #9 steht in der Liste direkt
daneben. Dasselbe Mittel wie die Positionsnummern auf dem Feld: zwei Hälften, die sich ohne
ein Wort aufeinander beziehen.

**Das Feld zeichnet keine Coaches.** Neun Punkte sind neun Verteidiger; ein zehnter an der
Base wäre eine Position, die es nicht gibt. Die Coaches stehen in der Zeile darunter.

### Ein Spiel auf einmal — der Platz ist da

Der Entwurf vom 27.10. rechnete mit **drei** Spielen untereinander auf einem Handy. Daher 160
Pixel Feld, Kürzel statt Namen, Zoom als Weg zum Detail. **Das gilt hier nicht.** Die
Spieler-Ansicht zeigt ein Spiel und schaltet um — dieselbe Umschaltung, die heute schon da ist.

Damit ist Platz: das Feld darf deutlich größer werden, Namen dürfen lesbar sein, und niemand
muss hineinzoomen, um zu erkennen, wo er steht. Zoom bleibt möglich, ist aber nicht der Weg.

**Der Platz kostet Scrollen, nicht Sichtbarkeit.** Die Ansicht ist das dritte Element der
Seite; darüber liegen der Spieltags-Kopf und „Bin ich dabei?". Sie liegt also unter der
Falte, und ein größeres Feld schiebt sie weiter nach unten. Umsortieren wäre falsch — „Bin
ich dabei?" beantwortet „wo spiele ich" ohne einen Handgriff und gehört nach oben. Die
Ansicht macht auf, wer mehr wissen will; ein Scrollweg ist dafür richtig. Er darf nur nicht
länger werden als nötig.

### Der Umschalter muss den Gegner nennen

Er beschriftet heute `Spiel 1` / `Spiel 2`; die Karte darüber sagt `Spiel 1 gegen Fireballs`.
Solange darunter nur eine Namensliste stand, ging das durch. Mit Feld, Coaches und Bank wird
diese Karte die Hauptsache der Seite — und eine Aufstellung, über der nicht steht, gegen wen
sie gilt, ist unvollständig. Entweder trägt der Umschalter den Gegner, oder eine Zeile über
dem Feld tut es.

### Die Frage ist „wo spiele ich"

Das ist die einzige Frage, mit der ein Spieler die Ansicht öffnet. Heute hebt die Liste seine
Zeile hervor (amber). **Das Feld muss dasselbe tun** — seine Position hervorgehoben, in
derselben Farbe. Zwei Hervorhebungen, eine Antwort: Zeile und Punkt gehören sichtbar zusammen.

Wer nicht aufgestellt ist, bekommt keine Hervorhebung und keinen Hinweis darauf. Die Bank
nennt ihn, das genügt. Ein „du spielst nicht" braucht niemand zweimal gesagt.

### Das Feld ist hier zum Lesen, nicht zum Fassen

`FieldView` zeichnet heute Schaltflächen — im Planer richtig, hier falsch. Übernommen wird
die Zeichnung, nicht die Bedienbarkeit: keine Schaltflächen, kein Zeiger, kein Hover. Eine
Fläche, die aussieht wie ein Knopf und nichts tut, ist schlimmer als eine, die nach nichts
aussieht. Dasselbe Prinzip, das `GatedLink` schon trägt.

### „Bin ich dabei?" behält seine Zeile je Spiel

Die Karte darüber sagt heute schon `Position SS · Schlagplatz 4`. Die neue Ansicht sagt es
auch — eine Doppelung, ein paar hundert Pixel auseinander.

**Sie bleibt trotzdem.** Die beiden beantworten verschiedene Fragen: die Zeile oben beantwortet
„wo spiele ich" ohne einen einzigen Handgriff, die Ansicht darunter „wie steht das Team".
Die meistgelesene Zeile der Seite zu streichen, um eine Regel über Redundanz einzuhalten,
wäre die falsche Rechnung. Was wegfällt, ist nur der alte Listen-Teil darunter.

### Die Bank ist eine Zeile, keine Liste

Namen durch Punkte getrennt, gedämpft, unter dem Feld. Karten oder Aufzählungspunkte gäben
der Bank das Gewicht der Aufstellung.

### Dunkelmodus

`FieldView` trägt heute `text-navy-900`, `border-cream-200`, `bg-softball-red-600`. Auf
Tokens umstellen, sonst fällt die Ansicht durch `kontrast.spec.ts`. Die Spieler-Ansicht
gehört in die Seitenliste dieser Prüfung, in beiden Themes.

### Was der Trainer nicht sieht — und warum das reicht

Der Trainer kann die Spieler-Ansicht nicht öffnen. `Startseite` schaltet auf
`me.role === 'PLAYER'`, und für einen Admin führt kein Weg dorthin. Er drückt „Freigeben" und
sieht nicht, was dadurch erscheint. Der Entwurf vom 27.10. hatte dafür eine Vorschau — die
ist mit der Teilen-Seite weggefallen, aber ihre Begründung trug nur das Teilen.

**Festlegung: trotzdem keine Vorschau.** Die Daten kennt er aus dem Planer, Punkt für Punkt.
Was er dort nicht sieht, ist die **Formulierung** des Coach-Satzes — und die steht ab jetzt
auf seinem eigenen PDF, aus derselben Funktion. Das einzig Neue bekommt er also ohnehin zu
Gesicht, ohne dass eine zweite Oberfläche entsteht, die gepflegt sein will.

### Was der Scorer nicht sieht

Am Spieltag sieht er sie wie alle, nur früher — ab Mitternacht statt ab 7 Uhr. Was er nicht
sieht, ist **ob sie freigegeben ist**: die Leiste liegt im Planer, und der ist für ihn zu.
Das bleibt so. In den Stunden vor 7 liest er unter Umständen einen Stand, den der Trainer noch
umwirft — aber das sind genau die Stunden, in denen sonst niemand hinschaut, und er liest sie
zum Scoren, nicht zum Weitersagen. Stört es doch, ist die billigste Abhilfe dieselbe Zeile
ohne Knöpfe im Spieler-Dashboard.

## Was der Umsetzung überlassen bleibt

- Aufteilung Liste/Feld und ob auf dem Feld Nummer oder Kürzel steht (Vorschlag vom 27.10.:
  Nummer zuerst probieren).
- Die genaue Schreibweise des Coach-Satzes, innerhalb der Längengrenze.
- Ob Planer und Spieler-Ansicht denselben Baustein benutzen.
- Reihenfolge der Bank-Namen.
- Ob der Gegner am Umschalter steht oder über dem Feld.
- Wie die vier Spalten verschwinden (eine Migration oder zwei).

## Meine Festlegungen — zum Prüfen beim Lesen

- **07:00 Europe/Berlin** als Schwelle am Spieltag.
- **Sichtbarkeitszweig statt automatischer Freigabe** — kein geplanter Lauf.
- **Zeitzone des Containers NICHT stellen** — die 7 Uhr werden an einer Stelle in Berliner
  Zeit gerechnet. Umgekehrt zum ersten Stand dieses Entwurfs, Begründung in Teil 1.
- **Das Backend entscheidet die Sichtbarkeit**, die Oberfläche zeichnet sie nur.
- **Der Rückbau der Rotation nimmt auch die Lineup-Set-Tabelle mit** (V57) und den Endpunkt.
- **„Bin ich dabei?" behält seine Zeile je Spiel**, trotz Doppelung.
- **Die Spieler-Ansicht ersetzt die Teilen-Seite**, sie kommt nicht zusätzlich.
- **Auswechslungen fallen weg** — der Betreiber hat vier Dinge aufgezählt, Wechsel waren
  nicht dabei.
- **Der Scorer sieht die Aufstellung erst am Spieltag** — Zweig 2 bekommt `date == heute`.
  Sonst bleibt das Leck über Tage für eine Rolle offen.
- **Keine Vorschau für den Trainer**, obwohl er die Spieler-Ansicht nicht öffnen kann.
- **Die Hervorhebung in `LineupRow` fällt weg**, statt umzuziehen — das Startpaar ist konstant.
- **Kein Rückblick auf vergangene Spieltage** in der Spieler-Ansicht; sie zeigt den nächsten
  und nur den.
- **Vor 7 Uhr ist der Punkt grau, nicht amber** — nichts zu tun ist kein Anlass für eine
  Warnfarbe.
- **Beide Karten lesen denselben Zustand** — „Bin ich dabei?" und die Ansicht dürfen nicht
  zwei verschiedene Sätze über dieselbe Lage sagen.
- **Der Umschalter nennt den Gegner** (oder eine Zeile über dem Feld tut es).
- **Auch `heute()` im `PlayerDashboard` fällt**, nicht nur `stehtNochNicht` — zwei Uhren im
  Browser sind nicht besser als eine.

## Der Satz steht auf beiden Aufstellungs-PDFs

Der Betreiber druckt **je nach Liga alle** Knöpfe. Also bekommen beide Blätter, die eine
Aufstellung zeigen, denselben Satz:

| Knopf | Funktion | Heute | Künftig |
|---|---|---|---|
| **Aufstellung** | `generateLineupWithFieldPdf` — Liste links, Feld rechts | ausformulierte Rotation | Satz an derselben Stelle |
| **PDF** | `generatePdf` — reine Liste | keine Coach-Zeile | neue Zeile unter „Bank:" |
| **Liste** | Unterschriftenliste | — | unverändert |

Beim ersten ist es ein Austausch an Ort und Stelle. Beim zweiten eine neue Zeile: dort steht
heute nur `Bank: …` in 7 pt Grau, und ein Kommentar hält ausdrücklich fest, dass reine
Coaches bisher als gewöhnliche Namen in genau dieser Zeile auftauchen. Die Coach-Zeile
kommt direkt darunter, in derselben Größe und Farbe — sie ist Beiwerk, nicht Überschrift.

Das ist nötig, nicht Zugabe: ohne benannte Coaches gibt es keine Namen mehr, die in der
Bank-Zeile mitlaufen könnten. Ohne eigene Zeile stünde auf dem reinen Listen-PDF gar nichts
mehr über Base Coaches.

`LineupSheet` (`/gameday/:id/export`) bekommt denselben Satz — dieselbe Auskunft, dieselbe
Schreibweise, dieselbe Funktion aus Teil 2.

## Größe

Projekt, ein Plan. Reihenfolge innerhalb des Plans: erst die Base-Coach-Regel (Teil 2),
weil die Spieler-Ansicht ihren Satz anzeigt, dann die Sichtbarkeit (Teil 1), dann die
Ansicht (Teil 3).

**Vorher:** der Branch `feature/aufstellung-freigeben` wird gemergt oder verworfen. Dieser
Entwurf baut darauf auf — ohne ihn gibt es keine Freigabe, auf der Teil 1 aufsetzt.
