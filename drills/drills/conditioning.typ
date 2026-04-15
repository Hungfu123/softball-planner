// Conditioning Drills
#import "../template.typ": drill
#import "@preview/cetz:0.3.4": canvas, draw

= Conditioning

#drill(
  name: "Agility Ladder — Beinübungen",
  kategorien: ("Conditioning", "Warmup"),
  spieler: 1,
  equipment: ("Koordinationsleiter",),
  beschreibung: [
    Fünf Übungen in der Koordinationsleiter, nacheinander durchführen:

    + *Beidfüßig springen (hoch):* Mit beiden Füßen möglichst hoch auf den Fußspitzen springen. Erste Hälfte vorwärts, ab der Hälfte rückwärts.

    + *Einbeinig springen:* Auf einem Fuß springen, sowohl vorwärts als auch rückwärts. Abwechselnd das Bein wechseln.

    + *Seitwärts shufflen:* Seitwärts durch die Leiter shufflen. Die Handschuhhand soll dabei über den Boden gleiten.

    + *Trippelschritte + Knie hoch:* Kleine Trippelschritte bis zur Mitte der Leiter, dann wechseln zu Knie nach oben.

    + *Seitwärts shuffle + Crossover:* Seitwärts durch die Leiter shufflen. Nach jedem zweiten Feld: Crossover-Schritt — das hintere Bein kreuzt vor dem vorderen Bein, dann weiter shufflen. Rhythmus: shuffle, shuffle, Crossover, shuffle, shuffle, Crossover.
  ],
  diagramm: [
    #canvas(length: 0.6cm, {
      import draw: *
      // Leiter zeichnen
      let x-left = -1
      let x-right = 1
      let rungs = 8
      // Seitenlinien
      line((x-left, 0), (x-left, rungs + 0.5), stroke: 1pt + rgb("#888"))
      line((x-right, 0), (x-right, rungs + 0.5), stroke: 1pt + rgb("#888"))
      // Sprossen
      for i in range(rungs + 1) {
        let y = i * 1 + 0.25
        line((x-left, y), (x-right, y), stroke: 0.5pt + rgb("#aaa"))
      }

      // Label
      content((0, -0.5), text(size: 7pt, fill: rgb("#888"))[Start])
      content((0, rungs + 1.2), text(size: 7pt, fill: rgb("#888"))[Ende])

      // Laufrichtung vorwärts
      line((1.8, 1), (1.8, 5), stroke: (paint: rgb("#1a1a5e"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#1a1a5e")))
      content((2.8, 3), text(size: 6pt, fill: rgb("#1a1a5e"))[vorwärts])

      // Laufrichtung rückwärts
      line((1.8, 7.5), (1.8, 5.5), stroke: (paint: rgb("#cc0000"), thickness: 1pt, dash: "dashed"), mark: (end: ">", fill: rgb("#cc0000")))
      content((2.8, 6.5), text(size: 6pt, fill: rgb("#cc0000"))[rückwärts])
    })
  ],
  rotation: [Jeder Spieler macht alle 5 Übungen nacheinander durch die Leiter. Bei mehreren Spielern: einer nach dem anderen, sobald die Leiter frei ist.],
)
