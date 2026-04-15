// Baserunning Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Baserunning

#drill(
  name: "Lead nehmen",
  kategorien: ("Baserunning",),
  spieler: 2,
  equipment: ("Hütchen",),
  beschreibung: [
    Jeder Spieler stellt sich an ein Hütchen (= Base). Einer ruft die Kommandos (kann gleichzeitig mitmachen).

    *Ablauf:*
    - Linker Fuß nach vorne, dann 1, 2 Schritte Lead nehmen. Nur so viel Lead nehmen, dass man zurück kommen kann!
    - Bei *"Go"*: Durchsprinten zur nächsten Base.
    - Bei *"Back"*: Head-first zurück zum Hütchen — tief nach unten gleiten mit Oberschenkel und Brust, Arme weit nach vorne. Nicht auf die Knie fallen lassen, sondern tief nach unten und nach vorne gleiten.

    _Wer kein Head-first Slide machen will, kann auch ohne Slide schnell zurück._
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Hütchen (Base)
      content((0, 1), text(size: 10pt, fill: rgb("#888"))[▲])
      content((0, 0.3), text(size: 7pt, weight: "bold")[Hütchen])

      // Spieler am Hütchen
      circle((0, 1.8), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.8), text(size: 7pt, weight: "bold", fill: white)[S])

      // Lead-Position
      circle((0, 3.5), radius: 0.25, fill: rgb("#aaa"), stroke: 0.5pt + black)
      content((0.8, 3.5), text(size: 6pt, fill: rgb("#888"))[Lead])

      // Laufweg: Spieler → Lead
      line((0, 2.2), (0, 3.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // "Go": weitersprinten
      line((0, 3.8), (0, 5.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((1.2, 4.7), text(size: 7pt, weight: "bold", fill: rgb("#2d8a2d"))["Go"])

      // "Back": zurück zum Hütchen
      line((0.3, 3.3), (0.3, 2.0), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      content((1.5, 2.6), text(size: 7pt, weight: "bold", fill: rgb("#cc0000"))["Back"])
    })
  ],
  rotation: [Alle machen gleichzeitig mit. Der Rufer ruft "Go" oder "Back" und macht selbst mit. Mehrere Runden.],
)

#drill(
  name: "Base-Coach Signale",
  kategorien: ("Baserunning",),
  spieler: 2,
  equipment: ("Bases oder Hütchen",),
  beschreibung: [
    Übung um die Base-Coach Signale zu lernen und als Runner darauf zu reagieren. Der Runner läuft von Home Richtung 1st Base und schaut auf den Base-Coach.

    *Signale des Base-Coach:*

    + *Single (Stopp):* Beide Hände hoch strecken. → Runner bleibt auf 1st Base stehen.

    + *Weiter zur 2nd (Lead):* Rechter Arm zeigt auf 2nd Base, linker Arm über Kopf zeigt ebenfalls Richtung 2nd. → Runner macht einen Lead von 1st Base Richtung 2nd.

    + *Durchlaufen:* Arm dreht im Kreis durch (Kreisbewegung). → Runner läuft direkt durch zur 2nd Base.

    *Wichtig:* Bei Lead und Durchlaufen macht der Base-Coach die Kreisbewegungen mit dem Arm. Der Runner muss während des Laufens auf den Coach schauen und sofort reagieren.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Home unten
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])

      // 1st Base mitte rechts
      rect((3.8, 2.8), (4.2, 3.2), fill: white, stroke: 1pt + black)
      content((4.6, 3.0), text(size: 6pt, fill: rgb("#888"))[1st])

      // 2nd Base oben
      rect((3.8, 5.3), (4.2, 5.7), fill: white, stroke: 1pt + black)
      content((4.6, 5.5), text(size: 6pt, fill: rgb("#888"))[2nd])

      // Runner bei Home
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[R])

      // Base-Coach rechts neben 1st Base
      circle((5.5, 3.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((5.5, 3.0), text(size: 6pt, weight: "bold", fill: white)[BC])

      // Laufweg: Home → 1st Base
      line((0.3, 1.4), (3.5, 2.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Signal 1: Stopp (bleib auf 1st)
      content((5.5, 2.2), text(size: 5pt, fill: rgb("#cc0000"))[Stopp: ✋✋])

      // Signal 2: Lead zur 2nd
      line((4.2, 3.4), (4.2, 4.2), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((5.2, 3.8), text(size: 5pt, fill: rgb("#2d8a2d"))[Lead])

      // Signal 3: Durchlaufen zur 2nd
      line((4, 3.5), (4, 5.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((5.2, 4.5), text(size: 5pt, fill: rgb("#1a1a5e"))[Durch])
    })
  ],
  rotation: [Runner → Base-Coach → Runner. Optional bei mehr Spielern: mehrere Runner nacheinander, jeder macht 2–3 Runden.],
)

#drill(
  name: "Steal von 1st auf 2nd",
  kategorien: ("Baserunning", "Catcher", "Pitcher", "Situational"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Spielsituation üben: Steal von 1st Base auf 2nd Base.

    *Ablauf:*
    - Der Runner steht auf 1st Base und nimmt einen Lead.
    - Der Pitcher geht in die Motion und wirft zum Catcher.
    - Bei der Motion startet der Runner und versucht die 2nd Base zu stealen.
    - Der Catcher fängt den Ball und macht ein Coming zur 2nd Base, um den Runner zu taggen.
    - An der 2nd Base steht ein Infielder (SS oder 2B) der den Tag macht.

    Mehrere Runner hintereinander laufen lassen, damit jeder mehrere Versuche bekommt.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Home unten
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      // 1st Base rechts
      rect((3.8, 2.8), (4.2, 3.2), fill: white, stroke: 1pt + black)
      content((4.6, 3.0), text(size: 6pt, fill: rgb("#888"))[1st])
      // 2nd Base oben
      rect((-0.2, 5.3), (0.2, 5.7), fill: white, stroke: 1pt + black)
      content((0, 6.1), text(size: 6pt, fill: rgb("#888"))[2nd])

      // Pitcher mitte
      circle((0, 3.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3.0), text(size: 7pt, weight: "bold", fill: white)[P])
      // Catcher bei Home
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
      // Runner bei 1st Base
      circle((3.5, 3.5), radius: 0.35, fill: rgb("#cc0000"), stroke: 0.5pt + black)
      content((3.5, 3.5), text(size: 7pt, weight: "bold", fill: white)[R])
      // Infielder bei 2nd Base (SS/2B)
      circle((0.5, 5.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0.5, 5.0), text(size: 6pt, weight: "bold", fill: white)[SS])

      // Pitch: Pitcher → Catcher
      line((0, 2.6), (0, 1.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Steal: Runner → 2nd Base
      line((3.3, 3.7), (0.7, 5.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.5, 4.8), text(size: 5pt, fill: rgb("#1a1a5e"))[Steal])
      // Coming: Catcher → 2nd Base
      line((0.2, 1.5), (0.4, 4.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((-0.8, 3.2), text(size: 5pt, fill: rgb("#cc0000"))[Coming])
    })
  ],
  rotation: [Mehrere Runner stellen sich an der 1st Base an. Nach jedem Steal geht der Runner ans Ende der Reihe. Pitcher, Catcher und Infielder rotieren nach einer festgelegten Anzahl Runden.],
)
