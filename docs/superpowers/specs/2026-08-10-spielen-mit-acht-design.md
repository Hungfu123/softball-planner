# Spielen mit acht Feldspielerinnen

**Datum:** 2026-08-10
**Status:** Design, noch nicht umgesetzt

## Problem

Mixed Fastpitch schreibt ein Geschlechterverhältnis vor. Steht an einem Spieltag nur eine Frau
zur Verfügung, lässt sich damit keine reguläre Aufstellung stellen — das Team tritt mit acht
Spielerinnen an oder gar nicht.

Der Spielbogen lässt das nicht zu. `BogenLineupValidator` verlangt mindestens neun Slots:

```
Lineup für HOME muss mindestens 9 Spieler haben (aktuell: 8)   → HTTP 400
```

Empirisch bestätigt. Der Wizard blockt schon vorher (`wizardValidation.ts:11`,
`filledHome >= 9 && filledAway >= 9`).

Damit ist ein Spiel, das auf dem Platz stattfindet, in der App nicht erfassbar.

## Lösung

Zwei Änderungen, nichts weiter:

1. **Minimum von 9 auf 8 senken** — im Backend-Validator und im Wizard.
2. **Warnung bei weniger als neun**, die zwei Dinge sagt: dass die Aufstellung unter neun liegt,
   und dass das automatische Out für den fehlenden Platz **selbst** eingetragen werden muss.

Das automatische Out existiert bereits und wird manuell ausgelöst. Es entsteht also kein neues
Konzept — die App erlaubt nur, was auf dem Platz ohnehin passiert, und weist auf die eine
Pflicht hin, die der Scorer übernehmen muss.

### Was bewusst NICHT gebaut wird

Ein früherer Entwurf sah einen als „frei" markierten neunten Slot vor, damit das automatische
Out dort entsteht, wo es hingehört, und die App es von selbst anbietet. **Verworfen** — auf
Entscheidung des Nutzers, und die Begründung gehört festgehalten, weil sie eine bewusste
Abwägung ist und kein Versehen:

Der Preis der einfachen Lösung ist, dass das automatische Out dem **aktuellen** Slot
zugeordnet wird (`SpielbogenPage.tsx:510-512`, `slotId: currentSlot.id`). Bei acht Plätzen ist
nach der Achten wieder die Erste dran, das Out landet also in ihrer Zelle. Auf dem Bogen sieht
es aus, als hätte sie ein automatisches Out gehabt, und ihr echter At-Bat teilt sich dann die
Zelle mit dem Eintrag.

**Die Out-Zahl stimmt** — nur die Zuordnung nicht. Das ist für die Liga hinnehmbar; der Aufwand
für Migration, Validierungsregeln und einen eigenen UI-Zweig steht dazu nicht im Verhältnis.

Falls sich im Einsatz zeigt, dass die Zuordnung doch störend ist oder das Out regelmäßig
vergessen wird, ist der freie Platz die naheliegende Ausbaustufe — additiv, nichts an dieser
Arbeit wäre dann umsonst.

## Was gar keine Arbeit ist

**Eine unbesetzte Feldposition ist bereits erlaubt.** `BogenLineupValidator` prüft
Positionswerte nur gegen `VALID_POSITIONS` und verlangt weder Vollständigkeit noch
Eindeutigkeit; der Wizard erzwingt Positionen ebenfalls nicht. Für „im Feld bleibt eine
Position unbesetzt" ist **keine Änderung** nötig.

Das gehört festgehalten, damit niemand es später als fehlende Validierung „nachbessert".

