// Warmup & Stretching Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Warmup & Stretching

#drill(
  name: "Aufwärmroutine der Dead Sox",
  kategorien: ("Warmup", "Conditioning", "Baserunning"),
  spieler: 2,
  equipment: ("Bases oder Hütchen",),
  beschreibung: [
    Feste Aufwärmroutine für jedes Training. Wird immer in dieser Reihenfolge durchgeführt.

    === Phase 1 — Laufen & Dynamisches Dehnen

    Alle stellen sich in einer Reihe auf und gehen/laufen gemeinsam:

    + *Eine Runde laufen* — lockeres Einlaufen.
    + *Knie an die Brust* — im Gehen das Knie mit beiden Händen zur Brust ziehen. Abwechselnd links und rechts.
    + *Butt Kicks* — im Gehen die Fersen nach hinten zum Po ziehen. Abwechselnd links und rechts.
    + *Fielding-Shuffle in der Hocke* — in die tiefe Hockposition gehen und seitlich shufflen. Erst nach links (linker Fuß vor, rechter Fuß zieht nach), dann nach rechts. So tief, dass die Fanghand fast den Boden berührt.
    + *Seitwärts-Shuffle* — seitlich shufflen, Richtung wechseln.
    + *Lunges mit Drehung* — große Ausfallschritte nach vorne, dabei den Oberkörper zur Seite des vorderen Beins drehen.
    + *Joggen & Sprint* — locker joggen, dann auf Basedistanz voll durchsprinten.

    === Phase 2 — Reaktionsübung

    Alle stellen sich in einer Reihe auf, *mit dem Rücken* zum Rufer.

    - Bei *"Links"*: Rechter Fuß tippt nach vorne mittig (Dreieck-Position) → nach links drehen → Basedistanz sprinten.
    - Bei *"Rechts"*: Linker Fuß tippt nach vorne mittig (Dreieck-Position) → nach rechts drehen → Basedistanz sprinten.

    Der Fuß nach vorne mittig sorgt dafür, dass man sich schneller und sauberer in die gerufene Richtung drehen kann. Mehrmals wiederholen.

    === Phase 3 — Leadrun

    Alle stellen sich an einer Linie (Base) auf.

    + Auf "Ready, Go" einen Lead nehmen — ca. Körpergröße, also 1–2 Schritte. Linker Fuß nach vorne, dann auf die *Leadposition* gehen: Füße schulterbreit, Knie leicht gebeugt, Gewicht auf den Fußballen, tiefer Schwerpunkt, leicht nach vorne gelehnt. Bereit in beide Richtungen zu starten.
    + Dann ruft einer:
      - *"Go"* → Durchsprinten zur nächsten Base.
      - *"Back"* → Head-first Slide zurück zur Base, oder mit dem Fuß die Base berühren.
    + Mehrmals wiederholen.

    _Nur so viel Lead nehmen, dass man sicher zurückkommen kann!_

    === Phase 4 — Arme aufwärmen & Dehnen

    Alle bilden einen Kreis und machen gemeinsam Arm-Dehnübungen und Aufwärmübungen für die Schultern und Arme, bevor geworfen wird.

    === Phase 5 — Werfen

    Jeder sucht sich einen Partner. Alle stellen sich in zwei Reihen gegenüber auf. Zuwerfen und nach jedem Wurf einen Schritt zurückgehen, um die Distanz langsam zu erhöhen.

    *Wichtig:* Beide Reihen stehen auf einer Linie — nicht versetzt.
  ],
  diagramm: [
    #align(center)[*Reaktionsübung — Dreieck-Position*]
    #canvas(length: 0.8cm, {
      import draw: *

      // Spieler-Füße Startposition (Rücken zum Rufer)
      content((-0.8, 2), text(size: 7pt, fill: rgb("#888"))[L])
      content((0.8, 2), text(size: 7pt, fill: rgb("#888"))[R])
      circle((-0.8, 2), radius: 0.2, fill: rgb("#aaaaaa"), stroke: 0.5pt + black)
      circle((0.8, 2), radius: 0.2, fill: rgb("#aaaaaa"), stroke: 0.5pt + black)

      // Fuß nach vorne mittig (Dreieck)
      circle((0, 3.5), radius: 0.2, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.5), text(size: 7pt, fill: white)[R])

      // Dreieck-Linien
      line((-0.8, 2.2), (0, 3.3), stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dotted"))
      line((0.8, 2.2), (0, 3.3), stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dotted"))
      line((-0.8, 2.2), (0.8, 2.2), stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dotted"))

      // Pfeil: Fuß geht nach vorne
      line((0.8, 2.4), (0.2, 3.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Drehung nach links
      arc((0, 2.8), start: 30deg, stop: 150deg, radius: 1.8, stroke: (paint: rgb("#cc0000"), thickness: 1pt), mark: (end: ">", fill: rgb("#cc0000")))

      // Labels
      content((3.5, 2), text(size: 6pt, fill: rgb("#888"))[Startposition\ (Rücken zum Rufer)])
      content((-3.2, 3.5), text(size: 6pt, fill: rgb("#cc0000"))[← "Links"])
      content((0, 4.5), text(size: 5pt, fill: rgb("#1a1a5e"))[R-Fuß tippt\ nach vorne])
    })
  ],
  rotation: [Alle machen gleichzeitig mit. Einer ruft die Kommandos.],
)

#drill(
  name: "Sprintübung aus Fielding Position",
  kategorien: ("Warmup", "Conditioning"),
  spieler: 1,
  equipment: (),
  beschreibung: [
    Zwei Varianten, bei beiden wartet man in der Fielding Position auf das Kommando "Go".

    *Variante 1 — Hops:*
    In Fielding Position warten. Bei "Go": kleiner Hops auf den Fersen und dann lossprinten.

    *Variante 2 — Crossover-Start:*
    Mit dem rechten Fuß vorne stehen. Bei "Go": drei schnelle Crossover-Schritte (linker Fuß kreuzt vor, rechter Fuß nach, linker Fuß kreuzt vor) und dann lossprinten. Gleiches dann auch mit dem linken Fuß vorne (rechter Fuß kreuzt vor, linker nach, rechter kreuzt vor und sprinten).
  ],
  rotation: [Alle machen gleichzeitig mit. Einer ruft "Go". Mehrere Runden pro Variante.],
)
