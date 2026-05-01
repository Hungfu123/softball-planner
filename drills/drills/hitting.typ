// Hitting / Batting Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Hitting / Batting

#drill(
  name: "Hitting Stationen",
  kategorien: ("Hitting",),
  spieler: 10,
  equipment: ("Bälle", "Schläger", "Tees", "Netz (optional)", "Korken / Whiffleballs", "Besenstange (optional)"),
  beschreibung: [
    Stationen-Training für verschiedene Schlag-Situationen. Pro Station mind. 2 Spieler. Nach einer festgelegten Zeit (z.B. 5–10 Minuten) wird zur nächsten Station rotiert.

    *Station 1 — Live Hitting:*
    Ein Spieler tosst, einer schlägt. Weitere Spieler fangen die geschlagenen Bälle und werfen sie zurück. Jeder Batter bekommt eine festgelegte Anzahl Schläge, dann wird gewechselt.

    *Station 2 — Bunt:*
    Ein Spieler tosst, einer buntet. Fokus auf Bunttechnik und Ballplatzierung.

    *Station 3 — Tee:*
    Vom Tee schlagen. Mit Netz: ins Netz schlagen. Ohne Netz: Richtung Fielder schlagen, die den Ball fangen und zurückwerfen.

    *Station 4 — Korken / Whiffleballs:*
    Ein Spieler hält/wirft Korken oder Whiffleballs, der Batter schlägt drauf. Trainiert die Hand-Augen-Koordination. Whiffleballs eignen sich besonders gut zum Zielen auf bestimmte Zonen.

    *Station 5 — Tee 45 Grad:*
    Man steht ca. 45 Grad zur Base und schlägt vom Tee. Ziel ist es, das hintere Bein zu spüren und die Rotation zu üben.

    *Station 6 — Besenstange Hüftrotation:*
    Eine Besenstange hinter dem Rücken halten (in den Ellbogen eingehakt). Mit der Hüfte drehen und versuchen, den Ball am Tee mit der Stange zu berühren. Trainiert die Hüftrotation ohne Arme.

    _Je nach Anzahl der Spieler und verfügbarem Equipment können Stationen weggelassen oder hinzugefügt werden. Nicht alle Stationen müssen gleichzeitig laufen._
  ],
  rotation: [Nach festgelegter Zeit rotieren alle Spieler zur nächsten Station. Bei Live Hitting bleiben die Fielder und nur der Batter wechselt.],
)

#drill(
  name: "Loading vom Tee (Fortgeschritten)",
  kategorien: ("Hitting",),
  spieler: 2,
  equipment: ("Bälle", "Schläger", "Tee", "Netz"),
  beschreibung: [
    Fortgeschrittene Übung für das Timing des Loadings. Ein Spieler simuliert die Softball-Pitching-Motion (Windmill) ohne Ball. Der Batter schlägt vom Tee ins Netz und timet sein Loading nach der Pitcher-Bewegung.

    *Ablauf:*
    - Der "Pitcher" steht vor dem Batter (kann näher als normale Distanz sein) und macht die Windmill-Motion ohne Ball.
    - Der Batter schaut auf den Pitcher und beginnt sein *Loading*, wenn die Hände sich trennen und der Arm anfängt sich zu bewegen.
    - Während der Arm durch den Kreis geht: Gewicht nach hinten verlagern, Hände laden, Stride-Fuß geht vor.
    - Am Release-Punkt (Arm kommt unten an): Batter ist fertig geladen, Blick geht auf den Ball am Tee, Swing.

    *Wichtig:* Loading und Swing sind zwei getrennte Bewegungen — nicht alles auf einmal. Erst laden, dann schlagen. Wer zu spät mit dem Loading anfängt, muss alles gleichzeitig machen und verliert Kraft und Timing.

    _Diese Übung setzt voraus, dass der Batter bereits eine grundlegende Schlagform hat._
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Netz oben
      rect((-2, 6.5), (2, 7), fill: rgb("#dddddd"), stroke: 0.5pt + rgb("#888"))
      content((0, 7.4), text(size: 6pt, fill: rgb("#888"))[Netz])

      // Tee
      line((0, 5.2), (0, 5.8), stroke: 1.5pt + rgb("#888"))
      circle((0, 5.8), radius: 0.12, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)

      // Batter
      circle((0.8, 5.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0.8, 5.2), text(size: 7pt, weight: "bold", fill: white)[B])

      // Swing-Pfeil: Batter → Tee → Netz
      bezier((1.1, 5.4), (0, 6.3), (0.8, 5.8), (0.2, 6.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))

      // "Pitcher" (simuliert Motion)
      circle((0, 3), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 3), text(size: 7pt, weight: "bold", fill: white)[P])

      // Windmill-Symbol (Kreisbogen beim Pitcher)
      arc((0, 3), start: 60deg, stop: 300deg, radius: 0.7, stroke: (paint: rgb("#aaaaaa"), thickness: 0.8pt, dash: "dashed"), mark: (end: ">", fill: rgb("#aaaaaa")))

      // Timing-Hinweise
      content((-2.5, 3), text(size: 5pt, fill: rgb("#888"))[Motion])
      content((-2.5, 4.2), text(size: 5pt, fill: rgb("#1a1a5e"))[→ Loading])
      content((-2.5, 5.2), text(size: 5pt, fill: rgb("#cc0000"))[→ Swing])
    })
  ],
  rotation: [Batter und Pitcher tauschen nach einer festgelegten Anzahl Schläge (z.B. 10). Optional bei mehr Spielern: in einer Reihe aufstellen und rotieren.],
)

