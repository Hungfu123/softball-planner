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
