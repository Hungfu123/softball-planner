# Spielwissen: Offense erklaeren, Defense zeigen

**Stand:** 30.10.2026
**Entschieden mit:** Hung Luu (Betreiber)

## Warum

Ein Neuer im Team kennt die Regeln nicht. Er laeuft nach dem Schlag nicht los, weil er
denkt, der Ball sei foul. Er weiss nicht, was als Strike zaehlt, er weiss nicht, wann er
von der Base darf. Das faellt am Zaun auf, und es ist nichts, was man im Spiel nachholt.

Die App hat schon eine Haelfte davon: den **Playmaker**, in dem die Spielzuege liegen. Der
ist Defense. Die andere Haelfte fehlt, und das ist die, die der Neue zuerst braucht, denn
er steht zuerst am Schlag.

Gelesen wird so etwas in zwei Lagen: kurz vor dem Spiel schlaegt jemand eine Sache nach,
und zwischendurch sieht sich jemand aus Interesse alles an. Beides muss gehen.

## Fuer wen

Spieler, vor allem Anfaenger. Der Reiter ist fuer **alle Rollen** sichtbar, Trainer
eingeschlossen. Es gibt hier nichts zu verbergen; es ist das einzige Stueck der App, das
niemanden bewertet.

## Ziele

- Wer zwei Minuten hat, weiss danach, was ein Strike ist und was er nach dem Treffer tut.
- Wer eine einzelne Sache nachschlagen will, kommt in zwei Tippern hin, ohne den Rest zu
  lesen.
- Wer mehr will, findet mehr, ohne dass es dem Eiligen im Weg steht.
- Offense und Defense sehen aus wie ein Haus. Dieselben Linien, dieselben Farben,
  dasselbe Feld.

## Nicht-Ziele

- **Kein Regelbuch.** Keine Randfaelle, keine Paragraphen, keine Umpire-Mechanik.
- **Keine Feldlehre** ueber den bestehenden Playmaker hinaus.
- **Kein Quiz, kein Fortschritt, kein gespeicherter Zustand.** Nichts, was ein Konto
  braucht, nichts, was jemanden zaehlt.
- **Kein Video.**
- Der PDF-Export wird nicht angefasst.
- Kein Backend. Siehe „Daten".

## Anti-Ziele

Das Vorhaben ist gescheitert, auch wenn es funktioniert, wenn:

- **eine Karte eine Regel falsch sagt.** Ein Anfaenger glaubt, was dort steht, und traegt
  es ins Spiel. Eine fehlende Karte kostet nichts, eine falsche kostet ein Out und das
  Vertrauen in die ganze Seite.
- **man liest statt sieht.** Die Animation traegt, die Woerter beschriften. Wo ein Absatz
  noetig waere, ist die Karte falsch geschnitten.
- **eine Animation nur einmal laeuft.** Wer sie verpasst hat, muss sie zurueckholen
  koennen, ohne die Seite neu zu laden.
- **die Offense-Seite ohne Netz leer ist.** Am Platz gibt es oft keins. Die Offense-Karten
  sind Code und Zeichnung, liegen also im Bundle und gehen ohne Netz.
  **Fuer Defense gilt das ausdruecklich nicht:** `/api/plays` laeuft `NetworkFirst` mit
  5 s Zeitgrenze und darf nicht in den Vorrat, weil man Plays in der App bearbeitet (siehe
  `pwa/apiCaching.ts`). Ohne Netz zeigt die Uebersicht nur, was schon einmal geladen wurde,
  und sagt das auch selbst. Das bleibt, wie es ist. (Entscheidung des Autors.)

## Struktur

