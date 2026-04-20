import { Drawer } from 'vaul'

interface Props {
  open: boolean
  onClose: () => void
}

export function StatsGlossarySheet({ open, onClose }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Abkürzungen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="px-4 pt-4 pb-6 space-y-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <h2 className="text-xl font-bold text-gray-900">Was bedeuten die Abkürzungen?</h2>

            <Section title="Schlag-Events">
              <Row abbr="1B / Single" def="Treffer bis zur 1. Base" />
              <Row abbr="2B / Double" def="Treffer bis zur 2. Base" />
              <Row abbr="3B / Triple" def="Treffer bis zur 3. Base" />
              <Row abbr="HR / Homerun" def="Treffer übers Feld, alle Runner scoren" />
              <Row abbr="BB / Walk" def="4 Bälle — Batter darf auf die 1B" />
              <Row abbr="HBP" def="Hit-by-Pitch — Batter wurde vom Wurf getroffen" />
              <Row abbr="K / Strikeout" def="3× gestrikt, Batter aus" />
              <Row abbr="SB / Stolen Base" def="Base zwischen Pitches geklaut" />
              <Row abbr="CS / Caught Stealing" def="Beim Klauen gefangen (Out)" />
            </Section>

            <Section title="Berechnete Quoten">
              <Row
                abbr="AB / Schlagversuche"
                def="Alle Versuche — Walks und HBP zählen nicht, da man nicht geschlagen hat"
              />
              <Row
                abbr="BA / Trefferquote (Batting Average)"
                def="Treffer ÷ Schlagversuche. z.B. 7/21 = 0,333 = 33 %. Gut ab 30 %."
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
            </Section>

            <button
              onClick={onClose}
              className="w-full h-11 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-semibold cursor-pointer"
            >
              Verstanden
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-2">{title}</h3>
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
