# Trainerabrechnung

`/orga/trainerabrechnung` — der Abrechnungsbogen des Hochschulsports Düsseldorf für einen
Monat: Stunden eintragen, PDF bauen, mit fertigem Mailtext teilen.

## Die Vorlage ist das Original, kein Nachbau

`frontend/public/trainerabrechnung-vorlage.pdf` ist der leere Bogen des Hochschulsports.
Er kam aus einer von Hand ausgefüllten Abrechnung: deren blaue Werte waren
**FreeText-Annotationen** über der Seite, nicht Teil davon. Zieht man die Annotationen ab
(`gs -dShowAnnots=false`), bleibt der leere Bogen übrig.

Deshalb beschriftet die App ihn mit `pdf-lib`, statt ihn in jsPDF nachzubauen — was beim
Hochschulsport ankommt, ist Zeichen für Zeichen das Formular, das sie kennen.

Die Koordinaten in `trainerabrechnungPdf.ts` sind an den Beschriftungen **dieser** Vorlage
gemessen (`pdftotext -bbox`, PDF-Punkte, Nullpunkt unten links; die Zeilengrundlinien sind
schon von oben nach unten umgerechnet). Schickt der Hochschulsport je ein neues Formular,
müssen sie neu gemessen werden — ein stiller Versatz fällt sonst erst auf dem Papier auf.

## Die Stunden-Regel

Der Vertrag deckelt den Monat bei **12 Stunden** (`maxHours` im Profil, nicht im Code —
der Deckel kann sich ändern, ohne dass die Rechnung eine andere wird).

Wie die zwölf zustande kommen, hängt an der Jahreszeit:

| Zeitraum | Donnerstag | Rest |
|---|---|---|
| April – Oktober | 3 h | vier Donnerstage reichen |
| November – März | 2 h | je 1 h an Montag und Samstag |

`suggestRows` legt deshalb zuerst die Donnerstage mit `primaryHours(monat)` an und verteilt
den Rest über `fillToMax` **reihum** auf die übrigen Tage: erst bekommt jeder Montag und
Samstag eine Stunde, dann erst einer die zweite. Das entspricht dem, was tatsächlich
passiert, wenn der Donnerstag kürzer ist oder ein Termin ausfällt.

Grenzen, die der Bogen setzt: **elf Zeilen** (`MAX_FORM_ROWS`) und höchstens
**drei Stunden je Tag** (`MAX_HOURS_PER_DAY`). Abgesagte Trainings tauchen gar nicht erst
auf — was nicht stattgefunden hat, wird nicht abgerechnet. Zeilen mit 0 Stunden stehen in
der Oberfläche, aber nicht auf dem Bogen.

Weniger als zwölf Stunden sind erlaubt, mehr nicht: Die Seite warnt deutlich, blockiert
aber nicht — ein Sonderfall soll nicht an der App scheitern.

## Oberfläche

Eine Spalte, höchstens `max-w-2xl` breit — der Bogen ist ein Formular, keine Werkbank.
Auf 1440 px standen Datum und Stundenzähler sonst einen halben Bildschirm auseinander.

Die **Gesamtstunden und der Absende-Knopf kleben unten am Rand**: man steuert nach der
Zahl, während man oben in der Terminliste tippt, und die Liste ist am Handy länger als der
Bildschirm. Die Zahl bekommt bei jeder Änderung einen kurzen Stups (`.count-pop`,
`prefers-reduced-motion` respektiert) — Bewegung als Antwort auf die Handlung, sonst nichts.
Die Stunden-Knöpfe sind 44 px, damit der Daumen sie trifft.

**Startzeit fehlt:** ältere Termine stehen ohne Uhrzeit in der Planung. Weil auf dem Bogen
`von` und `bis` stehen müssen, zeigt die Zeile dann ein Zeitfeld, und die Zusammenfassung
sagt, wie viele Termine betroffen sind. Nachgetragen wird nur für die Abrechnung — der
Trainingstermin selbst bleibt unberührt.

## Stammdaten

Eine Zeile in `coach_billing_profile` (V65, `id = 1`): Anschrift, Sportkurs, Stundensatz,
Monatsdeckel, Anrede und Adresse der Empfängerin, Unterschrift als PNG-Data-URL.

Die Migration legt **keine Daten** an — personenbezogene Angaben gehören nicht in ein
Skript, das in jedem Klon und jeder Testdatenbank läuft. Die Zeile entsteht beim ersten
Speichern im Formular; `GET /api/coach-billing/profile` antwortet bis dahin mit `204`.

Die Unterschrift wird einmal mit dem Finger gezeichnet (`SignaturePad`) und sitzt danach in
jedem Bogen. Die Leinwand hat eine **feste** Größe (600 × 200) und wird per CSS auf die
Breite gezogen, die Zeigerposition rechnet sich über das Verhältnis um. Vorher richtete sie
sich nach `clientWidth` — maß der Browser beim Aufbau 0 (Sheet fährt gerade ein), war sie
0 Pixel breit, jeder Strich ging ins Leere und `toDataURL` lieferte ein leeres Bild.
Gespeichert wurde dann nichts, ohne dass man es sah. Fehlt die Unterschrift, sagt die
Zusammenfassung das jetzt auch.

Die Monatsauswahl reicht drei Monate nach vorn und zwölf zurück; vorbelegt ist der
Vormonat, weil der Normalfall „Monat ist um, jetzt abrechnen" heißt. Liegen Termine des
gewählten Monats noch in der Zukunft, sagt die Seite, wie viele — geplant ist nicht gewesen.

## Versand

`navigator.share` mit der PDF als `File` plus fertigem Text — auf dem Handy landet beides
in Gmail, die Empfängerin wählt man einmal aus. Wo das Teilen-Menü keine Dateien kann
(Desktop), lädt die PDF herunter und der Mailtext geht in die Zwischenablage.

Das Datum unter der Unterschrift ist der Tag, an dem die Abrechnung gebaut wird.

Die **Vorschau** öffnet ihren Tab im Klick und bekommt die fertige PDF nachgereicht. Erst
bauen und dann öffnen ließe der Popup-Blocker nicht durchgehen, und `noopener` ist dabei
tabu: damit liefert `window.open` laut Standard `null` — die PDF landete im aktuellen Tab
und die Seite war weg. `opener` wird stattdessen gleich nach dem Öffnen gekappt.
