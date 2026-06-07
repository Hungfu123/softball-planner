import { useState } from 'react'
import { useCollegeSeries } from '@/hooks/useCollegeSeries'
import type { CollegeSeriesGame, CollegeSeriesRow } from '@/api/collegeSeries'
import { teamColorHex, teamLogoUrl } from '@/api/collegeSeries'
import { TrophyIcon, CalendarIcon, AlertTriangle, CrossBones, RefreshIcon, HomeStadiumIcon } from '@/icons'

type Tab = 'tabelle' | 'spielplan'

function fmtPct(p: number): string {
  const s = p.toFixed(3)
  return s.startsWith('0') ? s.slice(1) : s
}

// Team-Logo als runder Avatar; fehlt das Logo → Monogramm (TLC) im Team-Farbton.
function TeamAvatar({
  logo, tlc, color, name, ring = false,
}: { logo: string | null; tlc: string; color: string; name: string; ring?: boolean }) {
  const url = teamLogoUrl(logo)
  const initials = (tlc || name.slice(0, 3)).toUpperCase()
  const isNone = (color ?? 'none').toLowerCase() === 'none'
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-50 ${ring ? 'ring-1 ring-white/40' : 'ring-1 ring-cream-300'}`}>
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[8px] font-extrabold leading-none"
          style={isNone
            ? { backgroundColor: '#E8EAF6', color: '#1E2A8F' }
            : { backgroundColor: teamColorHex(color), color: '#fff' }}
        >
          {initials}
        </span>
      )}
    </span>
  )
}

export function CollegeSeriesPanel() {
  const { standings, schedule, loading, error, reload } = useCollegeSeries()
  const [tab, setTab] = useState<Tab>('tabelle')
  const stage = schedule.find((g) => g.stage)?.stage ?? ''

  return (
    <section className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-[0_4px_20px_-4px_rgba(10,15,92,0.18),0_2px_6px_-2px_rgba(10,15,92,0.12)]">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-navy-900">
          <TrophyIcon size={20} className="text-navy-700" />
          College Series
          {stage && (
            <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-navy-700 shadow-[0_1px_2px_rgba(10,15,92,0.06)]">
              {stage}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-softball-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-softball-red-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-softball-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-softball-red-500" />
            </span>
            Live
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            aria-label="Tabelle aktualisieren"
            title="Aktualisieren"
            className="rounded-lg border border-cream-300 bg-cream-100 p-1.5 text-navy-700 transition-colors hover:border-navy-600 hover:text-navy-900 disabled:opacity-50"
          >
            <RefreshIcon size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Segmented Tabs — nur mobil; auf Desktop zeigen wir beide Spalten */}
      <div className="px-4 pt-3 lg:hidden">
        <div className="flex rounded-xl bg-cream-200 p-1 shadow-inner">
          <SegBtn active={tab === 'tabelle'} onClick={() => setTab('tabelle')} icon={<TrophyIcon size={15} />}>
            Tabelle
          </SegBtn>
          <SegBtn active={tab === 'spielplan'} onClick={() => setTab('spielplan')} icon={<CalendarIcon size={15} />}>
            Spielplan
          </SegBtn>
        </div>
      </div>

      {loading && <div className="px-4 pb-4 pt-3"><LoadingState /></div>}
      {error && !loading && <div className="px-4 pb-4 pt-3"><ErrorState message={error} onRetry={reload} /></div>}

      {!loading && !error && (
        <>
          {/* Mobil: eine Ansicht pro Tab */}
          <div className="px-4 pb-4 pt-3 lg:hidden">
            {tab === 'tabelle' ? (
              <StandingsTable rows={standings} />
            ) : (
              <Schedule games={schedule} />
            )}
          </div>

          {/* Desktop: Tabelle + Spielplan nebeneinander */}
          <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6 lg:px-5 lg:pb-5 lg:pt-4">
            <div className="lg:col-span-3 lg:border-r lg:border-cream-200 lg:pr-6">
              <ColTitle icon={<TrophyIcon size={15} />}>Tabelle</ColTitle>
              <StandingsTable rows={standings} />
            </div>
            <div className="lg:col-span-2">
              <ColTitle icon={<CalendarIcon size={15} />}>Spielplan</ColTitle>
              <Schedule games={schedule} />
            </div>
          </div>
        </>
      )}

      <div className="border-t border-cream-200 bg-cream-100 px-4 py-2 text-center text-[11px] text-navy-700/60">
        Quelle: college-series.de · live abgerufen
      </div>
    </section>
  )
}

// ---------- Segmented Button ----------

function SegBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-all duration-200',
        active
          ? 'bg-cream-50 text-navy-900 shadow-[0_1px_3px_rgba(10,15,92,0.18)]'
          : 'text-navy-700/70 hover:text-navy-800',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  )
}

// ---------- Spalten-Titel (Desktop) ----------

function ColTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-navy-700">
      {icon}
      {children}
    </div>
  )
}

// ---------- Standings ----------

function StandingsTable({ rows }: { rows: CollegeSeriesRow[] }) {
  if (rows.length === 0) return <EmptyState text="Noch keine Tabellendaten." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-navy-700/55">
            <Th className="text-left">#</Th>
            <Th className="text-left">Team</Th>
            <Th className="text-right">G</Th><Th className="text-right">W</Th><Th className="text-right">L</Th><Th className="text-right">Pct</Th>
            <Th className="hidden text-right sm:table-cell">RS</Th>
            <Th className="hidden text-right sm:table-cell">RA</Th>
            <Th className="text-right">Diff</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const own = r.isOwnTeam
            const zebra = i % 2 === 1 && !own
            return (
              <tr
                key={r.teamId}
                data-own={own}
                className={own ? 'text-white' : 'text-navy-900'}
              >
                <Td own={own} zebra={zebra} className="rounded-l-lg text-left font-bold text-navy-700/70">
                  {i + 1}
                </Td>
                <Td own={own} zebra={zebra} className="text-left font-semibold">
                  <span className="flex items-center gap-2.5">
                    <TeamAvatar logo={r.logo} tlc={r.tlc} color={r.color} name={r.name} ring={own} />
                    <span className="truncate">{r.name}</span>
                  </span>
                </Td>
                <Td own={own} zebra={zebra} className="tabular-nums">{r.games}</Td>
                <Td own={own} zebra={zebra} className={`tabular-nums font-bold ${own ? 'text-emerald-300' : 'text-green-700'}`}>{r.wins}</Td>
                <Td own={own} zebra={zebra} className={`tabular-nums ${own ? 'text-rose-300' : 'text-softball-red-600'}`}>{r.losses}</Td>
                <Td own={own} zebra={zebra} className="tabular-nums font-bold">{fmtPct(r.winPct)}</Td>
                <Td own={own} zebra={zebra} className="hidden tabular-nums sm:table-cell">{r.runsScored}</Td>
                <Td own={own} zebra={zebra} className="hidden tabular-nums sm:table-cell">{r.runsAgainst}</Td>
                <Td own={own} zebra={zebra} className="rounded-r-lg tabular-nums font-semibold">
                  {r.runDiff > 0 ? `+${r.runDiff}` : r.runDiff}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-1.5 pb-2 font-bold ${className}`}>{children}</th>
}