**Das automatische Out braucht keine Änderung.** `docs/SPIELBOGEN.md:48` beschreibt es genau
für diesen Zweck („fehlende Spielerin"): ein Out, weder At-Bat noch Plate Appearance, Base-State
unverändert, Undo und 3rd-Out-Auto-Switch über den normalen At-Bat-Pfad. Auslösbar über die
Out-Punkte im Live-Strip oder das MEHR-Menü.

## Änderungen im Detail

### Backend

`domain/service/BogenLineupValidator.java:21` — Grenze von 9 auf 8:

```java
if (slots.size() < 8) {
    throw new BusinessValidationException(
        "Lineup für " + side + " muss mindestens 8 Spieler haben (aktuell: " + slots.size() + ")"
    );
}
```

Maximum bleibt 10. Die Prüfung auf sequenzielle Batting-Order 1..N bleibt unverändert und
funktioniert für acht ohne Anpassung.

Keine Migration. Kein neues Feld. Keine Änderung an Entity, Mapper, Port oder Adapter.

### Frontend

`components/spielbogen/wizardValidation.ts:11` — `>= 9` zu `>= 8` in `lineupIsValid`.

**Die Warnung** erscheint im Aufstellungs-Schritt des Wizards, sobald eine Seite weniger als
neun befüllte Namen hat. `lineupCounts` liefert die Zahlen dafür bereits.

Sie muss beides benennen, sonst erfüllt sie ihren Zweck nicht:

> **Nur 8 Spielerinnen aufgestellt.** Der fehlende Platz zählt bei jedem Durchgang als Out —
> du musst das automatische Out selbst eintragen (über die Out-Punkte oder MEHR → Automatisches
> Out).

Sie **blockiert nicht**. Acht ist eine gültige Aufstellung, kein Fehler. Also der Ton und die
Farbgebung einer Warnung, nicht einer Fehlermeldung — die Amber-Utilities, die das Projekt für
Status-Warnungen führt (`styles/index.css:6`), nicht `softball-red`.

Erscheint pro betroffener Seite, mit dem Teamnamen, damit klar ist, welche Mannschaft gemeint
ist — bei einer asymmetrischen Aufstellung (eine Seite acht, die andere zehn) ist das sonst
Rätselraten.

### Ausdrücklich nicht im Umfang

- **Eine Erinnerung während des Spiels.** Die Warnung steht beim Aufstellen, also womöglich
  zwanzig Minuten vor dem ersten Pitch. Ein dauerhafter Hinweis auf der Scoring-Seite wäre der
  Ort, an dem er wirkt — der Nutzer hat ihn nicht verlangt und er wird nicht auf Verdacht
  gebaut. Wenn sich im Einsatz zeigt, dass Outs vergessen werden, ist das die erste
  Ausbaustufe.
- Sieben oder weniger Spielerinnen.
- Erkennung des Geschlechterverhältnisses. Die App kennt das Geschlecht der Spielerinnen nicht.
- Legacy-Scoring (`ScoringPage`). Eigene Validierung, eigene `AutomaticOutEvent`-Tabelle; die
  Regel wird nur im Spielbogen umgesetzt.

## Tests

**Backend** — `BogenLineupValidator`:

- acht Slots sind gültig
- sieben Slots werden weiter abgelehnt, mit der neuen Grenze in der Meldung
- zehn Slots bleiben gültig, elf weiter abgelehnt
- sequenzielle Batting-Order 1..8 wird akzeptiert, eine Lücke (1..7 und 9) weiter abgelehnt

**Frontend** — `wizardValidation`:

- acht Namen pro Seite gelten als gültig
- sieben nicht
- asymmetrisch (acht gegen zehn) gilt als gültig

**Frontend** — Warnung im Wizard:

- bei acht Namen erscheint sie, mit dem Namen der betroffenen Mannschaft
- bei neun oder zehn erscheint sie nicht
- bei acht gegen zehn erscheint sie **nur** für die betroffene Seite
- der Weiter-Button bleibt aktiv — der Test muss fallen, wenn die Warnung blockiert. Das ist
  die eigentliche Zusicherung: acht ist erlaubt, nicht bloß gewarnt.

**Vor dem Merge**

- `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- `cd frontend && npm test && npm run build && npm run lint`
- `cd frontend && npm run test:e2e`
- Einen echten Bogen mit acht Spielerinnen anlegen, ein Inning mit einem manuellen
  automatischen Out durchspielen, das PDF ansehen. Diese Regel betrifft das Blatt für die Liga
  und gehört gedruckt geprüft, nicht nur im Test.

## Dokumentation

`docs/SPIELBOGEN.md`: Lineup-Grenzen auf 8–10 korrigieren, dazu die Notiz, dass eine unbesetzte
Feldposition absichtlich nicht validiert wird, und der Hinweis, dass das automatische Out bei
einer Achter-Aufstellung manuell erfolgt.
