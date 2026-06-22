import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'

interface Props {
  open: boolean
  onClose: () => void
}

export function StatsGlossarySheet({ open, onClose }: Props) {
  const footer = (
    <button
      onClick={onClose}
      className="w-full h-11 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-semibold cursor-pointer"
    >
      Verstanden
    </button>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Abkürzungen" maxWidth="md" footer={footer}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        <Section title="Schlag-Events">
              <Row abbr="1B / Single" def="Treffer bis zur 1. Base" />
              <Row abbr="2B / Double" def="Treffer bis zur 2. Base" />
              <Row abbr="3B / Triple" def="Treffer bis zur 3. Base" />
              <Row abbr="HR / Homerun" def="Treffer übers Feld, alle Runner scoren" />
              <Row abbr="R / Runs" def="Erzielte Läufe — wie oft du selbst Home gekreuzt hast (inkl. Steal of Home). NICHT zu verwechseln mit RBI (= Runs durch deinen Hit ermöglicht)." />
              <Row abbr="BB / Walk" def="4 Bälle — Batter darf auf die 1B" />
              <Row abbr="HBP" def="Hit-by-Pitch — Batter wurde vom Wurf getroffen" />
              <Row abbr="K / Strikeout" def="3× gestrikt, Batter aus" />
              <Row abbr="SB / Stolen Base" def="Base zwischen Pitches gestealed" />
              <Row abbr="CS / Caught Stealing" def="Beim Steal-Versuch gefangen (Out). Wirkt sich auf Steal-Quote aus." />
              <Row abbr="PO / Pickoff" def="Vom Pitcher/Catcher getagt — ohne Steal-Versuch. Eigener Stat, zählt NICHT als CS." />
            </Section>

            <Section title="Berechnete Quoten">
              <Row
                abbr="AB / At-Bats"
                def="Alle Versuche — Walks und HBP zählen nicht, da man nicht geschlagen hat"
              />
              <Row
                abbr="BA / Trefferquote (Batting Average)"
                def="Treffer ÷ At-Bats. z.B. 7/21 = 0,333 = 33 %. Gut ab 30 %."
              />
              <Row
                abbr="OBP / Auf-Base-Quote"
                def="Wie oft kommst du auf Base — inkl. Walks + HBP. Gut ab 38 %."
              />
              <Row
                abbr="SLG / Schlagstärke (Slugging)"
                def="Total Bases ÷ AB (1B=1, 2B=2, 3B=3, HR=4). Misst wie 'kräftig' getroffen wird. Gut ab 0,450."
              />
              <Row
                abbr="OPS"
                def="OBP + SLG = Gesamtstärke. Elite-Level ab 0,800."
              />
              <Row
                abbr="RBI / Runs Batted In"
                def="Runs die du durch deinen Hit nach Hause gebracht hast."
              />
              <Row
                abbr="R/G"
                def="Runs pro Spiel — erzielte Läufe geteilt durch die (gewichteten) Spiele des Spielers (Feld=1.0, EH/DH=0.5). Nur in Saison-/Jahr-/Alle-Zeit-Statistiken."
              />
              <Row
                abbr="RBI/G"
                def="RBI pro Spiel — RBI geteilt durch die (gewichteten) Spiele des Spielers (Feld=1.0, EH/DH=0.5). Nur in Saison-/Jahr-/Alle-Zeit-Statistiken."
              />
              <Row
                abbr="Mindest-ABs (ab 5)"
                def="In Saison-/Jahr-/Alle-Zeit-Statistiken werden Quoten erst ab 5 At-Bats gewertet — sonst verzerren Mini-Stichproben das Bild (3-für-3 = 1.000). Über 'Alle zeigen' lassen sich Spieler darunter trotzdem einblenden."
              />
            </Section>
      </div>
    </ResponsiveSheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[11px] tracking-widest font-bold text-navy-500 uppercase mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ abbr, def }: { abbr: string; def: string }) {
  return (
    <div className="border-l-2 border-navy-200 pl-3">
      <div className="font-semibold text-gray-900 text-sm">{abbr}</div>
      <div className="text-xs text-gray-600">{def}</div>
    </div>
  )
}
