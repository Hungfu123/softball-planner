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

## Stammdaten

Eine Zeile in `coach_billing_profile` (V65, `id = 1`): Anschrift, Sportkurs, Stundensatz,
Monatsdeckel, Anrede und Adresse der Empfängerin, Unterschrift als PNG-Data-URL.

Die Migration legt **keine Daten** an — personenbezogene Angaben gehören nicht in ein
Skript, das in jedem Klon und jeder Testdatenbank läuft. Die Zeile entsteht beim ersten
Speichern im Formular; `GET /api/coach-billing/profile` antwortet bis dahin mit `204`.

Die Unterschrift wird einmal mit dem Finger gezeichnet (`SignaturePad`, Leinwand in
doppelter Auflösung, transparenter Hintergrund) und sitzt danach in jedem Bogen.

## Versand

`navigator.share` mit der PDF als `File` plus fertigem Text — auf dem Handy landet beides
in Gmail, die Empfängerin wählt man einmal aus. Wo das Teilen-Menü keine Dateien kann
(Desktop), lädt die PDF herunter und der Mailtext geht in die Zwischenablage.

Das Datum unter der Unterschrift ist der Tag, an dem die Abrechnung gebaut wird.
