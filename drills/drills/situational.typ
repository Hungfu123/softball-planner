// Situational Drills (Relay, Cutoff, Rundown, Bunt Defense, etc.)
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Situational

#drill(
  name: "Relay Einfach (zu dritt/viert)",
  kategorien: ("Situational", "Outfield", "Relay"),
  spieler: 3,
  equipment: ("Bälle",),
  beschreibung: [
    Vereinfachte Relay-Übung ohne vollen Diamond. 3–4 Spieler stehen in einer Linie mit Abstand.

    *Ablauf zu dritt:*
    - Spieler 1 (Outfielder) wirft zum Spieler 2 (Cutoff)
    - Spieler 2 fängt, dreht sich um und wirft zu Spieler 3 (Ziel/Home)
    - Zurück: Spieler 3 wirft zu 2, Spieler 2 wirft zu 1

    *Ablauf zu viert:*
    - Spieler 1 wirft zu 2, Spieler 2 wirft zu 3, Spieler 3 wirft zu 4
    - Zurück in umgekehrter Reihenfolge

    *Wichtig:* Der Cutoff-Man (Spieler 2) muss sich in der Linie zwischen Werfer und Ziel aufstellen. Arme hoch damit der Outfielder ihn sieht. Schnell fangen, umdrehen, werfen — keine Pause dazwischen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      circle((-3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3, 2.5), text(size: 7pt, weight: "bold", fill: white)[1])
      circle((0, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 2.5), text(size: 7pt, weight: "bold", fill: white)[2])
      circle((3, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3, 2.5), text(size: 7pt, weight: "bold", fill: white)[3])
      line((-2.6, 2.7), (-0.4, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      line((0.4, 2.7), (2.6, 2.7), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((-1.5, 3.2), text(size: 6pt, fill: rgb("#cc0000"))[Wurf])
      content((1.5, 3.2), text(size: 6pt, fill: rgb("#cc0000"))[Relay])
    })
  ],
  rotation: [Alle rotieren eine Position weiter nach jedem Durchgang. Jeder spielt jede Position.],
  varianten: [Zu viert: einen vierten Spieler ans Ende stellen. Distanz vergrößern für stärkere Würfe.],
)

