// Dead Sox — Training Drills Template
// Farben basierend auf Teamfarben
#let navy = rgb("#1a1a5e")
#let rot = rgb("#cc0000")
#let weiss = rgb("#ffffff")
#let hellgrau = rgb("#f0f0f0")
#let grau = rgb("#888888")

// Diagramm-Farben
#let farbe-wurf = rgb("#cc0000")    // Durchgezogener Pfeil: Wurf/Toss
#let farbe-lauf = rgb("#1a1a5e")    // Gestrichelter Pfeil: Laufweg
#let farbe-grounder = rgb("#2d8a2d") // Welliger Pfeil: Grounder/gerollter Ball
#let farbe-defense = rgb("#2255aa")  // Spieler Defense
#let farbe-offense = rgb("#cc0000")  // Spieler Offense/Runner
#let farbe-start = rgb("#aaaaaa")    // Startposition ×

// Dokument-Setup
#let setup-dokument(body) = {
  set document(title: "Dead Sox — Training Drills", author: "Dead Sox Softball")
  set page(
    paper: "a4",
    margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
    header: context {
      if counter(page).get().first() > 2 {
        set text(size: 9pt, fill: grau)
        [Dead Sox Training Drills]
        h(1fr)
        [Seite #counter(page).display()]
      }
    },
  )
  set text(font: "Liberation Sans", size: 11pt, lang: "de")
  set heading(numbering: "1.1")
  set par(justify: true)
  body
}

// Titelseite
#let titelseite() = {
  page(header: none, margin: (top: 0cm, bottom: 0cm, left: 0cm, right: 0cm))[
    #rect(width: 100%, height: 100%, fill: navy)[
      #align(center + horizon)[
        #image("logo.jpeg", width: 6cm)
        #v(1cm)
        #text(size: 42pt, weight: "bold", fill: weiss)[DEAD SOX]
        #v(0.5cm)
        #text(size: 20pt, fill: rot)[Training Drills]
        #v(1cm)
        #line(length: 60%, stroke: 1pt + rot)
        #v(0.5cm)
        #text(size: 14pt, fill: weiss.darken(20%))[Softball]
      ]
    ]
  ]
}

// Legende der visuellen Sprache
#let legende() = {
  heading(level: 1, numbering: none)[Legende]

  rect(width: 100%, inset: 12pt, radius: 4pt, stroke: 0.5pt + grau)[
    #text(size: 10pt)[
      #grid(
        columns: (1fr, 1fr),
        gutter: 8pt,
        [*Spieler:*],
        [],
        [#text(fill: farbe-defense)[●] Defense (1B, 2B, SS, 3B, P, C, OF)],
        [#text(fill: farbe-offense)[●] Offense / Runner],
        [],
        [],
        [*Pfeile:*],
        [],
        [#text(fill: farbe-wurf)[→ Durchgezogen] = Wurf / Toss (Ball fliegt)],
        [#text(fill: farbe-lauf)[⇢ Gestrichelt] = Laufweg (Spieler rennt)],
        [#text(fill: farbe-grounder)[··> Gepunktet] = Grounder / gerollter Ball],
        [],
        [],
        [],
        [*Sonstige:*],
        [],
        [#text(fill: farbe-start)[×] = Startposition (Spieler hat sich bewegt)],
        [Buchstabe im Punkt = Rolle (S, 1B, 2B, SS, 3B, C, P, R, OF)],
      )
    ]
  ]
}

// Drill-Karte
#let drill(
  name: "",
  kategorien: (),
  spieler: 0,
  equipment: (),
  beschreibung: [],
  diagramm: none,
  rotation: none,
  varianten: none,
) = {
  // Drill-Überschrift
  heading(level: 2)[#name]

  // Metadaten-Leiste
  rect(width: 100%, inset: 8pt, radius: 4pt, fill: hellgrau)[
    #text(size: 9pt)[
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        [*Kategorien:*], kategorien.join(" · "),
        [*Spieler:*], [mind. #spieler],
        [*Equipment:*], equipment.join(", "),
      )
    ]
  ]

  v(6pt)

  // Beschreibung
  beschreibung

  // Diagramm
  if diagramm != none {
    v(8pt)
    rect(width: 100%, inset: 12pt, radius: 4pt, stroke: 0.5pt + grau)[
      #align(center)[#diagramm]
    ]
  }

  // Rotationsplan
  if rotation != none {
    v(6pt)
    rect(width: 100%, inset: 8pt, radius: 4pt, fill: navy.lighten(90%))[
      #text(size: 10pt)[
        *Rotation:* #rotation
      ]
    ]
  }

  // Varianten
  if varianten != none {
    v(6pt)
    text(size: 10pt, style: "italic")[*Varianten:* #varianten]
  }

  v(12pt)
}
