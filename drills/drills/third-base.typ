// 3B Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= 3B Drills

#drill(
  name: "3B Komplett-Drill (Fielding links / Backhand / Bunt)",
  kategorien: ("3B", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Drei Phasen, die typische 3B-Spielsituationen abdecken. 3B bekommt 3 Bälle, dann wird rotiert.

    *Teil 1 — Fielding links (Richtung 2B):*
    Ein Grounder wird nach links (Richtung 2nd Base) gerollt. Die 3B nimmt den Ball an und wirft zur 1B.

    *Teil 2 — Backhand rechts:*
    Ein Grounder wird nach rechts (Richtung Foul-Line) gerollt. Die 3B läuft nach rechts, nimmt den Ball backhand an und wirft zur 1B.

    *Teil 3 — Bunt Defense:*
    Ein Bunt wird vor die 3B gelegt. Die 3B rennt nach vorne, nimmt den Ball auf und macht einen Sidewurf zur 1B.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 8pt,
      [
        #align(center)[*Teil 1: Links*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base links oben
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 1st Base diagonal unten rechts
          rect((2.8, 0.3), (3.2, 0.7), fill: white, stroke: 1pt + black)
          content((3, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 3B Startposition
          content((-1, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 3B läuft nach rechts (Richtung 2nd Base)
          circle((1, 3.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1, 3.2), text(size: 7pt, weight: "bold", fill: white)[3B])
          // 1B bei 1st Base (unten rechts)
          circle((3, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten (Richtung Home)
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → links (Richtung 2B)
          line((0.2, 0.8), (0.8, 2.8), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg 3B nach links
          line((-0.7, 3.4), (0.6, 3.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: 3B → 1B (diagonal nach unten rechts)
          line((1.3, 3.0), (2.7, 1.4), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 2: Backhand*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 1st Base diagonal unten rechts
          rect((2.8, 0.3), (3.2, 0.7), fill: white, stroke: 1pt + black)
          content((3, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 3B Startposition
          content((-1, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 3B läuft nach rechts (Richtung Foul-Line)
          circle((-2.5, 2.8), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-2.5, 2.8), text(size: 7pt, weight: "bold", fill: white)[3B])
          // 1B bei 1st Base (unten rechts)
          circle((3, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → rechts (Foul-Line)
          line((-0.2, 0.8), (-2.3, 2.4), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg 3B nach rechts
          line((-1.3, 3.4), (-2.2, 3.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: 3B → 1B (diagonal nach unten rechts)
          line((-2.2, 2.6), (2.7, 1.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 3: Bunt*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 1st Base diagonal unten rechts
          rect((2.8, 0.3), (3.2, 0.7), fill: white, stroke: 1pt + black)
          content((3, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 3B Startposition
          content((-1, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 3B rennt nach vorne zum Bunt
          circle((0, 1.8), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 1.8), text(size: 7pt, weight: "bold", fill: white)[3B])
          // 1B bei 1st Base (unten rechts)
          circle((3, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Bunt: Spieler legt Ball vor 3B
          line((0, 0.8), (0, 1.4), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg 3B nach vorne
          line((-0.9, 3.2), (-0.1, 2.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Sidewurf: 3B → 1B
          line((0.3, 1.7), (2.7, 1.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Alle drei Teile werden nacheinander durchgespielt (3B bekommt 3 Bälle), dann wird rotiert: 3B → 1B → Spieler → 3B. Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)