#drill(
  name: "Infield Wurf nach Home (Runner auf 3rd)",
  kategorien: ("Situational", "Fielding", "1B", "SS", "3B"),
  spieler: 5,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Spielsituation: Runner auf 3rd Base, Grounder ins Infield → Wurf nach Home. Trainiert schnelles Fielding und den Wurf zum Catcher.

    *Ablauf:*
    - Ein Spieler rollt/schlägt Grounder zu verschiedenen Infield-Positionen (SS, 3B, 2B, 1B)
    - Der Infielder nimmt den Ball an und wirft sofort nach Home
    - Der Catcher fängt den Ball und macht den Tag (Runner kommt von 3rd)
    - Optional: Ein Spieler simuliert den Runner der von 3rd Base losläuft

    *Wichtig:* Der Infielder muss schnell entscheiden: Reicht die Zeit für den Wurf nach Home? Wenn der Runner zu schnell ist → lieber den sicheren Out an 1st Base nehmen. Schnelles Aufnehmen, Füße stellen, sauberer Wurf.

    Je nach Spieleranzahl müssen nicht alle Infield-Positionen besetzt sein. Bei weniger Spielern: 2–3 Positionen abwechselnd besetzen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Bases
      rect((-0.2, 0.3), (0.2, 0.7), fill: white, stroke: 1pt + black)
      content((0, -0.1), text(size: 6pt, fill: rgb("#888"))[Home])
      rect((-3.2, 2.3), (-2.8, 2.7), fill: white, stroke: 1pt + black)
      content((-3.8, 2.5), text(size: 6pt, fill: rgb("#888"))[3rd])
      // Catcher
      circle((0, 1.2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 1.2), text(size: 7pt, weight: "bold", fill: white)[C])
      // Infielder (SS)
      circle((-1, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-1, 3.5), text(size: 7pt, weight: "bold", fill: white)[SS])
      // Runner auf 3rd
      circle((-3, 3.0), radius: 0.35, fill: rgb("#cc0000"), stroke: 0.5pt + black)
      content((-3, 3.0), text(size: 7pt, weight: "bold", fill: white)[R])
      // Spieler rollt Grounder
      circle((1, 5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((1, 5), text(size: 7pt, weight: "bold", fill: white)[S])
      // Grounder
      line((0.8, 4.7), (-0.8, 3.8), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      // Wurf: SS → Home
      line((-0.8, 3.2), (0, 1.6), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // Runner läuft
      line((-2.8, 2.8), (-0.3, 0.8), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Infielder rotieren nach jedem Durchgang. Jeder spielt jede Position.],
)

#drill(
  name: "Infield Plays (aufgebautes Infield)",
  kategorien: ("Situational", "Fielding", "1B", "SS", "2B", "3B"),
  spieler: 6,
  equipment: ("Bälle", "Bases", "Schläger (optional)"),
  beschreibung: [
    Komplettes Infield aufbauen und verschiedene Spielsituationen durchspielen. Alle Infielder stehen auf ihren Positionen (1B, 2B, SS, 3B) plus Catcher und ein Spieler der Grounder rollt oder schlägt. Optional: Runner auf Bases.

    *Plays die durchgespielt werden:*
    - *Grounder → Wurf zur 1B:* Jede Position fieldet und wirft zur 1B. Die 1B macht den Stretch.
    - *Double Play:* Grounder zum SS oder 2B → Wurf zur 2nd Base → Weiter zur 1B.
    - *Wurf nach Home:* Grounder ins Infield, Runner auf 3rd Base läuft los → Infielder entscheidet: Home oder 1B?
    - *Bunt Defense:* Bunt vor Home → Catcher oder 3B/1B nimmt auf, wirft zur Base.
    - *Force Play an verschiedenen Bases:* Je nach Runner-Situation den Ball zur richtigen Base werfen.

    *Ohne Runner:* Spieler rufen die Situation an ("Runner auf 1st und 3rd!") und alle reagieren auf den Grounder als ob Runner da wären. Guter Einstieg.

    *Mit Runner:* 1–2 Spieler als Runner auf Bases. Runner laufen bei Kontakt los. Infield muss schnell entscheiden wohin der Ball geht. Realistischer aber braucht mehr Spieler.

    *Wichtig:* Jeder Infielder muss *vor* dem Grounder wissen was er macht: Wohin werfe ich bei Grounder zu mir? Wo ist der Lead-Runner? Trainer/Spieler ruft die Situation an bevor der Ball gerollt wird.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Diamond
      let home = (0, 0)
      let first = (3, 2)
      let second = (0, 4)
      let third = (-3, 2)
      line(home, first, stroke: 0.5pt + gray)
      line(first, second, stroke: 0.5pt + gray)
      line(second, third, stroke: 0.5pt + gray)
      line(third, home, stroke: 0.5pt + gray)
      for base in (home, first, second, third) {
        rect(
          (base.at(0) - 0.15, base.at(1) - 0.15),
          (base.at(0) + 0.15, base.at(1) + 0.15),
          fill: white, stroke: 0.5pt + black,
        )
      }
      // Positionen
      circle((0, 0.8), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 0.8), text(size: 6pt, weight: "bold", fill: white)[C])
      circle((3, 2.8), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3, 2.8), text(size: 6pt, weight: "bold", fill: white)[1B])
      circle((1.5, 4.2), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((1.5, 4.2), text(size: 6pt, weight: "bold", fill: white)[2B])
      circle((-1, 4.2), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-1, 4.2), text(size: 6pt, weight: "bold", fill: white)[SS])
      circle((-3, 2.8), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3, 2.8), text(size: 6pt, weight: "bold", fill: white)[3B])
      // Hitter/Roller
      circle((0, -1), radius: 0.3, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, -1), text(size: 6pt, weight: "bold", fill: white)[H])
      // Optional Runner
      circle((-2.5, 1.8), radius: 0.25, fill: rgb("#cc0000"), stroke: 0.5pt + black)
      content((-2.5, 1.8), text(size: 5pt, weight: "bold", fill: white)[R])
      content((-2.5, 1.2), text(size: 5pt, fill: rgb("#888"))[optional])
    })
  ],
  rotation: [Infielder rotieren nach jeder Runde (z.B. 5 Plays). Jeder spielt jede Position. Roller/Hitter wechselt ebenfalls.],
  varianten: [Ohne Runner starten, dann mit Runner steigern. Trainer ruft verschiedene Situationen an (0 Outs, 1 Out, Runner auf 1st, Runner auf 1st und 3rd, etc.).],
)

