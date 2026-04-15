// Outfield Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Outfield

#drill(
  name: "Outfield Basic — Laufen & Fangen",
  kategorien: ("Outfield", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Grundübung für Outfielder: Einer zeigt die Richtung, der andere läuft und fängt. Trainiert das Lesen der Flugbahn und das Laufen zum Ball.

    *Basic:*
    Der Werfer steht mit dem Ball in der Hand und zeigt in eine Richtung (links, rechts oder nach hinten). Der Outfielder startet und läuft in die gezeigte Richtung. Der Werfer wirft den Ball dorthin, der Outfielder fängt und wirft zurück.

    *Wichtig:* Der Outfielder soll den Ball *im Laufen* fangen, nicht stehen bleiben und warten. Ersten Schritt in die richtige Richtung machen, dann zum Ball laufen.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Outfielder
      circle((0, 2), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 2), text(size: 7pt, weight: "bold", fill: white)[OF])
      // Werfer
      circle((0, 5.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 5.5), text(size: 7pt, weight: "bold", fill: white)[W])
      // Richtungen
      line((0, 1.6), (-2, 0.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((-2.5, 0.5), text(size: 5pt, fill: rgb("#888"))[links])
      line((0, 1.6), (2, 0.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.5, 0.5), text(size: 5pt, fill: rgb("#888"))[rechts])
      line((0, 1.6), (0, 0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((0.8, 0), text(size: 5pt, fill: rgb("#888"))[hinten])
      // Wurf
      line((-0.2, 5.2), (-1.8, 0.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [OF und Werfer tauschen nach jedem Durchgang. Optional bei mehr Spielern: Paare bilden.],
  varianten: [Advanced: Werfer zeigt erst rechts, dann schnell links (Richtungswechsel). Oder: Werfer wirft ohne vorher zu zeigen (Reaktion auf Flugbahn).],
)

#drill(
  name: "Outfield Drop-Step Drill",
  kategorien: ("Outfield", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Der Werfer steht vor dem Outfielder und hält den Ball hoch. Der Outfielder läuft schräg nach hinten und behält dabei den Ball im Blick (wie bei einem Ball der über den Kopf geschlagen wird).

    Der Werfer zeigt den Ball nach links oder rechts. Der Outfielder dreht seinen Körper in die angezeigte Richtung und läuft los. Der Werfer wechselt dann die Richtung (1–3 Mal). Der Outfielder muss jedes Mal reagieren und sich *über innen drehen* — also über die Seite wo der Ball ist. Nie nach außen drehen, sonst verliert man den Ball kurz aus den Augen. Sobald der Werfer den Ball wirft, fängt der Outfielder und wirft zurück zum Fänger.

    *Wichtig beim Richtungswechsel:* Immer über die Ballseite drehen (Innendrehung). Bei einer Außendrehung hat man den Ball vorübergehend nicht im Blick — das kann im Spiel fatal sein.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Werfer unten
      circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])

      // OF Startposition
      circle((0, 3), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 3), text(size: 7pt, weight: "bold", fill: white)[OF])

      // Zickzack-Laufweg: OF läuft erst links, dann Richtungswechsel rechts, dann links fangen
      // Schritt 1: links
      line((-0.2, 3.3), (-1.5, 4.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Schritt 2: Innendrehung → rechts
      line((-1.5, 4.5), (1.5, 5.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      // Schritt 3: Innendrehung → links (fängt hier)
      line((1.5, 5.8), (-1.5, 7.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Labels bei Richtungswechsel
      content((-2.3, 4.5), text(size: 5pt, fill: rgb("#1a1a5e"))[links])
      content((2.3, 5.8), text(size: 5pt, fill: rgb("#1a1a5e"))[rechts])
      content((-2.3, 7.0), text(size: 5pt, fill: rgb("#1a1a5e"))[links])

      // Innendrehung-Hinweise
      content((-0.0, 4.3), text(size: 5pt, fill: rgb("#888"))[↻ innen])
      content((0.0, 6.7), text(size: 5pt, fill: rgb("#888"))[↺ innen])

      // Wurf: Werfer → OF (finale Richtung)
      line((-0.2, 1.3), (-1.3, 6.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))

      // Rückwurf: OF → Werfer
      line((-1.3, 6.8), (0, 1.4), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [Zu zweit: OF und Werfer tauschen nach jedem Durchgang. Bei 3 Spielern: OF → Fänger → Werfer → OF. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "Outfield Kommunikation & Backup",
  kategorien: ("Outfield", "Fielding", "Situational"),
  spieler: 4,
  equipment: ("Bälle", "Schläger"),
  beschreibung: [
    Übung für Kommunikation und Backup zwischen zwei Outfieldern.

    *Ablauf:*
    - Der Schlagmann schlägt den Ball nach hinten ins Outfield.
    - Beide Outfielder laufen zum Ball. Wer zuerst "ICH" ruft, bekommt den Ball.
    - Der andere Outfielder positioniert sich hinter dem Fänger als Backup.
    - Der Outfielder fängt den Ball und wirft zum Cutoff (Infielder Richtung Schlagmann).

    *Wichtig:* Laut und deutlich "ICH" rufen. Wer zuerst ruft, hat Vorrang. Der andere geht sofort ins Backup.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Schlagmann unten
      circle((0, 0.5), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 0.5), text(size: 7pt, weight: "bold", fill: white)[S])

      // Cutoff (Infielder) mitte
      circle((0, 2.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 2.5), text(size: 6pt, weight: "bold", fill: white)[Cut])

      // OF1 links oben
      circle((-1.5, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-1.5, 4.5), text(size: 6pt, weight: "bold", fill: white)[OF1])

      // OF2 rechts oben
      circle((1.5, 4.5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((1.5, 4.5), text(size: 6pt, weight: "bold", fill: white)[OF2])

      // Ball geschlagen nach hinten mitte
      line((0.1, 0.8), (0, 5.5), stroke: (paint: rgb("#2d8a2d"), thickness: 1pt, dash: "dotted"), mark: (end: ">", fill: rgb("#2d8a2d")))

      // Laufweg OF1 zum Ball
      line((-1.3, 4.7), (-0.3, 5.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Laufweg OF2 zum Ball
      line((1.3, 4.7), (0.3, 5.5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // "ICH!" label
      content((0, 6.2), text(size: 7pt, weight: "bold", fill: rgb("#cc0000"))["ICH!"])

      // OF1 fängt, OF2 Backup (hinter OF1)
      content((-2.8, 5.8), text(size: 5pt, fill: rgb("#888"))[fängt])
      content((2.5, 5.8), text(size: 5pt, fill: rgb("#888"))[Backup])

      // Rückwurf: OF → Cutoff
      line((-0.1, 5.3), (0, 2.9), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
    })
  ],
  rotation: [OF1 und OF2 tauschen nach jeder Runde. Cutoff und Schlagmann rotieren ebenfalls. Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
)

#drill(
  name: "Outfield Viereck — Flyout Reaktion",
  kategorien: ("Outfield", "Conditioning", "Fielding"),
  spieler: 2,
  equipment: ("Bälle (mind. 5)", "4 Hütchen"),
  beschreibung: [
    Vier Hütchen im Viereck aufstellen (ca. 10 × 10 Meter). Der Outfielder steht in der Mitte. Ein Werfer steht vor dem Viereck und wirft 5 Flyouts hintereinander in verschiedene Richtungen — seitlich, nach vorne und nach hinten.

    *Ablauf:*
    - Der Werfer wirft einen Flyout in eine Ecke oder Seite des Vierecks.
    - Der Outfielder sprintet hin und fängt den Ball aus der Luft.
    - Der Outfielder lässt den Ball fallen oder legt ihn außerhalb des Vierecks ab.
    - Sofort zurück zur Mitte — der nächste Flyout kommt direkt.
    - Nach 5 Bällen wird gewechselt.

    *Wichtig:* Der Werfer muss darauf achten, dass der Spieler in alle Richtungen laufen muss — seitlich, nach vorne und besonders nach hinten. Das Laufen nach hinten mit dem Ball im Blick ist die schwierigste und wichtigste Bewegung.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Viereck aus Hütchen
      let h1 = (-3, 3)
      let h2 = (3, 3)
      let h3 = (3, 7)
      let h4 = (-3, 7)

      // Viereck-Linien (gestrichelt, grau)
      line(h1, h2, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h2, h3, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h3, h4, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h4, h1, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))

      // Hütchen-Markierungen
      content((-3, 3), text(size: 8pt, fill: rgb("#888"))[▲])
      content((3, 3), text(size: 8pt, fill: rgb("#888"))[▲])
      content((3, 7), text(size: 8pt, fill: rgb("#888"))[▲])
      content((-3, 7), text(size: 8pt, fill: rgb("#888"))[▲])

      // OF in der Mitte
      circle((0, 5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((0, 5), text(size: 7pt, weight: "bold", fill: white)[OF])

      // Werfer vor dem Viereck
      circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])

      // Flyout-Würfe in verschiedene Richtungen
      // nach links
      line((0.1, 1.3), (-2.5, 4.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // nach rechts
      line((0.2, 1.3), (2.5, 4.8), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // nach hinten links
      line((-0.1, 1.3), (-2.0, 6.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))
      // nach hinten rechts
      line((0.1, 1.3), (2.0, 6.5), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))

      // Laufwege OF (von Mitte zu den Richtungen)
      line((-0.3, 4.8), (-2.2, 4.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      line((0.3, 4.8), (2.2, 4.8), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      line((-0.2, 5.3), (-1.7, 6.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      line((0.2, 5.3), (1.7, 6.3), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
    })
  ],
  rotation: [OF und Werfer tauschen nach jedem Durchgang (5 Bälle). Optional bei mehr Spielern: jeder macht 2–3 Runden bevor gewechselt wird.],
  varianten: [10 Bälle hintereinander für mehr Kondition.],
)

#drill(
  name: "Outfield Viereck — Kommunikation",
  kategorien: ("Outfield", "Fielding", "Situational"),
  spieler: 3,
  equipment: ("Bälle", "4 Hütchen"),
  beschreibung: [
    Dasselbe Viereck wie beim Flyout-Reaktion-Drill (ca. 10 × 10 Meter). Zwei Outfielder stehen nebeneinander im Viereck — einer davon ist der CF. Ein Werfer steht vor dem Viereck.

    *Ablauf:*
    - Der Werfer wirft einen Flyout in die Mitte zwischen die beiden Outfielder.
    - Beide laufen zum Ball. Wer zuerst laut "ICH" ruft, fängt den Ball.
    - Wenn beide gleichzeitig rufen: *CF hat immer Vorrang.*
    - Der andere Outfielder geht sofort ins Backup — positioniert sich hinter dem Fänger, falls der Ball runterfällt.
    - Ball fallen lassen oder außerhalb des Vierecks ablegen. Nicht zum Werfer zurückwerfen.

    *Wichtig:* Nicht schnell hintereinander werfen. Nach jedem Ball kurz Pause — der Fokus liegt auf der Kommunikation, nicht auf Tempo. Laut und deutlich "ICH" rufen. Wer nicht ruft, geht ins Backup.
  ],
  diagramm: [
    #canvas(length: 0.7cm, {
      import draw: *
      // Viereck aus Hütchen
      let h1 = (-3, 3)
      let h2 = (3, 3)
      let h3 = (3, 7)
      let h4 = (-3, 7)

      // Viereck-Linien (gestrichelt, grau)
      line(h1, h2, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h2, h3, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h3, h4, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))
      line(h4, h1, stroke: (paint: rgb("#aaaaaa"), thickness: 0.5pt, dash: "dashed"))

      // Hütchen-Markierungen
      content((-3, 3), text(size: 8pt, fill: rgb("#888"))[▲])
      content((3, 3), text(size: 8pt, fill: rgb("#888"))[▲])
      content((3, 7), text(size: 8pt, fill: rgb("#888"))[▲])
      content((-3, 7), text(size: 8pt, fill: rgb("#888"))[▲])

      // CF links
      circle((-1.5, 5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((-1.5, 5), text(size: 6pt, weight: "bold", fill: white)[CF])

      // OF rechts
      circle((1.5, 5), radius: 0.35, fill: rgb("#2255aa"), stroke: 0.5pt + black)
      content((1.5, 5), text(size: 7pt, weight: "bold", fill: white)[OF])

      // Werfer vor dem Viereck
      circle((0, 1), radius: 0.35, fill: rgb("#888"), stroke: 0.5pt + black)
      content((0, 1), text(size: 7pt, weight: "bold", fill: white)[S])

      // Flyout: Werfer → Mitte
      line((0, 1.4), (0, 6.2), stroke: 1pt + rgb("#cc0000"), mark: (end: ">", fill: rgb("#cc0000")))

      // Laufweg CF zum Ball
      line((-1.2, 5.2), (-0.3, 6.0), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // Laufweg OF zum Ball → Backup
      bezier((1.2, 5.2), (0.5, 6.5), (0.8, 5.8), (0.5, 6.2), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))

      // "ICH!" label beim CF
      content((-1.2, 6.5), text(size: 7pt, weight: "bold", fill: rgb("#cc0000"))["ICH!"])

      // Backup label beim OF
      content((1.2, 6.8), text(size: 5pt, fill: rgb("#888"))[Backup])
    })
  ],
  rotation: [Beide Outfielder und Werfer rotieren nach einer festgelegten Anzahl Bälle. CF-Rolle wechselt, damit jeder die Vorrang-Regel übt.],
)
