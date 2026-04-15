// 1B Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= 1B Drills

#drill(
  name: "1B Footwork & Stretch",
  kategorien: ("1B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Übung für das richtige Footwork an der 1st Base. Die 1B steht mit den Fußballen an der Innenkante der Base (Richtung Infield) und streckt sich je nach Wurfrichtung.

    *Grundposition:* Fußballen an der Innenkante der Base, Blick ins Feld, bereit in jede Richtung zu stretchen.

    *Stretch je nach Wurf:*
    - *Wurf von links (3B / SS):* Rechter Fuß bleibt an der Base, Stretch mit dem linken Fuß Richtung Ball.
    - *Wurf von rechts (2B / P):* Linker Fuß bleibt an der Base, Stretch mit dem rechten Fuß Richtung Ball.
    - *Wurf frontal:* Beide Optionen möglich — Stretch mit dem Fuß der zur Wurfseite zeigt.

    Ein Spieler wirft aus verschiedenen Positionen (3B, SS, 2B, P) zur 1B. Die 1B übt den richtigen Stretch mit dem richtigen Fuß. Fokus auf sauberes Footwork, nicht auf Wurfgeschwindigkeit.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Base
      rect((-0.2, 2.8), (0.2, 3.2), fill: white, stroke: 1pt + black)
      content((0, 2.3), text(size: 6pt, fill: rgb("#888"))[1st])

      // 1B auf der Base
      circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[1B])

      // Stretch nach links (Wurf von 3B/SS)
      line((-0.3, 3.5), (-2.0, 3.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((-2.5, 3.9), text(size: 5pt, fill: rgb("#1a1a5e"))[Stretch])

      // Wurf von links (3B/SS)
      line((-4, 5.5), (-2.0, 3.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((-4.3, 5.9), text(size: 5pt, fill: rgb("#888"))[3B/SS])

      // Stretch nach rechts (Wurf von 2B/P)
      line((0.3, 3.5), (2.0, 3.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.5, 3.9), text(size: 5pt, fill: rgb("#1a1a5e"))[Stretch])

      // Wurf von rechts (2B/P)
      line((4, 5.5), (2.0, 3.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((4.3, 5.9), text(size: 5pt, fill: rgb("#888"))[2B/P])

      // Stretch nach vorne (frontal)
      line((0, 3.9), (0, 5.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((0.8, 4.5), text(size: 5pt, fill: rgb("#1a1a5e"))[Stretch])
    })
  ],
  rotation: [Werfer und 1B tauschen nach einer Runde (z.B. 5 Würfe pro Richtung). Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "1B Scoops",
  kategorien: ("1B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Übung für das Aufnehmen von niedrigen Würfen (Short-Hops) an der 1st Base. Die wichtigste Fähigkeit einer 1B — schlechte Würfe aus dem Dreck sauber aufnehmen.

    *Ablauf:*
    - Ein Spieler wirft absichtlich niedrige Bälle zur 1B — Short-Hops, die vor der Base aufkommen.
    - Die 1B steht in Stretch-Position und versucht den Ball sauber zu scoopen.
    - Würfe kommen von links, rechts und frontal.

    *Wichtig:* Handschuh flach am Boden, Finger nach unten zeigen. Den Ball in den Handschuh "schaufeln", nicht von oben greifen. Knie beugen, tief gehen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Base
      rect((-0.2, 2.8), (0.2, 3.2), fill: white, stroke: 1pt + black)
      content((0, 2.3), text(size: 6pt, fill: rgb("#888"))[1st])
      // 1B
      circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Werfer
      circle((0, 6.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 6.5), text(size: 7pt, weight: "bold", fill: white)[S])
      // Short-Hop Würfe (niedrig, verschiedene Richtungen)
      line((-0.2, 6.2), (-0.8, 4.0), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      line((0, 6.2), (0, 4.0), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      line((0.2, 6.2), (0.8, 4.0), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Label
      content((2.0, 5.0), text(size: 5pt, fill: rgb("#2d8a2d"))[Short-Hops])
    })
  ],
  rotation: [Werfer und 1B tauschen nach jedem Durchgang (z.B. 10 Würfe). Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "1B Bunt Defense",
  kategorien: ("1B", "Fielding", "Situational", "Bunt Defense"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für die Bunt Defense der 1B. Bei einem Bunt vor die 1B muss die 1B nach vorne laufen, den Ball aufnehmen und weiterwerfen.

    *Ablauf:*
    - Ein Spieler legt oder rollt einen Bunt vor die 1B.
    - Die 1B rennt nach vorne, nimmt den Ball auf.
    - Wirft zur 2B (wenn jemand 1st Base covered) oder zur anderen Base je nach Situation.
    - Ein Spieler (2B oder P) übernimmt die 1st Base.

    *Wichtig:* Schnell nach vorne laufen, Ball sauber aufnehmen, Füße stellen und sauberen Wurf machen. Nicht hetzen — lieber ein Out sicher nehmen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Bases
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      rect((3.8, 2.3), (4.2, 2.7), fill: white, stroke: 1pt + black)
      content((4.8, 2.5), text(size: 6pt, fill: rgb("#888"))[1st])
      // 1B Startposition
      content((4, 3.2), text(size: 11pt, fill: rgb("#aaa"))[×])
      // 1B läuft zum Bunt
      circle((2.5, 1.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2.5, 1.5), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Laufweg 1B nach vorne
      line((3.7, 3.0), (2.7, 1.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Bunt (Ball liegt vor 1B)
      circle((2.5, 1.0), radius: 0.12, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      content((2.5, 0.5), text(size: 5pt, fill: rgb("#888"))[Bunt])
      // 2B/P covered 1st Base
      circle((4, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((4, 3.5), text(size: 6pt, weight: "bold", fill: white)[2B])
      // Laufweg 2B zur Base
      line((3.5, 4.5), (4, 3.9), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.8, 4.5), text(size: 5pt, fill: rgb("#888"))[covered])
      // Spieler (rollt Bunt)
      circle((0, 1.2), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[S])
      // Bunt-Roll
      line((0.3, 1.0), (2.2, 1.0), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Wurf: 1B → 2B an der Base
      line((2.8, 1.7), (3.8, 3.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [1B → 2B (Cover) → Spieler → 1B. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "1B 3-1 Putout",
  kategorien: ("1B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Übung für den 3-1 Putout: Die 1B fieldet einen Grounder und läuft selbst zur Base für das Out.

    *Ablauf:*
    - Ein Spieler rollt oder schlägt einen Grounder Richtung 1B.
    - Die 1B fieldet den Ball.
    - Die 1B läuft mit dem Ball selbst zur 1st Base und tritt drauf.

    *Wichtig:* Ball sauber aufnehmen, dann zur Base laufen. Nicht gleichzeitig versuchen — erst fielding, dann Base. Bei weitem Ball entscheiden: Selber laufen oder doch zum Pitcher werfen der die Base covered?
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Base
      rect((3.8, 2.3), (4.2, 2.7), fill: white, stroke: 1pt + black)
      content((4.8, 2.5), text(size: 6pt, fill: rgb("#888"))[1st])
      // 1B Startposition
      content((4, 3.2), text(size: 11pt, fill: rgb("#aaa"))[×])
      // 1B fieldet
      circle((2.5, 2.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2.5, 2.0), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Spieler
      circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])
      // Grounder
      line((0.3, 1.2), (2.2, 1.8), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Laufweg 1B: fielding → Base
      line((2.8, 2.2), (3.8, 2.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
    })
  ],
  rotation: [1B und Spieler tauschen nach jedem Durchgang (z.B. 5 Bälle). Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "1B 3-6-3 Double Play",
  kategorien: ("1B", "SS", "Fielding", "Double Play"),
  spieler: 3,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für den 3-6-3 Double Play: 1B fieldet, wirft zur 2nd Base (SS oder 2B), bekommt den Ball zurück an der 1st Base.

    *Ablauf:*
    - Ein Spieler rollt einen Grounder zur 1B.
    - Die 1B fieldet den Ball und wirft sofort zur 2nd Base.
    - Der Infielder (SS oder 2B) fängt an der 2nd Base und wirft zurück zur 1st Base.
    - Die 1B muss nach dem Wurf zurück zur Base laufen und den Rückwurf fangen.

    *Wichtig:* Nach dem Wurf zur 2nd sofort zurück zur Base! Der Rückwurf muss schnell und sauber kommen. Die 1B muss mit dem Fuß auf der Base stehen wenn sie den Ball fängt.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Bases
      rect((3.8, 0.3), (4.2, 0.7), fill: white, stroke: 1pt + black)
      content((4.8, 0.5), text(size: 6pt, fill: rgb("#888"))[1st])
      rect((0.8, 3.3), (1.2, 3.7), fill: white, stroke: 1pt + black)
      content((0.4, 3.9), text(size: 6pt, fill: rgb("#888"))[2nd])
      // 1B Startposition
      content((4, 1.4), text(size: 11pt, fill: rgb("#aaa"))[×])
      // 1B fieldet (etwas weg von Base)
      circle((3, 0.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3, 0.5), text(size: 7pt, weight: "bold", fill: white)[1B])
      // SS an 2nd Base
      circle((1, 3), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((1, 3), text(size: 7pt, weight: "bold", fill: white)[SS])
      // Spieler
      circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
      // Grounder: S → 1B
      line((0.4, 0.5), (2.6, 0.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Wurf 1: 1B → SS (2nd Base)
      line((2.8, 0.8), (1.2, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Wurf 2: SS → 1B (zurück)
      line((1.3, 2.8), (3.8, 1.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Laufweg 1B zurück zur Base
      bezier((3.2, 0.8), (4, 1.2), (3.8, 0.8), (4.2, 1.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((4.8, 1.5), text(size: 5pt, fill: rgb("#1a1a5e"))[zurück])
    })
  ],
  rotation: [1B → SS → Spieler → 1B. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
  varianten: [3-6-1: Der Pitcher covered die 1st Base statt die 1B zurückzulaufen. Braucht einen 4. Spieler.],
)

#drill(
  name: "1B Bad Throws",
  kategorien: ("1B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle", "Base"),
  beschreibung: [
    Übung für das Handling von schlechten Würfen an der 1st Base — zu hoch, zu weit links/rechts oder Overthrows.

    *Ablauf:*
    - Ein Spieler wirft absichtlich schlechte Würfe zur 1B: zu hoch, seitlich daneben, zu kurz, Overthrows.
    - Die 1B muss entscheiden: Stretch und fangen, oder Base verlassen und den Ball sichern?

    *Regel:* Den Ball sichern ist wichtiger als auf der Base zu bleiben! Lieber die Base verlassen und den Ball fangen, als den Ball durchlassen und Runner weiter vorrücken.

    *Wichtig:*
    - Bei Würfen die erreichbar sind: Stretch, Fuß bleibt auf der Base.
    - Bei Würfen die zu weit weg sind: Base verlassen, Ball sichern, Runner ist safe aber kommt nicht weiter.
    - Bei Overthrows: Sofort umdrehen und dem Ball nachlaufen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Base
      rect((-0.2, 2.8), (0.2, 3.2), fill: white, stroke: 1pt + black)
      content((0, 2.3), text(size: 6pt, fill: rgb("#888"))[1st])
      // 1B
      circle((0, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.5), text(size: 7pt, weight: "bold", fill: white)[1B])
      // Werfer
      circle((0, 6.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 6.5), text(size: 7pt, weight: "bold", fill: white)[S])
      // Guter Wurf (mittig)
      line((0, 6.1), (0, 3.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Schlechter Wurf links
      line((-0.2, 6.2), (-2.0, 3.8), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      // Schlechter Wurf rechts
      line((0.2, 6.2), (2.0, 3.8), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      // Overthrow hoch
      line((0.1, 6.2), (0.3, 2.0), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      // Labels
      content((-2.8, 3.8), text(size: 5pt, fill: rgb("#888"))[zu weit\ links])
      content((2.8, 3.8), text(size: 5pt, fill: rgb("#888"))[zu weit\ rechts])
      content((1.2, 2.0), text(size: 5pt, fill: rgb("#888"))[Overthrow])
    })
  ],
  rotation: [Werfer und 1B tauschen nach jedem Durchgang. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "1B Receiving von allen Positionen",
  kategorien: ("1B", "Fielding"),
  spieler: 5,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Die 1B übt das Fangen von Würfen aus allen Infield-Positionen mit dem richtigen Footwork und Stretch.

    *Ablauf:*
    - Spieler stehen auf den Infield-Positionen (3B, SS, 2B, P).
    - Jeder wirft nacheinander zur 1B.
    - Die 1B übt den richtigen Stretch je nach Wurfrichtung (siehe Footwork & Stretch Drill).
    - Jeder Werfer macht mehrere Würfe bevor rotiert wird.

    *Fokus:* Richtiges Footwork bei Spieltempo. Jede Position hat einen anderen Wurfwinkel — die 1B muss sich jedes Mal anpassen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Bases (Diamond-Layout)
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      rect((3.8, 2.3), (4.2, 2.7), fill: white, stroke: 1pt + black)
      content((4.8, 2.5), text(size: 6pt, fill: rgb("#888"))[1st])
      rect((0.8, 4.3), (1.2, 4.7), fill: white, stroke: 1pt + black)
      content((0.4, 4.9), text(size: 6pt, fill: rgb("#888"))[2nd])
      rect((-3.2, 2.3), (-2.8, 2.7), fill: white, stroke: 1pt + black)
      content((-3.8, 2.5), text(size: 6pt, fill: rgb("#888"))[3rd])
      // 1B
      circle((4, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((4, 3.0), text(size: 7pt, weight: "bold", fill: white)[1B])
      // 3B
      circle((-3, 3.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((-3, 3.0), text(size: 7pt, weight: "bold", fill: white)[3B])
      // SS
      circle((-1, 4.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((-1, 4.0), text(size: 7pt, weight: "bold", fill: white)[SS])
      // 2B
      circle((2, 4.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((2, 4.0), text(size: 7pt, weight: "bold", fill: white)[2B])
      // P
      circle((0, 2.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 2.5), text(size: 7pt, weight: "bold", fill: white)[P])
      // Würfe von allen Positionen zur 1B
      line((-2.6, 3.0), (3.6, 3.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((-0.7, 3.8), (3.6, 3.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((2.3, 3.8), (3.7, 3.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((0.3, 2.6), (3.6, 3.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Nach einer Runde (jeder Werfer hat geworfen) wechselt die 1B. Alle Positionen rotieren durch.],
)

#drill(
  name: "1B Wurf nach Home & 3rd Base",
  kategorien: ("1B", "Fielding", "Situational"),
  spieler: 3,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Übung für Würfe der 1B nach Home und zur 3rd Base — typische Spielsituationen bei Runners auf den Bases.

    *Variante 1 — 1B → Home:*
    Die 1B fieldet einen Grounder oder bekommt einen Ball und wirft schnell nach Home. Situation: Runner auf 3rd Base kommt nach Hause.

    *Variante 2 — 1B → 3rd Base:*
    Die 1B fieldet einen Grounder und wirft zur 3rd Base. Situation: Runner auf 2nd Base versucht zur 3rd zu kommen.

    *Fokus:* Schnelles Umsetzen nach dem Fielding — Ball aufnehmen, Füße stellen, sauberer Wurf zum Ziel. Nicht hetzen, aber zügig.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Var. 1: 1B → Home*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Home
          rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
          content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
          // 1st Base
          rect((3.8, 2.3), (4.2, 2.7), fill: white, stroke: 1pt + black)
          content((4.8, 2.5), text(size: 6pt, fill: rgb("#888"))[1st])
          // 1B fieldet
          circle((3, 2.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.0), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Catcher
          circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
          // Spieler
          circle((1, 3.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((1, 3.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder
          line((1.2, 3.2), (2.8, 2.3), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Wurf: 1B → Home
          line((2.7, 1.8), (0.3, 1.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Var. 2: 1B → 3rd Base*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 3rd Base
          rect((-3.2, 2.3), (-2.8, 2.7), fill: white, stroke: 1pt + black)
          content((-3.8, 2.5), text(size: 6pt, fill: rgb("#888"))[3rd])
          // 1st Base
          rect((3.8, 2.3), (4.2, 2.7), fill: white, stroke: 1pt + black)
          content((4.8, 2.5), text(size: 6pt, fill: rgb("#888"))[1st])
          // 1B fieldet
          circle((3, 2.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((3, 2.0), text(size: 7pt, weight: "bold", fill: white)[1B])
          // 3B
          circle((-3, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 3.0), text(size: 7pt, weight: "bold", fill: white)[3B])
          // Spieler
          circle((1, 3.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((1, 3.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder
          line((1.2, 3.2), (2.8, 2.3), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Wurf: 1B → 3B
          line((2.7, 2.2), (-2.6, 2.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [1B → Catcher/3B → Spieler → 1B. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)