function Td({
  children, own, zebra, className = '',
}: { children: React.ReactNode; own: boolean; zebra: boolean; className?: string }) {
  const bg = own ? 'bg-navy-800' : zebra ? 'bg-cream-100' : 'bg-transparent'
  return (
    <td className={`border-b border-cream-200 px-1.5 py-2 text-right ${bg} ${own ? 'shadow-[inset_0_0_0_9999px_rgba(17,27,107,0.0)]' : ''} ${className}`}>
      {children}
    </td>
  )
}

// ---------- Schedule ----------

function Schedule({ games }: { games: CollegeSeriesGame[] }) {
  const [picked, setPicked] = useState<string | null>(null)
  const filtered = games.filter((g) => g.involvesOwn)
  const groups = groupByMatchday(filtered)
  const dates = groups.map(([label]) => label)
  // Default: nächster Spieltag mit offenem Spiel, sonst erster.
  const defaultDate = (groups.find(([, gs]) => gs.some((g) => !g.isFinal)) ?? groups[0])?.[0]
  const selected = picked && dates.includes(picked) ? picked : defaultDate
  const current = groups.find(([label]) => label === selected)?.[1] ?? []

  return (
    <div>
      {dates.length === 0 ? (
        <EmptyState text="Keine Spiele gefunden." />
      ) : (
        <>
          {/* Datum-Pills — nur ein Spieltag zur Zeit (kein langes Scrollen) */}
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPicked(d)}
                aria-pressed={d === selected}
                className={[
                  'flex-none rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all',
                  d === selected
                    ? 'bg-navy-800 text-white shadow-[0_2px_6px_-1px_rgba(10,15,92,0.4)]'
                    : 'border border-cream-300 bg-cream-100 text-navy-700 hover:border-navy-600',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {current.map((g) => <ScoreboardCard key={g.id} game={g} />)}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-navy-700/55">
            <HomeStadiumIcon size={12} className="text-navy-700/70" /> Haus-Symbol = Heimrecht (Gastgeber)
          </div>
        </>
      )}
    </div>
  )
}

// Scoreboard-Karte: beide Teams untereinander, Heim-Team mit Haus-Symbol,
// Dead Sox hervorgehoben, Score/Sieger oder OFFEN. Funktioniert für alle Spiele.
function ScoreboardCard({ game }: { game: CollegeSeriesGame }) {
  const final = game.isFinal
  const homeWin = final && (game.homeScore ?? 0) > (game.awayScore ?? 0)
  const awayWin = final && (game.awayScore ?? 0) > (game.homeScore ?? 0)
  const homeDs = game.involvesOwn && game.ownIsHome
  const awayDs = game.involvesOwn && !game.ownIsHome

  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 shadow-[0_2px_8px_-3px_rgba(10,15,92,0.22)]">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <TeamLine name={game.home} logo={game.homeLogo} tlc={game.homeTlc} color={game.homeColor}
          isHome ds={homeDs} score={game.homeScore} final={final} win={homeWin} />
        <TeamLine name={game.away} logo={game.awayLogo} tlc={game.awayTlc} color={game.awayColor}
          isHome={false} ds={awayDs} score={game.awayScore} final={final} win={awayWin} />
      </div>
      {!final && (
        <span className="shrink-0 rounded-full bg-navy-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-navy-700">
          Offen
        </span>
      )}
    </div>
  )
}

