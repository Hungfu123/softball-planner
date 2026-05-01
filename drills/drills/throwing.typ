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
  kategorien: ("Throwing", "Partner-Routine"),
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
  kategorien: ("Throwing", "Partner-Routine"),
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
  kategorien: ("Throwing", "Partner-Routine"),
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
  kategorien: ("Throwing", "Fielding", "Partner-Routine"),
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

#drill(
  name: "Partner-Wurf Footwork (3 Phasen — Aufbau für 2B-Drills)",
  kategorien: ("Throwing", "2B", "Partner-Routine"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Grundübung mit Partner — direkt nach dem Aufwärmen. Drei aufsteigende Phasen, die den Footwork für die 2B-Drills generell vorbereiten (Pivot, Toss, Wurf zur 1B, Empfangen an der Base — alles baut auf diesen Grundbewegungen auf). Beschreibung gilt für Rechtswerfer (Linkswerfer spiegelverkehrt).

    *Startposition (alle Phasen gleich):*
    Handschuh mit Ball unten, vor dem Körper, in Fielding-/Bereitschafts-Position. Beine schulterbreit, parallel.

    *Phase 1 — Nur Oberkörper:*
    Beine bleiben stehen. Oberkörper dreht nach rechts. Aus dieser Drehung heraus den Ball zum Partner werfen. Fokus: Kraft kommt aus Rumpf-Rotation, nicht aus den Beinen.

    *Phase 2 — Rechter Fuß pivot 90°:*
    Wieder Startposition. Diesmal dreht der rechte Fuß 90 Grad nach rechts (auf dem Ballen pivotieren), Oberkörper folgt — komplette 90-Grad-Drehung. Aus dieser Position zum Partner werfen. Fokus: stabiler Stand auf dem gedrehten Bein, Hüfte und Schulter mitnehmen.

    *Phase 3 — 2 Steps (volle Footwork für 2B-Plays):*
    Wieder Startposition mit Handschuh unten. Jetzt die volle Footwork:
    1. Rechter Fuß geht nach hinten weg.
    2. Linker Fuß geht Richtung Partner (= Wurfziel, im Spiel z.B. Richtung SS oder 1B).
    3. Aus dieser Position kraftvoll zum Partner werfen.

    Dieser Move ist die Grundlage für alle 2B-Plays — Pivot an der 2nd Base, Wurf zur 1B nach Fielding, Toss zum SS, Empfangen und Weiterwerfen.

    *Wichtig (alle Phasen):* Ball aus dem Handschuh aufnehmen wie aus einer echten Spielsituation. Nicht aus der Hand werfen — immer mit Handschuh-Ball-Kombi starten.
  ],
  diagramm: [
    #grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 8pt,
      [
        #align(center)[*Phase 1: Nur Oberkörper*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Partner links
          circle((-2.5, 1.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((-2.5, 1.0), text(size: 7pt, weight: "bold", fill: white)[P])
          // Werfer rechts
          circle((1.5, 1.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1.5, 1.0), text(size: 7pt, weight: "bold", fill: white)[W])
          // Beine (parallel, unten) — zwei kleine Rechtecke
          rect((1.15, 0.2), (1.40, 0.55), fill: rgb("#444"), stroke: none)
          rect((1.60, 0.2), (1.85, 0.55), fill: rgb("#444"), stroke: none)
          content((1.5, -0.1), text(size: 5pt, fill: rgb("#888"))[Beine bleiben])
          // Drehpfeil Oberkörper
          arc((1.5, 1.6), start: 30deg, stop: 150deg, radius: 0.6, stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          content((1.5, 2.5), text(size: 5pt, fill: rgb("#1a1a5e"))[Rumpf-Drehung])
          // Wurf
          line((1.1, 1.0), (-2.1, 1.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Phase 2: R-Fuß 90° Pivot*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Partner links
          circle((-2.5, 1.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((-2.5, 1.0), text(size: 7pt, weight: "bold", fill: white)[P])
          // Werfer rechts
          circle((1.5, 1.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1.5, 1.0), text(size: 7pt, weight: "bold", fill: white)[W])
          // Linker Fuß (parallel)
          rect((1.15, 0.2), (1.40, 0.55), fill: rgb("#444"), stroke: none)
          content((1.0, -0.1), text(size: 5pt, fill: rgb("#888"))[L])
          // Rechter Fuß 90° gedreht (quer)
          rect((1.55, 0.25), (1.95, 0.50), fill: rgb("#cc0000"), stroke: none)
          content((1.75, -0.1), text(size: 5pt, fill: rgb("#cc0000"))[R 90°])
          // Drehpfeil
          arc((1.5, 1.6), start: 60deg, stop: 180deg, radius: 0.6, stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          content((1.5, 2.5), text(size: 5pt, fill: rgb("#1a1a5e"))[Pivot 90°])
          // Wurf
          line((1.1, 1.0), (-2.1, 1.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
      [
        #align(center)[*Phase 3: 2 Steps*]
        #canvas(length: 0.7cm, {
          import draw: *
          // Partner links
          circle((-2.5, 1.0), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
          content((-2.5, 1.0), text(size: 7pt, weight: "bold", fill: white)[P])
          // Werfer rechts (verschoben durch step)
          circle((1.0, 1.0), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
          content((1.0, 1.0), text(size: 7pt, weight: "bold", fill: white)[W])
          // Linker Fuß Richtung Partner (vorne)
          rect((0.55, 0.2), (0.85, 0.55), fill: rgb("#cc0000"), stroke: none)
          content((0.7, -0.1), text(size: 5pt, fill: rgb("#cc0000"))[L → Ziel])
          // Rechter Fuß nach hinten
          rect((1.85, 0.2), (2.15, 0.55), fill: rgb("#cc0000"), stroke: none)
          content((2.0, -0.1), text(size: 5pt, fill: rgb("#cc0000"))[R nach hinten])
          // Step-Pfeile
          line((1.5, 0.4), (1.95, 0.4), stroke: (paint: rgb("#1a1a5e"), thickness: 0.8pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          line((1.5, 0.4), (0.95, 0.4), stroke: (paint: rgb("#1a1a5e"), thickness: 0.8pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
          content((1.5, 2.3), text(size: 5pt, fill: rgb("#1a1a5e"))[2-Step Pivot])
          // Wurf
          line((0.6, 1.0), (-2.1, 1.0), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
        })
      ],
    )
  ],
  rotation: [Pro Phase je 5–8 Würfe, dann zur nächsten Phase. Partner werfen sich abwechselnd zu (jeder ist mal Werfer, mal Partner, der den Ball zurückwirft).],
  varianten: [Distanz variieren: kurz starten (5–7 m), später ausweiten. Tempo erst langsam, dann schneller. Phase 3 später direkt aus Empfangs-Bewegung üben (Partner wirft den Ball, Werfer fängt mit Handschuh unten und macht sofort den 2-Step-Pivot).],
)

#drill(
  name: "Partner Fly Balls",
  kategorien: ("Throwing", "Outfield", "Fielding", "Partner-Routine"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Einfache Partner-Übung für Flyballs. Kann direkt nach dem Warmwerfen gemacht werden und gehört in die feste Routine — gut für Outfield, aber für jede Position nützlich.

    *Aufbau:*
    Zwei Spieler stehen sich gegenüber, ca. 15–25 m auseinander.

    *Ablauf:*
    - Einer wirft den Ball als Flyball zum Partner (hoch, mit Bogen).
    - Der Fänger sieht den Ball früh, läuft dorthin, fängt ihn mit zwei Händen über dem Kopf.
    - Der Fänger wirft den Ball als nächsten Flyball zurück.

    *Fokus:*
    - Ball früh sehen — Augen sofort nach oben.
    - Mit zwei Händen fangen (Wurfhand oben am Handschuh, fängt direkt zum nächsten Wurf bereit).
    - Unter den Ball laufen, nicht seitlich neben den Ball.
    - Nicht stehen bleiben und warten — der Ball muss zu einem kommen, weil man läuft.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Spieler 1 links
      circle((-3, 1), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3, 1), text(size: 7pt, weight: "bold", fill: white)[P1])
      // Spieler 2 rechts
      circle((3, 1), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((3, 1), text(size: 7pt, weight: "bold", fill: white)[P2])
      // Flyball-Bogen P1 → P2
      bezier((-2.6, 1.3), (2.6, 1.3), (-1.5, 4), (1.5, 4), stroke: 1.2pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((0, 4.3), text(size: 6pt, fill: rgb("#cc0000"))[Flyball])
    })
  ],
  rotation: [Beide werfen sich abwechselnd Flys zu. Dauer: 3–5 Minuten oder bis 15–20 Bälle gefangen.],
  varianten: [Distanz erhöhen für längere Bälle. Bewusst schwierig werfen: leicht versetzt, sodass der Fänger immer ein paar Schritte laufen muss. Für Outfielder: auch Bälle nach hinten werfen (Drop-Step üben).],
)

#drill(
  name: "Partner Grounder im Laufen",
  kategorien: ("Throwing", "Fielding", "Outfield", "Partner-Routine"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Partner-Übung für das Aufnehmen von Groundern im Laufen mit direktem Wurf zurück. Gehört wie Partner Fly Balls in die Routine nach dem Warmwerfen — gut für Infield-Charging und Outfield-Charging gleichermaßen.

    *Aufbau:*
    Zwei Spieler stehen sich gegenüber, ca. 20–30 m auseinander.

    *Ablauf:*
    - Werfer rollt oder wirft einen Grounder zum Partner — bewusst etwas weiter weg, sodass der Partner aktiv drauf zulaufen muss.
    - Partner läuft auf den Ball zu, nimmt ihn im Laufen auf (Fielding-Position im Bewegung) und wirft direkt zurück, ohne stehen zu bleiben.
    - Werfer fängt zurück und macht denselben Move (Grounder vom Partner aufnehmen, im Lauf zurück werfen).

    *Fokus:*
    - Aggressiv auf den Ball zulaufen (chargen) — nicht warten.
    - Ball aus dem Laufen heraus aufnehmen, Füße arbeiten weiter.
    - Direkt im Lauf den Wurf machen — nicht erst stoppen, stellen, dann werfen.
    - Wurf zielt zum Partner-Brust, nicht in den Boden.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Werfer links
      circle((-3, 1), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-3, 1), text(size: 7pt, weight: "bold", fill: white)[W])
      // Partner-Startposition (rechts)
      content((3, 1), text(size: 11pt, fill: rgb("#aaa"))[×])
      content((3, 0.3), text(size: 5pt, fill: rgb("#888"))[Start])
      // Partner nach vorne gelaufen (chargt)
      circle((1, 1), radius: 0.4, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((1, 1), text(size: 7pt, weight: "bold", fill: white)[P])
      // Grounder vom Werfer
      line((-2.6, 1), (0.6, 1), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))
      content((-1, 1.5), text(size: 5pt, fill: rgb("#2d8a2d"))[Grounder])
      // Laufweg Partner: × → P
      line((2.7, 1), (1.5, 1), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.1, 1.5), text(size: 5pt, fill: rgb("#1a1a5e"))[chargt])
      // Wurf zurück: P → W (Bogen oben)
      bezier((1, 1.4), (-2.6, 1.4), (0.5, 2.5), (-2, 2.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      content((-0.5, 2.8), text(size: 5pt, fill: rgb("#cc0000"))[Wurf im Lauf])
    })
  ],
  rotation: [Beide üben abwechselnd. Nach 5–8 Bällen pro Spieler tauschen — Werfer wird Fielder, Fielder wird Werfer.],
  varianten: [Härter rollen, sodass weniger Zeit zum Aufnehmen bleibt. Längere Distanz für Outfielder (Bälle als Linedrives oder One-Hopper). Wurf-Ziel variieren — manchmal hoch werfen lassen, sodass der Partner Flyball annimmt.],
)
