// Catcher Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Catcher

#drill(
  name: "Catcher Relay Home — 1B",
  kategorien: ("Catcher", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für den Catcher: Ball annehmen und schnell zur 1st Base weiterwerfen, und andersrum.

    *Variante 1 — Infielder → Home → 1B:*
    Ein Infielder (3B, SS, 2B oder P) wirft nach Home. Der Catcher fängt den Ball und wirft direkt zur 1B.

    *Variante 2 — 1B → Home → Infielder:*
    Die 1B wirft nach Home. Der Catcher fängt den Ball und wirft zum Infielder.

    Jeder Infielder kommt dran. Fokus auf schnelles Fangen und Umsetzen des Catcher.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Var. 1: Infield → Home → 1B*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Home unten mitte
          rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
          content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
          // 1st Base rechts
          rect((3.8, 0.3), (4.2, 0.7), fill: white, stroke: 1pt + black)
          content((4, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // Catcher bei Home
          circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
          // 1B bei 1st Base
          circle((4, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((4, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Infielder oben
          circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 3.5), text(size: 6pt, weight: "bold", fill: white)[IF])
          // Wurf: Infielder → Catcher
          line((0, 3.1), (0, 1.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Wurf: Catcher → 1B
          line((0.3, 1.2), (3.6, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Var. 2: 1B → Home → Infield*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Home unten mitte
          rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
          content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
          // 1st Base rechts
          rect((3.8, 0.3), (4.2, 0.7), fill: white, stroke: 1pt + black)
          content((4, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // Catcher bei Home
          circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
          // 1B bei 1st Base
          circle((4, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((4, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Infielder oben
          circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 3.5), text(size: 6pt, weight: "bold", fill: white)[IF])
          // Wurf: 1B → Catcher
          line((3.6, 1.2), (0.3, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Wurf: Catcher → Infielder
          line((0, 1.6), (0, 3.1), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Infielder-Position rotiert (3B, SS, 2B, P). Catcher und 1B tauschen nach einer Runde aller Infielder. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "Catcher Quick Throw zur 1B",
  kategorien: ("Catcher", "Fielding"),
  spieler: 2,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Mehrere Bälle liegen nah vor der Homeplate. Der Catcher steht in seiner Catcher Stance.

    *Ablauf:*
    - Aus der Catcher Stance einen Ball aufnehmen.
    - Einen kleinen Bogen Richtung 1st Base machen um den Wurfwinkel zu bekommen.
    - Zur 1B werfen.
    - Direkt den nächsten Ball aufnehmen und wiederholen bis alle Bälle geworfen sind.

    Fokus auf schnelles Aufnehmen und sauberen Wurf aus der tiefen Position.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Home
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      // 1st Base rechts
      rect((4.8, 0.3), (5.2, 0.7), fill: white, stroke: 1pt + black)
      content((5, -0.1), text(size: 6pt, fill: rgb("#888"))[1st])
      // Catcher hinter Home
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
      // 1B
      circle((5, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((5, 1.2), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Bälle vor Home
      circle((-0.5, 2.0), radius: 0.15, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      circle((0, 2.2), radius: 0.15, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      circle((0.5, 2.0), radius: 0.15, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      circle((0.2, 2.5), radius: 0.15, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      content((0, 3.0), text(size: 6pt, fill: rgb("#888"))[Bälle])
      // Bogen: Catcher nimmt Ball auf, macht Bogen Richtung 1B
      bezier((0, 1.5), (1.5, 1.0), (0.5, 1.8), (1.0, 0.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Wurf zur 1B
      line((1.5, 1.0), (4.6, 1.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Catcher und 1B tauschen nach jedem Durchgang. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "Catcher Coming zur 2nd Base",
  kategorien: ("Catcher", "Situational", "Comings"),
  spieler: 3,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für den schnellen Wurf vom Catcher zur 2nd Base bei einem Steal.

    *Ablauf:*
    - Der Catcher steht in seiner Stance hinter Home.
    - Ein Pitcher wirft zum Catcher.
    - Ein Spieler an der 2nd Base ruft "Steal!"
    - Der Catcher fängt den Ball und wirft sofort zur 2nd Base.
    - An der 2nd Base steht ein Infielder (SS oder 2B) der den Ball fängt und den Tag macht.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Home
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      // 2nd Base oben
      rect((-0.2, 5.3), (0.2, 5.7), fill: white, stroke: 1pt + black)
      content((0, 6.1), text(size: 6pt, fill: rgb("#888"))[2nd])
      // Catcher
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
      // Pitcher
      circle((0, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.0), text(size: 7pt, weight: "bold", fill: white)[P])
      // Infielder an 2nd Base
      circle((0.5, 5.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0.5, 5.0), text(size: 6pt, weight: "bold", fill: white)[SS])
      // "Steal!" Ruf
      content((1.8, 5.0), text(size: 7pt, weight: "bold", fill: rgb("#cc0000"))["Steal!"])
      // Pitch: P → C
      line((0, 2.6), (0, 1.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Coming: C → 2nd
      line((0.1, 1.5), (0.4, 4.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Catcher, Pitcher und Infielder rotieren. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "Catcher Coming zur 3rd Base",
  kategorien: ("Catcher", "Situational", "Comings"),
  spieler: 3,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für den schnellen Wurf vom Catcher zur 3rd Base bei einem Steal.

    *Ablauf:*
    - Der Catcher steht in seiner Stance hinter Home.
    - Ein Pitcher wirft zum Catcher.
    - Ein Spieler an der 3rd Base ruft "Steal!"
    - Der Catcher fängt den Ball und wirft sofort zur 3rd Base.
    - An der 3rd Base steht die 3B die den Ball fängt und den Tag macht.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Home
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      // 3rd Base links oben
      rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
      content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
      // Catcher
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
      // Pitcher
      circle((0, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.0), text(size: 7pt, weight: "bold", fill: white)[P])
      // 3B an der Base
      circle((-2.5, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2.5, 3.0), text(size: 7pt, weight: "bold", fill: white)[3B])
      // "Steal!" Ruf
      content((-4.2, 3.0), text(size: 7pt, weight: "bold", fill: rgb("#cc0000"))["Steal!"])
      // Pitch: P → C
      line((0, 2.6), (0, 1.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Coming: C → 3rd
      line((-0.2, 1.5), (-2.3, 2.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Catcher, Pitcher und 3B rotieren. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)