Ein neuer Reiter **Spielwissen** (am Handy „Wissen"), sichtbar fuer alle Rollen.

```
/spielwissen
├─ OFFENSE
│   ├─ In der Box          Was zaehlt als Strike?
│   ├─ Du hast getroffen   Wohin laufe ich, wann bin ich raus?
│   └─ Auf der Base        Wann darf ich weiter?
└─ DEFENSE
    └─ fuehrt direkt in die Playmaker-Uebersicht, alle Kategorien
```

Die oberste Ebene ist der Schnitt **Offense gegen Defense**. Das ist die Einteilung, in der
ein Softballer denkt, und sie ordnet die beiden Haelften ohne ein einziges erklaerendes
Wort.

Die Uebersicht nennt **keine Kapitelnummern**, sondern die Frage, die drinnen beantwortet
wird. Wer vor dem Spiel etwas sucht, sucht eine Frage, keine Ordnungszahl.

**Defense fuehrt ohne Zwischenseite** in die bestehende Playmaker-Uebersicht mit allen
Kategorien. Dort steht als Ueberschrift **Defense**, darueber klein „Playmaker". Keine
zweite Fassung der Seite, kein Query-Parameter, kein Zustand, der am Einstieg haengt: der
Spieler findet sein Wort, der Trainer behaelt seins, und die Kachel unter Orga sowie die
auf der Startseite heissen weiter „Playmaker". (Entscheidung des Autors.)

**Der bestehende Playmaker wird nicht umgefaerbt.** Die Bildsprache unten gilt fuer die
neuen Offense-Karten. „Ein Haus" traegt die **gemeinsame Geometrie**, nicht ein Neuanstrich
einer fertigen Seite: `PlaymakerOverview` ist hell gebaut, `PlayBoard` zeichnet Gras und
Sand, und `e2e/theme/kontrast.spec.ts` misst beide bereits in beiden Themes. Ein Umbau
waere ein zweiter Bauplatz ohne Anlass. (Entscheidung des Autors.)

**Die Playmaker-Routen bleiben, wo sie sind** (`/orga/playmaker…`). Lesezeichen und die
installierte App haengen daran, und die Route ist ohnehin nicht nach Rolle gesperrt. Der
neue Reiter macht sie nur sichtbar. (Entscheidung des Autors, nicht des Betreibers.)

## Welches Regelwerk

**Offizielle Softball-Regeln, Fastpitch, Mixed.** Gesetzt vom Betreiber.

Gespielt wird in der Ruhr-Fun-Liga. Fun-Ligen streichen oft Regeln (Bunt verboten,
Stealing verboten, Count startet bei 1-1, Zone ueber eine Matte statt ueber den Koerper).
**Angenommen, nicht belegt:** nichts davon gilt hier. Grundlage der Annahme ist, dass der
Betreiber die Karten zu Bunt und zu Stealing ausdruecklich bestellt hat, also beides bei
ihnen vorkommt. Wer eine Karte baut und dabei auf eine Hausregel stoesst, die ihr
widerspricht, haelt an und fragt nach, statt sie umzuschreiben.

## Die Karten

Jede Karte ist **ein Satz und eine Animation**. Die hier genannten Pointen sind
verbindlich, der genaue Wortlaut darum herum nicht.

### Kapitel 1: In der Box — Was zaehlt als Strike?

| Karte | Pointe |
|---|---|
| Die Zone bist du | Brust bis Knie, ueber der Platte. Zwei Leute, zwei Zonen. |
| Drin ist Strike | Auch wenn du nicht schwingst. |
| Auch Strike | Geschwungen und nicht getroffen. Und jedes Foul, solange du unter zwei Strikes bist. |
| Der Count ist ein Wettlauf | Vier Balls bringen dich auf die 1. Drei Strikes, und du bist raus. |
| Ein Fuss bleibt drin | Willst du ganz raus: Hand hoch, Time abwarten. Pause gibt der Ump. |
| Wofuer ein Bunt gut ist | Kurz ablegen, waehrend die Verteidigung tief steht, und du bist schon unterwegs. |
| Die Bunt-Falle | Bei zwei Strikes gebuntet und foul: du bist raus. |

### Kapitel 2: Du hast getroffen — Wohin laufe ich, wann bin ich raus?

| Karte | Pointe |
|---|---|
| Lauf. Sofort. | Nicht hinsehen, nicht abwarten. |
| Foul siehst du nicht | Zwei Baelle, gleicher Abflug, einer fair, einer foul. Nicht dein Call. |
| Raus: gefangen | Ball aus der Luft gefangen, bevor er den Boden beruehrt. |
| Raus: Wurf zur 1 | Ball ist vor dir da. |
| Raus: getickt | Jemand beruehrt dich mit dem Ball, waehrend du auf keiner Base stehst. |
| An der 1 darfst du durchlaufen | Ueber die Safety Base und zurueck. Du musst nicht bremsen. |

### Kapitel 3: Auf der Base — Wann darf ich weiter?

| Karte | Pointe |
|---|---|
| Die Base ist sicher | Steh drauf, und dir passiert nichts. |
| Los erst beim Release | Erst wenn der Ball die Hand der Pitcherin verlaesst. Kein Leadoff. |
| Wild Pitch | Ball rutscht am Catcher vorbei. Das ist dein Moment. |
| Steal | Dasselbe, nur geplant. |
| Fly gefangen: erst zurueck | Zurueck auf die Base beruehren, dann erst los. |

Die letzte Karte stand nicht auf der Liste des Betreibers. Sie steht hier, weil sie der
Zwilling von „Raus: gefangen" ist und weil genau dieser Fehler Anfaenger reihenweise ein
Out kostet. **Entscheidung des Autors**, streichbar.

## Bildsprache

Eine Grammatik fuer alle Karten, Offense wie Defense:

- **Buehne navy in beiden Themes.** Wie die Analyse-Seiten: das ist Gestaltung der Seite,
  nicht das Theme. Dunkler Grund laesst die Animationen stehen.
- **Ball** cream mit rotem Nahtring. **Strike und Out** `softball-red`. **Entscheidung,
  Zone, Pointe** `amber-400`. **Figur** cream.
- **Das Feld kommt aus `components/playmaker/board/geometry`**, nie nachgezeichnet. Wer
  dort eine Entfernung aendert, aendert diese Bilder mit. Das ist der eine Griff, der
  Offense und Defense zu einem Haus macht.
- **Kurze Woerter.** Die Pointe gross in `font-display`, versal. Darunter hoechstens ein
  Satz.
- **Keine Gedankenstriche** in sichtbarem Text. Ausdrueckliche Vorgabe des Betreibers.

## Animation

- **Jede Karte laesst sich zurueckholen.** Ein „nochmal" je Karte. Nichts laeuft in
  Schleife; eine Dauerschleife neben einem Text, den man liest, ist Laerm.
- **Der Endzustand traegt die Auskunft.** Wer die Bewegung verpasst oder abgeschaltet hat,
  sieht das letzte Bild und versteht die Karte trotzdem.
- **Reduzierte Bewegung muss jede Karte selbst tragen.** Die Regel in `styles/index.css`
  ist reines CSS (`animation-duration: 1ms`, `transition-duration: 80ms`) und fasst
  `motion/react` nicht an, weil das aus JavaScript animiert. Jede Karte liest deshalb
  `useReducedMotion()` und springt dann direkt in den Endzustand. Ohne das laufen die
  Sequenzen bei abgeschalteter Bewegung weiter, und zwar in voller Laenge.
- **Erklaerende Bewegung darf laenger laufen als Bedien-Bewegung.** Die Faustregel „unter
  300 ms" gilt fuer Knoepfe und Uebergaenge, nicht fuer eine Sequenz, deren Zweck das
  Erklaeren ist. Zwischen Ablauf und Pointe gehoert eine Pause, sonst liest niemand sie.
- **`motion/react` ist schon Abhaengigkeit** und wird im Haus benutzt.
- **Falle, im Spike gefunden:** `motion` liest `y` und `x` als Transform, nicht als
  SVG-Attribut. Wer ein `<rect y=…>` animiert, nimmt `attrY`, sonst addiert sich die
  Verschiebung auf das Attribut und das Bild sitzt doppelt so tief.
- **Am Handy ist `active:` die einzige Rueckmeldung.** `hover:` kompiliert in Tailwind v4
  zu `@media (hover: hover)` und greift auf dem Telefon nie. Jede neue
  `active:`-Palettenklasse braucht ihren Eintrag im Dunkel-Shim, sonst faellt
  `tools/palette-abdeckung.test.ts` zu Recht um.

## Daten

**Keine.** Kein Endpunkt, keine Migration, keine Entity, kein Eintrag in `apiCaching.ts`.
Der Inhalt ist fuer jeden gleich und aendert sich nur, wenn sich die Regeln aendern.

Das weicht bewusst von der Hausregel ab, dass Fachlogik ins Backend gehoert: hier gibt es
keine Logik, nur Text und Zeichnungen. Dadurch liegt die Seite im Bundle und funktioniert
ohne Netz, ohne dass dafuer etwas gebaut werden muss.

## Die Reiterleiste

Spieler haben heute vier Reiter, bekommen also fuenf. Das passt.

**Admins haben sechs und bekommen sieben.** Die Leiste ist scrollbar und zeigt bei
Ueberlauf einen Hinweis (`data-scroll-hint`), traegt das also. Trotzdem gehoert bei 390 px
nachgemessen, ob der siebte Reiter die Leiste ueberlaufen laesst, und falls ja, ob der
Hinweis wirklich erscheint. Der Kommentar in `Layout.tsx` haelt fest, dass der sechste
Reiter dort schon einmal um 2 px zu viel war.

## Vor dem Bauen zu klaeren

**Keiner dieser Punkte blockiert den Bau.** Die betroffenen Karten fallen aus der ersten
Fassung und kommen dazu, sobald jemand nachgeschlagen hat. Ein Kapitel mit sechs richtigen
Karten ist besser als eines mit sieben, von denen eine falsch ist. (Entscheidung des
Autors.)

1. **Die Ausnahmen der Batter's-Box-Regel.** Die freien Quellen sagen uebereinstimmend
   „ein Fuss bleibt drin, mit Ausnahmen", nennen die acht Ausnahmen aber nicht
   vollstaendig. Vor dem Veroeffentlichen der Karte im Regelwerk des eigenen Verbands
   nachschlagen. Eine halb richtige Karte faellt unter die Anti-Ziele.
2. **Safety Base.** Bestaetigen, dass an der 1 die orange Doppelbase benutzt wird. Sonst
   stimmt die Karte „durchlaufen" im Bild nicht.
3. **Dropped Third Strike ist nicht dabei.** Die Regel gilt je nach Liga unterschiedlich
   (oft nur bei unbesetzter 1 oder zwei Outs). Eine Karte, die fuer euch nicht gilt, ist
   schlimmer als keine. **Entscheidung des Autors**, nachtragbar, sobald die Lage klar ist.
4. **Die Strike Zone ist entschieden:** Brust bis Knie. Der WBSC-Fastpitch-Bulletin von
   2017 formuliert unteres Brustbein bis Unterkante Kniescheibe, aeltere ASA-Regeln sagen
   Achsel bis Knie. Der Betreiber hat Brust bis Knie gesetzt. Nicht ohne Ruecksprache
   aendern.

## Dem Builder ueberlassen

- Der genaue Wortlaut jeder Karte jenseits der Pointen oben.
- Ob die drei Kapitel drei Routen sind oder eine Route mit Parameter.
- Icon-Wahl (lucide oder der eigene Satz in `src/icons/`).
- Der Schnitt der Dateien, solange eine Karte eine Einheit bleibt.
- Die Testform. Gepinnt gehoert mindestens, dass jede Pointe im Dokument steht und dass der
  Reiter fuer alle Rollen erscheint.

## Aufraeumen

`frontend/src/components/howto/SpikeHowTo.tsx` und die Route `/spike-howto` in
`frontend/src/routes.tsx` sind ein Wegwerf-Spike aus der Entwurfsphase. **Beide fliegen
raus**, bevor das Echte steht.