#drill(
  name: "Knie-Drill — Drive durch die Hütchen-Gasse",
  kategorien: ("Hitting",),
  spieler: 2,
  equipment: ("Bälle", "Schläger", "Tee", "Hütchen"),
  beschreibung: [
    Isolation der Oberkörper-Rotation. Das vordere Bein wird ausgeschaltet, sodass der Batter den Drive komplett aus Schulterdrehung und Handweg generieren muss. Der Ball muss gerade durch eine Hütchen-Gasse fliegen — das gibt direktes Feedback zur Schlagrichtung und Linie.

    *Aufbau:*
    Zwei parallele Hütchen-Linien bilden eine Gasse vor dem Batter. Der Ball liegt auf einem Tee am Anfang der Gasse.

    *Position:*
    Der Batter geht auf das vordere Knie runter (vorderes Bein abgelegt, hinteres Bein in Hocke). Schultern bleiben hinten, geschlossen.

    *Ablauf:*
    - Mit der vorderen Schulter zurückdrehen — Hände bleiben hinten, hinteres Bein bleibt geladen.
    - Aus der Drehung heraus den Move machen: Schulter-Rotation öffnet, Hände gehen Richtung Ball.
    - Im Kontaktpunkt den Ball "drücken" — kein wilder Schwung, sondern ein gerader Drive durch den Ball.
    - Der Ball muss gerade durch die Hütchen-Gasse fliegen. Geht der Ball nach links oder rechts: Schulter zu früh geöffnet oder Hände zu weit ausgewichen.

    *Fokus:*
    - Kein Schritt nach vorne (vorderes Bein ist auf dem Knie fixiert).
    - Hinten bleiben — kein Gewicht zu früh nach vorne.
    - Hände führen den Schläger gerade durch die Zone.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Hütchen-Linie oben (y = 0.8), 5 Hütchen
      circle((1.5, 0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((3.0, 0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((4.5, 0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((6.0, 0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((7.5, 0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      // Hütchen-Linie unten (y = -0.8)
      circle((1.5, -0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((3.0, -0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((4.5, -0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((6.0, -0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      circle((7.5, -0.8), radius: 0.15, fill: rgb("#ff8c00"), stroke: 0.5pt + black)
      // Gasse-Beschriftung
      content((4.5, 1.4), text(size: 6pt, fill: rgb("#888"))[Hütchen-Gasse])
      // Tee am Anfang der Gasse
      circle((0.7, 0), radius: 0.18, fill: none, stroke: 1pt + rgb("#888"))
      circle((0.7, 0), radius: 0.12, fill: rgb("#2d8a2d"), stroke: 0.5pt + black)
      content((0.7, -1.5), text(size: 6pt, fill: rgb("#888"))[Tee + Ball])
      // Batter (kniend) — kleines Quadrat statt Kreis um knien anzudeuten
      rect((-0.5, -0.6), (0.2, 0.2), fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-0.15, -0.2), text(size: 7pt, weight: "bold", fill: white)[B])
      content((-0.15, 0.7), text(size: 5pt, fill: rgb("#888"))[Knie])
      // Schulter-Drehung (Pfeil) hinter Batter
      arc((-1.0, -0.2), start: 300deg, stop: 60deg, radius: 0.5, stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((-1.7, -0.2), text(size: 5pt, fill: rgb("#1a1a5e"))[Drehung])
      // Ballflug: gerade durch die Gasse
      line((1.0, 0), (8.2, 0), stroke: 1.2pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((8.5, -0.5), text(size: 6pt, fill: rgb("#cc0000"))[Drive])
    })
  ],
  rotation: [Batter macht 8–10 Schläge, dann tauschen Batter und Tosser/Helfer. Wer den Ball nicht durch die Gasse bringt, korrigiert die Schulter- bzw. Handführung.],
  varianten: [Gasse enger setzen für mehr Präzision. Statt Tee live tossen lassen (Front-Toss aus geringer Distanz). Auch im Stand machbar — aber Knie-Variante isoliert die Rotation am stärksten.],
)

#drill(
  name: "Rear-Toss in die Strikezone (Tempo-anpassend)",
  kategorien: ("Hitting",),
  spieler: 2,
  equipment: ("Bälle", "Schläger", "Netz"),
  beschreibung: [
    Reaktions- und Timing-Drill mit Front-Netz. Der Tosser steht hinter dem Batter (außerhalb des Schwung-Radius!) und wirft den Ball nach vorne in die Strikezone des Batters. Der Batter schlägt den Ball ins Netz vor sich.

    *Aufbau:*
    - Netz vor dem Batter (in Schlag-Richtung).
    - Batter in normaler Schlag-Position vor dem Netz.
    - Tosser hinter dem Batter, leicht versetzt (aus dem Sichtfeld und Schlag-Radius raus). Sicherheit: Tosser darf nicht in den Schwung-Bereich des Schlägers!

    *Ablauf:*
    - Tosser wirft den Ball über die Schulter des Batters nach vorne in die Strikezone.
    - Batter sieht den Ball erst spät (kurze Reaktionszeit) und versucht ihn ins Netz zu schlagen.

    *Tempo-Prinzip:*
    Der Tosser passt das Tempo an den Batter an. Schlüssel des Drills: das Tempo ist genau so hoch, dass der Batter es gerade noch schafft. Das trainiert Reaktion und Timing am Limit, ohne zu frustrieren.

    - Batter trifft sicher → Tempo leicht erhöhen.
    - Batter trifft nicht mehr → Tempo zurücknehmen.
    - Niemals so schnell, dass der Batter komplett aussteigt — das bringt nichts.

    *Sicherheit:* Tosser muss klar hinter und seitlich versetzt zum Batter stehen. Nie direkt hinter dem Schlägerweg!
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Netz vorne (rechts)
      rect((6.5, -1.5), (7, 1.8), fill: rgb("#dddddd"), stroke: 0.5pt + rgb("#888"))
      content((6.75, 2.2), text(size: 6pt, fill: rgb("#888"))[Netz])
      // Strikezone (vor dem Batter, gestrichelter Kasten)
      rect((3.5, -0.4), (4.3, 0.7), fill: none, stroke: (paint: rgb("#888"), thickness: 0.6pt, dash: "dashed"))
      content((3.9, 1.0), text(size: 5pt, fill: rgb("#888"))[Strikezone])
      // Batter
      circle((3.5, -0.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3.5, -0.5), text(size: 7pt, weight: "bold", fill: white)[B])
      // Schläger (am Batter)
      line((3.7, -0.3), (4.6, 0.6), stroke: 1.5pt + rgb("#444"))
      // Tosser hinter Batter, seitlich versetzt
      circle((1.5, -1.2), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((1.5, -1.2), text(size: 7pt, weight: "bold", fill: white)[T])
      content((1.5, -1.9), text(size: 5pt, fill: rgb("#888"))[hinter Batter])
      // Wurf: Tosser → Strikezone (Bogen über Schulter)
      bezier((1.8, -1.0), (3.9, 0.2), (2.5, 0.8), (3.3, 1.0), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((2.3, 1.2), text(size: 5pt, fill: rgb("#2d8a2d"))[Wurf])
      // Schlag: Strikezone → Netz
      line((4.4, 0.3), (6.4, 0.3), stroke: 1.2pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((5.4, 0.7), text(size: 5pt, fill: rgb("#cc0000"))[Drive])
      // Sicherheits-Hinweis
      content((1.5, -2.5), text(size: 5pt, style: "italic", fill: rgb("#cc0000"))[außerhalb Schwung-Radius])
    })
  ],
  rotation: [Batter macht eine festgelegte Anzahl Schläge (z.B. 15–20), dann tauschen Batter und Tosser. Bei mehreren Spielern: Reihe bilden und nach Runden rotieren.],
  varianten: [Statt Bälle auch Whiffleballs verwenden (sicherer, langsamer, gut für Anfänger). Tosser kann auch leicht seitlich vor dem Batter werfen, wenn das hintere Werfen unsicher ist — Hauptsache, die Tempo-Anpassung bleibt das Kernprinzip.],
)