function TeamLine({
  name, logo, tlc, color, isHome, ds, score, final, win,
}: {
  name: string; logo: string | null; tlc: string; color: string
  isHome: boolean; ds: boolean; score: number | null; final: boolean; win: boolean
}) {
  const display = ds ? 'Dead Sox' : name
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 ${ds ? 'bg-navy-50' : ''}`}>
      <TeamAvatar logo={logo} tlc={tlc} color={color} name={name} />
      <span
        className={`flex-1 truncate text-[14px] ${
          ds ? 'font-extrabold text-navy-900'
            : final && !win ? 'font-medium text-navy-900/55'
            : final && win ? 'font-extrabold text-navy-900'
            : 'font-semibold text-navy-900'
        }`}
        title={name}
      >
        {display}
      </span>
      {isHome && <HomeStadiumIcon size={13} className="shrink-0 text-navy-700/55" />}
      {final && (
        <span className={`shrink-0 text-[16px] font-extrabold tabular-nums ${win ? 'text-green-600' : 'text-navy-900/45'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function groupByMatchday(games: CollegeSeriesGame[]): Array<[string, CollegeSeriesGame[]]> {
  const map = new Map<string, CollegeSeriesGame[]>()
  for (const g of games) {
    const arr = map.get(g.matchdayLabel) ?? []
    arr.push(g)
    map.set(g.matchdayLabel, arr)
  }
  return Array.from(map.entries())
}

// ---------- States ----------

function LoadingState() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-cream-200" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle size={32} className="text-softball-red-500" />
      <p className="text-sm text-navy-900/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-navy-800 px-3.5 py-1.5 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white"
      >
        Erneut laden
      </button>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-navy-700/60">
      <CrossBones className="h-8 w-8" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