#drill(
  name: "Second/Short Double Play Übung",
  kategorien: ("SS", "2B", "Double Play", "Situational"),
  spieler: 4,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Toss- und Fieldingübung für den Double Play an der 2nd Base. Ein Spieler rollt den Ball zum SS oder zur 2B, die dann zur 2nd Base werfen/tossen.

    *Als 2B:*
    Mit dem linken Fuß außen an der Base stehen.
    - _Bei Toss:_ Zur SS-Seite hingehen. In dem Moment, wo man den Ball fängt, mit dem rechten Fuß nach vorne gehen. Wurf zur 1B.
    - _Bei Wurf:_ Stehen bleiben und nach hinten gehen. Wurf zur 1B.

    *Als SS:*
    Mit dem rechten Fuß an der Außenseite der Base stehen. In dem Moment, wo man den Ball fängt, mit dem linken Fuß nach vorne gehen und zur 1B werfen.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #align(center)[*Als 2B (Toss)*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 2nd Base oben mitte
          rect((0.8, 5.3), (1.2, 5.7), fill: white, stroke: 1pt + black)
          content((1, 6.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // 1st Base unter 2nd Base
          rect((0.8, 1.8), (1.2, 2.2), fill: white, stroke: 1pt + black)
          content((1.6, 2.0), text(size: 6pt, fill: rgb("#888"))[1st])
          // 2B bei 2nd Base
          circle((1, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1, 4.5), text(size: 7pt, weight: "bold", fill: white)[2B])
          // SS links, gleiche Höhe wie 2B (orthogonal)
          circle((-2, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-2, 4.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // 1B bei 1st Base
          circle((1, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1, 2.5), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Spieler unten
          circle((-1, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((-1, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // Grounder: Spieler → SS
          line((-1.2, 0.8), (-1.8, 4.1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Toss: SS → 2B (horizontal)
          line((-1.6, 4.5), (0.6, 4.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          // Laufweg 2B: nach unten
          line((1, 4.1), (1, 3.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: 2B → 1B (vertikal gerade nach unten)
          line((1, 3.2), (1, 2.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Als SS*]
        #canvas(length: 0.7cm, {
          import draw: *
          // 2nd Base oben mitte
          rect((0.8, 5.3), (1.2, 5.7), fill: white, stroke: 1pt + black)
          content((1, 6.1), text(size: 6pt, fill: rgb("#888"))[2nd])
          // 1st Base unter 2nd Base (gleiche x-Position)
          rect((0.8, 1.8), (1.2, 2.2), fill: white, stroke: 1pt + black)
          content((1.6, 2.0), text(size: 6pt, fill: rgb("#888"))[1st])
          // SS bei 2nd Base (rechte Seite, Richtung 3rd)
          circle((1, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1, 4.5), text(size: 7pt, weight: "bold", fill: white)[SS])
          // Spieler rechts (rollt Grounder)
          circle((3, 3.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((3, 3.5), text(size: 7pt, weight: "bold", fill: white)[S])
          // 1B bei 1st Base
          circle((1, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1, 2.5), text(size: 7pt, weight: "bold", fill: white)[1B])
          // Grounder: Spieler → SS
          line((2.7, 3.7), (1.3, 4.3), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
          // Laufweg SS: nach unten
          line((1, 4.1), (1, 3.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          // Wurf: SS → 1B (vertikal gerade nach unten)
          line((1, 3.2), (1, 2.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [SS und 2B tauschen Positionen nach jeder Runde. Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)

#drill(
  name: "Relay & Cutoff Übung",
  kategorien: ("Situational", "Outfield", "Relay"),
  spieler: 8,
  equipment: ("Bälle", "Bases", "Schläger (optional)"),
  beschreibung: [
    Relay-Situationen je nach Outfield-Position üben. Ball wird geschlagen oder ins Outfield geworfen. Der Cutoff-Man (SS oder 2B) positioniert sich in der Relay-Linie und leitet den Ball weiter zum Ziel (Home, 3rd oder 2nd Base).

    *Ball im LF:*
    SS ist Cutoff. Relay-Ziele: Home, 3rd Base oder 2nd Base.

    *Ball im CF:*
    SS oder 2B ist Cutoff (je nach Seite). Relay-Ziele: Home, 3rd Base oder 2nd Base.

    *Ball im RF:*
    2B ist Cutoff. Relay-Ziele: Home, 3rd Base oder 2nd Base.

    *Wichtig:*
    - Der *Catcher positioniert die Relay-Person* — er ruft Anweisungen wo sich der Cutoff-Man hinstellen soll.
    - Der Cutoff-Man stellt sich in einer geraden Linie zwischen Outfielder und Ziel-Base auf. Arme hoch damit der Outfielder ihn sieht.
    - Der Outfielder wirft *immer gerade Richtung Home* — der Cutoff-Man fängt den Ball ab, wenn der Catcher das Kommando gibt.
    - Die Position des Cutoff-Man hängt von der Wurfstärke des Outfielders ab — man muss wissen, wie weit der Werfer werfen kann und sich dementsprechend positionieren.
    - Catcher ruft wohin der Ball gehen soll und *wann der Cutoff-Man abfangen soll*.
  ],
  diagramm: [
    #let field-diagram(title, body) = {
      align(center)[*#title*]
      canvas(length: 0.55cm, {
        import draw: *
        // Diamond
        let home = (0, 0)
        let first = (3, 2)
        let second = (0, 4)
        let third = (-3, 2)
        line(home, first, stroke: 0.5pt + gray)
        line(first, second, stroke: 0.5pt + gray)
        line(second, third, stroke: 0.5pt + gray)
        line(third, home, stroke: 0.5pt + gray)
        for base in (home, first, second, third) {
          rect(
            (base.at(0) - 0.15, base.at(1) - 0.15),
            (base.at(0) + 0.15, base.at(1) + 0.15),
            fill: white, stroke: 0.5pt + black,
          )
        }
        content((0, -0.6), text(size: 5pt, fill: rgb("#888"))[H])
        content((3.6, 2), text(size: 5pt, fill: rgb("#888"))[1st])
        content((0, 4.6), text(size: 5pt, fill: rgb("#888"))[2nd])
        content((-3.6, 2), text(size: 5pt, fill: rgb("#888"))[3rd])
        body
      })
    }

    #grid(
      columns: (1fr, 1fr),
      gutter: 12pt,
      [
        #field-diagram("1. LF → SS → Home", {
          import draw: *
          circle((-4, 6.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-4, 6.5), text(size: 6pt, weight: "bold", fill: white)[LF])
          circle((-2, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-2, 3.5), text(size: 6pt, weight: "bold", fill: white)[SS])
          circle((0, 0.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 0.6), text(size: 6pt, weight: "bold", fill: white)[C])
          line((-3.7, 6.2), (-2.3, 3.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((-1.7, 3.3), (0, 0.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #field-diagram("2. LF → SS → 3rd", {
          import draw: *
          circle((-4, 6.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-4, 6.5), text(size: 6pt, weight: "bold", fill: white)[LF])
          circle((-2, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-2, 3.5), text(size: 6pt, weight: "bold", fill: white)[SS])
          circle((-3, 2.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 2.6), text(size: 6pt, weight: "bold", fill: white)[3B])
          line((-3.7, 6.2), (-2.3, 3.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((-2.2, 3.2), (-2.9, 2.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #field-diagram("3. CF → SS → Home", {
          import draw: *
          circle((0, 7.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 7.5), text(size: 6pt, weight: "bold", fill: white)[CF])
          circle((-1, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-1, 4.5), text(size: 6pt, weight: "bold", fill: white)[SS])
          circle((0, 0.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 0.6), text(size: 6pt, weight: "bold", fill: white)[C])
          line((0, 7.1), (-0.9, 4.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((-0.7, 4.2), (0, 0.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #field-diagram("4. CF → SS → 3rd", {
          import draw: *
          circle((0, 7.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 7.5), text(size: 6pt, weight: "bold", fill: white)[CF])
          circle((-1, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-1, 4.5), text(size: 6pt, weight: "bold", fill: white)[SS])
          circle((-3, 2.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 2.6), text(size: 6pt, weight: "bold", fill: white)[3B])
          line((0, 7.1), (-0.9, 4.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((-1.2, 4.2), (-2.8, 2.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #field-diagram("5. RF → 2B → Home", {
          import draw: *
          circle((4, 6.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((4, 6.5), text(size: 6pt, weight: "bold", fill: white)[RF])
          circle((2, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((2, 3.5), text(size: 6pt, weight: "bold", fill: white)[2B])
          circle((0, 0.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((0, 0.6), text(size: 6pt, weight: "bold", fill: white)[C])
          line((3.7, 6.2), (2.3, 3.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((1.7, 3.3), (0, 0.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #field-diagram("6. RF → 2B → 3rd", {
          import draw: *
          circle((4, 6.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((4, 6.5), text(size: 6pt, weight: "bold", fill: white)[RF])
          circle((2, 3.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((2, 3.5), text(size: 6pt, weight: "bold", fill: white)[2B])
          circle((-3, 2.6), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((-3, 2.6), text(size: 6pt, weight: "bold", fill: white)[3B])
          line((3.7, 6.2), (2.3, 3.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
          line((1.8, 3.2), (-2.7, 2.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Outfielder, Cutoff und Infielder rotieren nach jeder Runde. Optional bei mehr Spielern: jeder macht 2–3 Runden auf einer Position bevor gewechselt wird.],
)

#drill(
  name: "Rundown",
  kategorien: ("Situational", "Fielding", "Baserunning", "1B", "2B", "SS", "3B"),
  spieler: 5,
  equipment: ("Bälle", "Bases"),
  beschreibung: [
    Ein Runner steckt zwischen zwei Bases. Die Defense versucht den Runner zu taggen.

    *Ablauf:*
    - Mind. 2 Spieler pro Base stehen hintereinander.
    - Der Spieler mit dem Ball läuft auf den Runner zu und zwingt ihn zur Entscheidung.
    - Bevor der Runner ihn erreicht, wirft er zum Partner an der anderen Base.
    - Nach dem Wurf geht er sofort aus der Laufbahn raus (hinter die Base), damit der nächste Spieler übernehmen kann.
    - Der nächste Spieler fängt den Ball und läuft wieder auf den Runner zu.
    - Das geht so weiter bis der Runner getaggt wird oder safe ist.

    *Wichtig für die Defense:*
    - Immer auf den Runner zulaufen, nicht stehen bleiben und werfen.
    - Der *Fänger an der anderen Base sagt an, wann geworfen werden soll* — er sieht den Runner und den richtigen Moment.
    - Nach dem Wurf sofort aus dem Weg gehen.
    - So wenig Würfe wie möglich — Ziel ist es, den Runner schnell zu taggen.
    - Bei mehr Spielern: mehrere Spieler pro Base aufstellen.

    *Wichtig für den Runner:*
    - Aufmerksam bleiben! Wenn die Defense einen Fehler macht (schlechter Wurf, zu langsam, nicht aus dem Weg gegangen), sofort ausnutzen und safe werden.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Base links
      rect((-3.2, 2.3), (-2.8, 2.7), fill: white, stroke: 1pt + black)
      content((-3, 1.7), text(size: 6pt, fill: rgb("#888"))[Base A])
      // Base rechts
      rect((2.8, 2.3), (3.2, 2.7), fill: white, stroke: 1pt + black)
      content((3, 1.7), text(size: 6pt, fill: rgb("#888"))[Base B])

      // Spieler 1 an Base A (vorne)
      circle((-2.5, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-2.5, 2.5), text(size: 7pt, weight: "bold", fill: white)[1])
      // Spieler 2 an Base A (hinten)
      circle((-3.5, 2.5), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3.5, 2.5), text(size: 7pt, weight: "bold", fill: white)[2])

      // Spieler 3 an Base B (vorne)
      circle((2.5, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((2.5, 2.5), text(size: 7pt, weight: "bold", fill: white)[3])
      // Spieler 4 an Base B (hinten)
      circle((3.5, 2.5), radius: 0.3, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3.5, 2.5), text(size: 7pt, weight: "bold", fill: white)[4])

      // Runner mitte
      circle((0, 2.5), radius: 0.35, fill: rgb("#cc0000"), stroke: 0.5pt + black)
      content((0, 2.5), text(size: 7pt, weight: "bold", fill: white)[R])

      // Spieler 1 läuft auf Runner zu
      line((-2.1, 2.5), (-0.5, 2.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Runner läuft hin und her
      line((0.2, 2.9), (1.8, 2.9), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      line((-0.2, 2.1), (-1.8, 2.1), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))

      // Wurf: Spieler 1 → Spieler 3
      line((-0.5, 3.2), (2.2, 3.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((1, 3.7), text(size: 6pt, fill: rgb("#cc0000"))[Wurf])

      // Spieler 1 geht weg nach dem Wurf
      line((-0.8, 2.3), (-3.3, 2.0), stroke: (paint: rgb("#888"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#888")))
      content((-2, 1.3), text(size: 5pt, fill: rgb("#888"))[geht weg])
    })
  ],
  rotation: [Runner wechselt nach jedem Durchgang. Bei mehr Spielern: mehrere Spieler pro Base aufstellen, alle rotieren durch.],
)
