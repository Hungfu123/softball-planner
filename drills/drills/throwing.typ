// Throwing Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Throwing

#drill(
  name: "Viereck-Drill (Toss & Wurf)",
  kategorien: ("Throwing",),
  spieler: 4,
  equipment: ("Bälle", "4 Hütchen"),
  beschreibung: [
    Vier Hütchen im Rechteck aufstellen. An jeder Ecke steht ein Spieler. Die kurzen Seiten werden getosst, die langen Seiten geworfen. Eine Toss-Seite wird mit Backhand-Toss ausgeführt. Nach jedem Toss/Wurf rennt man zur nächsten Position.

    *Ablauf:*
    - H1 wirft zu H2 (lange Seite) → rennt zu H2
    - H2 tosst Backhand zu H3 (kurze Seite) → rennt zu H3
    - H3 wirft zu H4 (lange Seite) → rennt zu H4
    - H4 tosst zu H1 (kurze Seite) → rennt zu H1

    *Wichtig beim Toss:* Ball aufnehmen aus der Fielding Position, dann ohne auszuholen direkt umdrehen und im Laufen den Ball zutossen. Hand zeigt am Ende nach oben, Handschuh geht nicht mit. Nicht ausholen.

    Andersrum auch machen (H1 → H4 → H3 → H2).
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Hütchen als Dreiecke — Rechteck (lange Seiten oben/unten, kurze links/rechts)
      // H1 oben links
      content((-4, 4.5), text(size: 8pt, fill: rgb("#888"))[▲])
      content((-4, 5.1), text(size: 7pt, weight: "bold")[H1])
      // H2 oben rechts
      content((4, 4.5), text(size: 8pt, fill: rgb("#888"))[▲])
      content((4, 5.1), text(size: 7pt, weight: "bold")[H2])
      // H3 unten rechts
      content((4, 1), text(size: 8pt, fill: rgb("#888"))[▲])
      content((4, 0.4), text(size: 7pt, weight: "bold")[H3])
      // H4 unten links
      content((-4, 1), text(size: 8pt, fill: rgb("#888"))[▲])
      content((-4, 0.4), text(size: 7pt, weight: "bold")[H4])

      // Spieler an den Hütchen
      circle((-3.5, 4.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3.5, 4.0), text(size: 7pt, weight: "bold", fill: white)[1])
      circle((3.5, 4.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3.5, 4.0), text(size: 7pt, weight: "bold", fill: white)[2])
      circle((3.5, 1.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3.5, 1.5), text(size: 7pt, weight: "bold", fill: white)[3])
      circle((-3.5, 1.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3.5, 1.5), text(size: 7pt, weight: "bold", fill: white)[4])

      // Wurf: H1 → H2 (lange Seite oben)
      line((-3.0, 4.2), (3.0, 4.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((0, 4.7), text(size: 6pt, fill: rgb("#cc0000"))[Wurf])

      // Backhand: H2 → H3 (kurze Seite rechts)
      line((3.7, 3.6), (3.7, 1.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((4.7, 2.75), text(size: 6pt, fill: rgb("#cc0000"))[Backhand])

      // Wurf: H3 → H4 (lange Seite unten)
      line((3.0, 1.3), (-3.0, 1.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((0, 0.7), text(size: 6pt, fill: rgb("#cc0000"))[Wurf])

      // Toss: H4 → H1 (kurze Seite links)
      line((-3.7, 1.9), (-3.7, 3.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((-4.5, 2.75), text(size: 6pt, fill: rgb("#cc0000"))[Toss])

      // Laufwege (gestrichelt, innen)
      line((-3.2, 3.9), (3.2, 4.1), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"))
      line((3.6, 3.6), (3.6, 1.9), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"))
      line((3.2, 1.6), (-3.2, 1.4), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"))
      line((-3.6, 1.9), (-3.6, 3.6), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"))
    })
  ],
  rotation: [Nach jeder Aktion rennt man zur nächsten Position. Alle durchlaufen alle Ecken. Optional bei mehr Spielern: mehrere Spieler pro Hütchen, jeder macht 2–3 Runden.],
  varianten: [Beide Toss-Seiten mit Backhand-Toss ausführen. Oder Toss und Backhand tauschen.],
)

#drill(
  name: "Backhand-Toss",
  kategorien: ("Throwing",),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Zu zweit gegenüber stehen. Ball aufnehmen — aus dem Handschuh heraus direkt tossen, ohne Ausholen. Ellbogen und Hand auf einer Höhe halten. Den Arm mit der Laufrichtung zur Base Richtung Fangperson ausstrecken. Der Ball soll die ganze Zeit nach außen zeigen und am Ende gerade zur Fangperson fliegen. Handschuh bleibt unten, nur die Wurfhand arbeitet.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Spieler 1 links
      circle((-2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2, 2.5), text(size: 7pt, weight: "bold", fill: white)[1])
      // Spieler 2 rechts
      circle((2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2, 2.5), text(size: 7pt, weight: "bold", fill: white)[2])
      // Backhand-Toss hin und her
      line((-1.6, 2.7), (1.6, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((1.6, 2.3), (-1.6, 2.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Abwechselnd tossen. Optional bei mehr Spielern: in einer Reihe aufstellen und rotieren.],
)

#drill(
  name: "Aufnehmen mit Sidewurf",
  kategorien: ("Throwing",),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Zu zweit *seitlich zueinander* stehen (nicht frontal), damit der Sidearm-Wurf möglich ist. Fielding Position einnehmen. Ball aufnehmen, Füße gestellt lassen und direkt von unten im Sidearm zur Fangperson werfen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Spieler 1 links
      circle((-2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2, 2.5), text(size: 7pt, weight: "bold", fill: white)[1])
      // Spieler 2 rechts
      circle((2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2, 2.5), text(size: 7pt, weight: "bold", fill: white)[2])
      // Sidewurf hin und her
      line((-1.6, 2.7), (1.6, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((1.6, 2.3), (-1.6, 2.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Abwechselnd werfen. Optional bei mehr Spielern: in einer Reihe aufstellen und rotieren.],
)

#drill(
  name: "Hocke-Wurf zum Partner",
  kategorien: ("Throwing",),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Zu zweit gegenüber stehen. Beide gehen in die Hocke (Fielding Position). Ball aufnehmen und *aus der Hocke heraus* zum Partner werfen — ohne aufzustehen. Fokus auf saubere Wurftechnik aus der tiefen Position.

    *Ablauf:*
    - In die Hocke gehen, Ball liegt vor einem
    - Ball aufnehmen, Füße bleiben am Boden
    - Aus der Hocke direkt zum Partner werfen
    - Partner fängt und wirft aus der Hocke zurück

    *Wichtig:* Nicht aufstehen beim Wurf! Der Wurf kommt aus dem Oberkörper und dem Arm. Die Beine bleiben in der Hocke. Trainiert die Wurfbewegung ohne Schwung aus den Beinen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      circle((-2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2, 2.5), text(size: 7pt, weight: "bold", fill: white)[1])
      circle((2, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2, 2.5), text(size: 7pt, weight: "bold", fill: white)[2])
      line((-1.6, 2.7), (1.6, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((1.6, 2.3), (-1.6, 2.3), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((0, 1.5), text(size: 6pt, fill: rgb("#888"))[beide in der Hocke])
    })
  ],
  rotation: [Abwechselnd werfen. Optional bei mehr Spielern: Paare bilden.],
)

#drill(
  name: "Grounder-Fielding Basics",
  kategorien: ("Throwing", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Grundübung für das Aufnehmen von Groundern. Ein Spieler rollt/wirft Grounder, der andere nimmt an und wirft zurück. Drei Varianten die nacheinander geübt werden:

    *Variante 1 — Frontal (Mitte):*
    Ball kommt direkt auf den Fielder zu. In Fielding Position gehen, Ball mittig vor dem Körper aufnehmen. Handschuh flach am Boden, andere Hand oben drüber zum Sichern. Aufstehen, Füße stellen, zurückwerfen.

    *Variante 2 — Forehand (Handschuhseite):*
    Ball kommt auf die Handschuhseite. Einen Schritt zur Seite machen, Ball mit dem Handschuh aufnehmen (Forehand). Nicht quer über den Körper greifen — Schritt zum Ball!

    *Variante 3 — Backhand (Wurfhandseite):*
    Ball kommt auf die Wurfhandseite. Crossover-Schritt machen, Ball mit dem Handschuh von der anderen Seite aufnehmen (Backhand). Den Handschuh von unten nach oben über den Ball führen.

    *Wichtig:* Bei jeder Variante: Tief in die Hocke, Hintern runter, Augen auf den Ball. Erst fielding, dann Füße stellen, dann werfen — nicht alles gleichzeitig.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Fielder
      circle((0, 2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 2), text(size: 7pt, weight: "bold", fill: white)[F])
      // Werfer
      circle((0, 5.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 5.5), text(size: 7pt, weight: "bold", fill: white)[W])
      // Grounder mittig
      line((0, 5.1), (0, 2.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Grounder forehand (links)
      line((-0.3, 5.1), (-1.5, 2.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((-2.2, 2.5), text(size: 5pt, fill: rgb("#888"))[Forehand])
      // Grounder backhand (rechts)
      line((0.3, 5.1), (1.5, 2.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((2.2, 2.5), text(size: 5pt, fill: rgb("#888"))[Backhand])
    })
  ],
  rotation: [Fielder und Werfer tauschen nach jedem Durchgang (z.B. 5 Grounder pro Variante). Optional bei mehr Spielern: Paare bilden.],
  varianten: [Werfer variiert Geschwindigkeit und Platzierung. Oder: Fielder weiß nicht welche Variante kommt (Überraschung).],
)
