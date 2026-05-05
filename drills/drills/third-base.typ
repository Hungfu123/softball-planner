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

#drill(
  name: "3B Bunt Defense",
  kategorien: ("3B", "Fielding", "Situational", "Bunt Defense"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Dedizierte Übung für die Bunt Defense der 3B mit zwei Spielsituationen. Die 3B muss nach vorne chargen, den Ball sauber aufnehmen und je nach Situation das richtige Wurfziel wählen.

    *Variante 1 — Wurf zur 1B (kein Runner auf 1st):*
    - Ein Spieler legt oder rollt einen Bunt vor die 3B.
    - Die 3B rennt nach vorne, nimmt den Ball auf und macht einen Sidewurf zur 1B.
    - SS rückt zur 3rd Base vor (covered).

    *Variante 2 — Wurf zur 2nd Base (Runner auf 1st):*
    - Ein Spieler legt oder rollt einen Bunt vor die 3B.
    - Die 3B rennt nach vorne, nimmt den Ball auf und wirft zur 2nd Base (Force Out).
    - SS rückt zur 3rd Base vor, SS/2B covered 2nd Base.

    *Wichtig:* Aggressiv nach vorne chargen — nicht warten bis der Ball zu einem kommt. Ball mit Handschuh und Wurfhand gleichzeitig sichern (Barehand nur wenn nötig). Füße beim Aufnehmen Richtung Wurfziel stellen. Sidewurf zur 1B ist schneller als Überkopf auf kurze Distanz.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Var. 1: 3B → 1B*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 1st Base
          rect((2.8, 3.3), (3.2, 3.7), fill: white, stroke: 1pt + black)
          content((3, 4.1), text(size: 6pt, fill: rgb("#888"))[1st])
          // Home
          rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
          content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
          // 3B Startposition
          content((-1.5, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 3B chargt nach vorne
          circle((-0.5, 1.8), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-0.5, 1.8), text(size: 7pt, weight: "bold", fill: white)[3B])
          // Laufweg 3B nach vorne
          line((-1.3, 3.2), (-0.7, 2.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // 1B an der Base
          circle((3, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 3.0), text(size: 7pt, weight: "bold", fill: white)[1B])
          // SS covered 3rd
          circle((-3, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 3.0), text(size: 6pt, weight: "bold", fill: white)[SS])
          // Laufweg SS zur 3rd
          line((-1.8, 4.2), (-2.8, 3.4), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          content((-1.5, 4.5), text(size: 5pt, fill: rgb("#888"))[covered])
          // Spieler (buntet)
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Bunt
          line((0, 0.9), (-0.3, 1.4), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Sidewurf: 3B → 1B
          line((-0.2, 2.0), (2.6, 3.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Var. 2: 3B → 2nd (Force)*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base
          rect((-3.2, 3.3), (-2.8, 3.7), fill: white, stroke: 1pt + black)
          content((-3, 4.1), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 2nd Base
          rect((-0.2, 5.3), (0.2, 5.7), fill: white, stroke: 1pt + black)
          content((0, 6.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // Home
          rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
          content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
          // 3B Startposition
          content((-1.5, 3.5), text(size: 11pt, fill: rgb("#aaa"))[×])
          // 3B chargt nach vorne
          circle((-0.5, 1.8), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-0.5, 1.8), text(size: 7pt, weight: "bold", fill: white)[3B])
          // Laufweg 3B nach vorne
          line((-1.3, 3.2), (-0.7, 2.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // SS covered 2nd
          circle((0, 5.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 5.0), text(size: 6pt, weight: "bold", fill: white)[SS])
          // Laufweg SS zur 2nd
          line((-1.5, 4.2), (-0.3, 4.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          content((-2.0, 4.5), text(size: 5pt, fill: rgb("#888"))[covered])
          // Spieler (buntet)
          circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Runner auf 1st (Offense)
          circle((2.5, 3.0), radius: 0.35, fill: rgb("#cc0000"), stroke: 0.5pt + black)
          content((2.5, 3.0), text(size: 7pt, weight: "bold", fill: white)[R])
          // Runner-Laufweg Richtung 2nd
          line((2.3, 3.3), (0.4, 4.7), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Bunt
          line((0, 0.9), (-0.3, 1.4), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Wurf: 3B → 2nd Base (Force)
          line((-0.3, 2.1), (-0.1, 4.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [3B → SS → 1B → Spieler → 3B. Erst mehrere Runden Variante 1, dann Variante 2. Optional bei mehr Spielern: zusätzlicher Runner auf 1st für Variante 2.],
  varianten: [Barehand-Pickup: Ball liegt still, 3B nimmt mit der bloßen Hand auf und wirft aus dem Laufen. Oder: Coach ruft "Eins!" (1B) oder "Zwei!" (2nd) erst nach dem Aufnehmen — 3B muss schnell reagieren.],
)

#drill(
  name: "3B Short Hop Reaction",
  kategorien: ("3B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Reaktions- und Hände-Drill für 3B. Werfer steht ca. 1.5–2 m vor 3B und wirft Short Hops abwechselnd middle / forehand / backhand.

    *Ablauf:* 10 Würfe middle, 10 forehand, 10 backhand. Tempo zügig, 3B bleibt tief in der Hocke.

    *Fokus:* Schnelle Hände, kein Zurückweichen, Ball aus der Hocke fangen — nicht stehen bleiben.
  ],
  rotation: [Werfer und 3B tauschen nach 30 Bällen.],
)

#drill(
  name: "3B Forehand & Backhand zur 1B",
  kategorien: ("3B", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Base (1B)"),
  beschreibung: [
    Isolierte Bewegungs-Übung für 3B-Fielding zur 1B.

    *Phase 1 — Forehand:* Tosser rollt links Richtung 2B-Seite. 3B nimmt den Ball forehand auf, wirft zur 1B.

    *Phase 2 — Backhand:* Tosser rollt rechts Richtung Foul-Line. 3B Crossover-Schritt nach rechts, Ball backhand aufnehmen, Wurf zur 1B.

    Keine Spielsituation, keine Bunts — nur die saubere Bewegung und der Wurf.
  ],
  rotation: [Rotation 3B → 1B → Tosser → 3B nach 6–8 Bällen pro Phase.],
)

#drill(
  name: "3B Reaktion „Jetzt!\"",
  kategorien: ("3B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Reaktions-Drill mit erstem Schritt-Footwork.

    *Ablauf:* 3B steht mit Rücken zum Werfer. Werfer wirft einen Grounder und ruft gleichzeitig „Jetzt!". 3B dreht sich, sucht den Ball, fieldet ihn und wirft zur 1B (oder Stand-in).

    *Fokus:* Reaktion, schneller First-Step (Jab → Crossover), Ball schnell finden. 10 Bälle pro Runde.
  ],
  rotation: [Werfer und 3B tauschen nach 10 Bällen.],
)
