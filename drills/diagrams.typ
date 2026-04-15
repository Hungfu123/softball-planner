// Dead Sox — Diagramm-Funktionen
#import "template.typ": farbe-wurf, farbe-lauf, farbe-grounder, farbe-defense, farbe-offense, farbe-start

// Hilfsfunktion: Spieler-Punkt mit Label
#let spieler(label, fill: farbe-defense) = {
  circle(radius: 0.35, fill: fill, stroke: 0.5pt + black)
  content((), text(size: 8pt, weight: "bold", fill: white)[#label])
}

// Hilfsfunktion: Startposition (×)
#let startpos(pos) = {
  content(pos, text(size: 12pt, fill: farbe-start)[×])
}

// Pfeil-Stile
#let stil-wurf = (stroke: 2pt + farbe-wurf, mark: (end: ">", fill: farbe-wurf))
#let stil-lauf = (stroke: (paint: farbe-lauf, thickness: 1.5pt, dash: "dashed"), mark: (end: ">", fill: farbe-lauf))
#let stil-grounder = (stroke: (paint: farbe-grounder, thickness: 1.5pt, dash: "dotted"), mark: (end: ">", fill: farbe-grounder))

// Infield-Diamond Hintergrund
#let infield(body) = {
  import draw: *

  // Diamond-Linien
  let home = (0, 0)
  let first = (3, 2)
  let second = (0, 4)
  let third = (-3, 2)

  line(home, first, stroke: 0.5pt + gray)
  line(first, second, stroke: 0.5pt + gray)
  line(second, third, stroke: 0.5pt + gray)
  line(third, home, stroke: 0.5pt + gray)

  // Base-Markierungen
  for base in (home, first, second, third) {
    rect(
      (base.at(0) - 0.15, base.at(1) - 0.15),
      (base.at(0) + 0.15, base.at(1) + 0.15),
      fill: white,
      stroke: 1pt + black,
    )
  }

  // Pitcher-Kreis
  circle(
    (0, 2),
    radius: 0.12,
    fill: white,
    stroke: 1pt + black,
  )

  body
}
