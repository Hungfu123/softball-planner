// Shortstop Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= SS Drills

#drill(
  name: "SS Komplett-Drill (Backhand / Slow Roller / Double Play / Force)",
  kategorien: ("SS", "2B", "Fielding", "Double Play"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Fünf Phasen, die typische SS-Spielsituationen abdecken. SS steht zwischen 2nd und 3rd Base, schaut Richtung Schlagmann. SS bekommt 5 Bälle, dann wird rotiert.

    *Grundtechnik SS:* Nach dem Fielding einen kleinen Bogen nach links machen, um Schwung Richtung 1B mitzunehmen. Gilt immer, wenn man den Ball bekommt und zur 1B werfen muss. _Tipp: Ein Hütchen als Orientierung für den Bogen aufstellen, falls man die Linie als Hilfe braucht._

    *Teil 1 — Backhand rechts:*
    Ein Grounder wird nach rechts (Richtung 3rd Base) gerollt. Der SS läuft nach rechts, nimmt den Ball backhand an und wirft zur 1B.

    *Teil 2 — Slow Roller mit Bogen:*
    Ein Grounder wird frontal Richtung SS gerollt. Der SS läuft auf den Ball zu, nimmt ihn auf und macht einen kleinen Bogen nach links um den Schwung Richtung 1B mitzunehmen, dann wirft zur 1B.

    *Teil 3 — Hocke-Wurf (Double Play 6-4-3):*
    Ein Grounder wird frontal zum SS gerollt. Der SS nimmt den Ball an, bleibt in der Hocke und wirft zur 2B. Die 2B wirft weiter zur 1B für den Double Play.

    *Teil 4 — Force an 2nd Base:*
    Ein Grounder wird nach links (nah an 2nd Base) gerollt. Der SS läuft nach links, tritt auf die 2nd Base und wirft zur 1B.

    *Teil 5 — Double Play 6-4-3 (Ball Richtung 2nd):*
    Ein Grounder wird nach links (Richtung 2nd Base) gerollt. Der SS läuft nach links, fieldet den Ball und wirft zur 2B. Die 2B wirft weiter zur 1B für den Double Play.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Teil 1: Backhand rechts*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases: 3rd links, 2nd rechts
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS Startposition (mitte)
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // SS läuft nach links (Richtung 3rd Base)
          circle((-1.8, 3.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-1.8, 3.2), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten (Richtung Home)
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → Richtung 3rd Base Seite
          line((-0.3, 0.8), (-1.5, 2.8), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg SS nach links
          line((-0.3, 3.4), (-1.4, 3.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: SS → 1B
          line((-1.5, 3.0), (2.7, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 2: Slow Roller mit Bogen*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS Startposition
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // SS läuft vor, dann Bogen nach rechts (Richtung 2nd Base) um Schwung Richtung 1B zu haben
          circle((0.8, 2.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0.8, 2.0), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → frontal
          line((0, 0.9), (0, 2.2), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg SS: nach vorne, dann Bogen nach rechts
          bezier((0, 3.2), (0.8, 2.4), (0, 2.5), (0.5, 2.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: SS → 1B
          line((1.1, 1.8), (2.7, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 3: Double Play*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS (bleibt in der Mitte)
          circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 2B bei 2nd Base
          circle((3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.5), text(size: 7pt, weight: "bold", fill: white)[2B])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → SS
          line((0, 0.9), (0, 3.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Wurf: SS → 2B (aus Hocke)
          line((0.3, 3.3), (2.7, 2.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Wurf: 2B → 1B
          line((3, 2.2), (3, 1.4), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 4: Force an 2nd Base*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS Startposition
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // SS läuft nach rechts zur 2nd Base
          circle((2.2, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((2.2, 3.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → Richtung 2nd Base
          line((0.3, 0.8), (2.0, 3.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg SS nach rechts zur Base
          line((0.3, 3.5), (1.8, 3.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: SS → 1B
          line((2.4, 3.2), (3, 1.4), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Alle fünf Teile werden nacheinander durchgespielt (SS bekommt 5 Bälle), dann wird rotiert: SS → 1B → Spieler → 2B → SS (jeder durchläuft jede Position). Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
  varianten: [Wenn 5 Teile zu viel sind: 3 Teile auswählen (z.B. Teil 1 Backhand + Teil 2 Slow Roller + Teil 3 Double Play) und nur diese durchspielen.],
)

#drill(
  name: "SS Backhand zur 1B",
  kategorien: ("SS", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Einfacher Drill für das Backhand-Fielding. Der Spieler schlägt oder rollt den Ball nach rechts (Richtung 3rd Base, aus SS-Sicht). Der SS läuft nach rechts, nimmt den Ball backhand an und wirft zur 1B.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Bases: 3rd links, 2nd rechts
      rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
      content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
      rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
      content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
      // SS Startposition
      content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
      // SS läuft nach links (Richtung 3rd Base)
      circle((-1.8, 3.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-1.8, 3.2), text(size: 7pt, weight: "bold", fill: white)[SS])
      // 1B unten rechts
      circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Spieler unten
      circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
      // Grounder: Spieler → Richtung 3rd Base
      line((-0.3, 0.8), (-1.5, 2.8), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Laufweg SS nach links
      line((-0.3, 3.4), (-1.4, 3.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Wurf: SS → 1B
      line((-1.5, 3.0), (2.7, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [SS → 1B → Spieler → SS. Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)

#drill(
  name: "SS Force 3B + Bogen zur 1B",
  kategorien: ("SS", "3B", "Fielding"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Zwei Phasen. SS bekommt 2 Bälle, dann wird rotiert.

    *Teil 1 — Force an 3rd Base:*
    Ein Grounder wird frontal zum SS gerollt. Der SS tosst zur 3B. Die 3B tritt auf die Base und wirft zur 1B.

    *Teil 2 — Bogen zur 1B:*
    Ein Grounder wird frontal oder leicht nach links zum SS gerollt. Der SS läuft auf den Ball zu, nimmt ihn auf und macht einen kleinen Bogen nach links um den Schwung Richtung 1B mitzunehmen, dann wirft zur 1B.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Teil 1: Force an 3rd Base*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS (mitte)
          circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 3B bei 3rd Base (links)
          circle((-3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 2.5), text(size: 7pt, weight: "bold", fill: white)[3B])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → SS
          line((0, 0.9), (0, 3.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Toss: SS → 3B
          line((-0.3, 3.3), (-2.7, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Wurf: 3B → 1B
          line((-2.7, 2.3), (2.7, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 2: Bogen zur 1B*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // SS Startposition
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // SS nach Bogen
          circle((0.8, 2.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0.8, 2.0), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B unten rechts
          circle((3, 1), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → frontal
          line((0, 0.9), (0, 2.2), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg SS: nach vorne, dann Bogen nach links
          bezier((0, 3.2), (0.8, 2.4), (0, 2.5), (0.5, 2.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: SS → 1B
          line((1.1, 1.8), (2.7, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Beide Teile werden nacheinander durchgespielt (SS bekommt 2 Bälle), dann wird rotiert: SS → 3B → 1B → Spieler → SS. Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)

#drill(
  name: "SS Halbkreis Fielding (Forehand / Backhand / Forehand)",
  kategorien: ("SS", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Hütchen", "Base (1B)"),
  beschreibung: [
    Bewegungs- und Fielding-Drill auf einer gebogenen Linie. Aufbau: Mehrere Hütchen werden in einem Halbkreis aufgestellt. Der Tosser steht innerhalb des Halbkreises, die 1B steht an der 1st Base. Der SS läuft den Halbmond entlang und nimmt drei Bälle an unterschiedlichen Punkten auf.

    *Ball 1 — Forehand am Startpunkt:*
    SS startet am rechten Rand des Halbkreises. Tosser rollt/wirft den Ball zum SS. SS nimmt den Ball forehand auf und wirft zur 1B.

    *Ball 2 — Backhand entlang des Halbmonds:*
    SS läuft den Halbkreis entlang zum gegenüberliegenden Rand. Tosser rollt den Ball, SS nimmt ihn mit Backhand auf und wirft zur 1B.

    *Ball 3 — Forehand zurück:*
    SS läuft denselben Weg zurück Richtung Startpunkt. Tosser rollt den Ball, SS nimmt ihn forehand auf und wirft zur 1B.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // 1B Base
      rect((5.3, 0.3), (5.7, 0.7), fill: white, stroke: 1pt + black)
      content((5.5, 1.1), text(size: 6pt, fill: rgb("#888"))[1st])
      // Halbkreis-Hütchen (orange Punkte auf Bogen, Zentrum (0, 1.5), Radius 2.5, obere Hälfte)
      circle((-2.5, 1.5), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((-2.16, 2.75), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((-1.25, 3.66), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((0, 4.0), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((1.25, 3.66), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((2.16, 2.75), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((2.5, 1.5), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      // Tosser im Zentrum
      circle((0, 1.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1.5), text(size: 7pt, weight: "bold", fill: white)[T])
      // 1B
      circle((5.5, 0.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((5.5, 0.5), text(size: 7pt, weight: "bold", fill: white)[1B])
      // SS Position 1 (Start rechts) — Forehand, auch Endpunkt von Ball 3
      circle((2.85, 1.7), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2.85, 1.7), text(size: 6pt, weight: "bold", fill: white)[SS¹³])
      // SS Position 2 (links) — Backhand
      circle((-2.85, 1.7), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2.85, 1.7), text(size: 6pt, weight: "bold", fill: white)[SS²])
      // Bewegung 1 → 2 (Bogen über Halbmond)
      bezier((2.6, 2.0), (-2.6, 2.0), (1.8, 4.5), (-1.8, 4.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Bewegung 2 → 3 (Bogen zurück, leicht nach unten versetzt)
      bezier((-2.6, 1.4), (2.6, 1.4), (-1.5, 3.5), (1.5, 3.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Toss: T → SS¹ (rechts)
      line((0.4, 1.55), (2.4, 1.7), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Toss: T → SS² (links)
      line((-0.4, 1.55), (-2.4, 1.7), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Wurf: SS¹ → 1B
      line((3.2, 1.4), (5.2, 0.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Wurf: SS² → 1B
      line((-2.5, 1.4), (5.2, 0.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [SS bekommt 3 Bälle (Forehand → Backhand → Forehand), danach wird rotiert: SS → 1B → Tosser → SS. Bei mehr Spielern: 2–3 Runden pro Position vor dem Wechsel.],
  varianten: [Statt Rollen auch Werfen lassen (Linedrives). Tempo steigern: SS soll während der Bewegung fielden, nicht stehen bleiben. Hütchen enger setzen = engerer Bogen, schwerer.],
)
