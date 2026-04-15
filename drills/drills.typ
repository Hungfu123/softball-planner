// Dead Sox — Training Drills
// Hauptdatei: kompilieren mit `typst compile drills.typ`

#import "template.typ": setup-dokument, titelseite, legende

#show: setup-dokument

#titelseite()

#pagebreak()

#outline(title: "Inhaltsverzeichnis", depth: 2, indent: 1em)

#pagebreak()

#legende()

#pagebreak()

#rect(width: 100%, inset: 12pt, radius: 4pt, fill: rgb("#1a1a5e").lighten(90%), stroke: 0.5pt + rgb("#1a1a5e"))[
  #text(size: 11pt, weight: "bold")[Trainingsablauf]

  Jedes Training folgt dieser Struktur:

  + *Aufwärmroutine* — Pflicht bei jedem Training. Siehe "Aufwärmroutine der Dead Sox".
  + *Throwing, Fielding, Situational* — Je nach Schwerpunkt und verfügbaren Spielern.
  + *Hitting / Batting* — Immer am Ende des Trainings.
  + *7 vs 7* — Ab 14 Spielern kann man ein Spiel 7 gegen 7 machen.
]

#v(12pt)

// === Warmup (immer zuerst) ===
#include "drills/warmup.typ"

// === Grundlagen ===
#include "drills/throwing.typ"
#include "drills/baserunning.typ"
#include "drills/conditioning.typ"

// === Nach Position ===
#include "drills/pitcher.typ"
#include "drills/catcher.typ"
#include "drills/first-base.typ"
#include "drills/second-base.typ"
#include "drills/shortstop.typ"
#include "drills/third-base.typ"
#include "drills/outfield.typ"

// === Spielzüge ===
#include "drills/situational.typ"

// === Hitting immer am Ende ===
#include "drills/hitting.typ"
