// 2B Drills
#import "../template.typ": drill, farbe-wurf, farbe-lauf, farbe-grounder, farbe-defense, farbe-start
#import "@preview/cetz:0.3.4": canvas, draw

= 2B Drills

#drill(
  name: "2B Komplett-Drill (Hocke / Double Play / Toss zur 1B)",
  kategorien: ("2B", "SS", "Fielding", "Double Play"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Drei Phasen, die typische 2B-Spielsituationen abdecken:

    *Teil 1 — Hocke-Wurf:*
    Ein Spieler rollt den Ball frontal zur 2B. Die 2B fängt den Ball und bleibt in der Hocke. Aus der Hocke wirft sie zur 1B.

    *Teil 2 — Double Play:*
    Ein Grounder wird Richtung 2nd Base gerollt. Die 2B läuft nach links (Richtung 2nd Base), fieldet den Ball, und gibt einen kurzen Toss zum SS, der auf 2nd Base steht. Der SS wirft weiter zur 1B für den Double Play.

    *Teil 3 — Toss zur 1B:*
    Ein Grounder wird Richtung 1B-Seite gerollt. Die 2B muss nach rechts rennen, den Ball aufnehmen und zur 1B tossen.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 8pt,
      [
        #align(center)[*Teil 1: Hocke*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases: 2nd links, 1st rechts
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 2B mittig zwischen den Bases
          circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[2B])
          // 1B bei 1st Base (rechts)
          circle((3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.5), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler vor der 2B (unten)
          circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler rollt zur 2B
          line((0, 1.4), (0, 3.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Pfeil: 2B → 1B (Wurf aus Hocke)
          line((0.3, 3.2), (2.7, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 2: Double Play*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 2B Startposition (mitte)
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 2B läuft nach links Richtung 2nd Base
          circle((-1.8, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-1.8, 3.5), text(size: 7pt, weight: "bold", fill: white)[2B])
          // SS steht auf 2nd Base (links)
          circle((-3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 2.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B bei 1st Base (rechts)
          circle((3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.5), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → Richtung 2nd Base
          line((-0.3, 1.3), (-1.5, 3.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg 2B nach links
          line((-0.3, 3.5), (-1.4, 3.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Toss: 2B → SS (kurz)
          line((-2.1, 3.3), (-2.7, 2.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Wurf: SS → 1B
          line((-2.7, 2.3), (2.7, 2.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Teil 3: Toss zur 1B*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Bases
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // 2B Startposition (mitte)
          content((0, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 2B läuft nach rechts Richtung 1st Base
          circle((1.8, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1.8, 3.0), text(size: 7pt, weight: "bold", fill: white)[2B])
          // 1B bei 1st Base (rechts)
          circle((3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.5), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → Richtung 1st Base
          line((0.2, 1.3), (1.6, 2.6), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg 2B nach rechts
          line((0.3, 3.4), (1.4, 3.1), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Toss: 2B → 1B
          line((2.1, 2.8), (2.7, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Alle drei Teile werden nacheinander durchgespielt (2B bekommt 3 Bälle), dann wird rotiert: 2B → 1B → Spieler → SS → 2B (jeder durchläuft jede Position). Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)
