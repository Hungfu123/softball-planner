import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, Abschnittsmarke } from '@/components/shared'
import { SendIcon, CounterIcon, CalendarIcon, ClipboardListIcon } from '@/icons'
import { BookOpen, Mail, Receipt, ChevronRight, Users, History } from 'lucide-react'
import { useRolle } from '@/hooks/useRolle'

/**
 * Eine Kachel im Werkzeugkasten: Zeichen links, Name und eine Zeile rechts.
 *
 * Das Zeichen steht LINKS, nicht oben. Oben kostete es eine eigene Zeile Hoehe und liess
 * rechts neben sich 60 Pixel leer — in einer 181 Pixel breiten Kachel ist das die Haelfte
 * der Flaeche fuer nichts. Links getragen schrumpft die Kachel von 88 auf 52 Pixel, UND
 * Name und Zeile duerfen eine Stufe groesser werden (12 und 11 statt 11 und 10).
 *
 * Die Beschreibung ist EINE, in beiden Breiten dieselbe, und sie sagt nur, was der Name
 * nicht schon sagt. Vorher stand da „Balls, Strikes, Outs und Score beim Umpen" — eine
 * Aufzaehlung dessen, was jeder Counter zaehlt — und „Einladungsschreiben fuer
 * Heimspieltage" unter der Ueberschrift „Einladungen". Sechs der neun Zeilen waren so
 * gebaut. Gekuerzt bleibt, was wirklich Auskunft ist: der Hochschulsport, der ICS-Export,
 * der RFL-Bogen.
 *
 * Damit faellt auch die Doppelung aus Kurz- und Langfassung weg: ein Text, eine Wahrheit.
 */
function Kachel({ to, icon, titel, untertitel }: {
  to: string; icon: ReactNode; titel: string; untertitel: string
}) {
  return (
    <Link to={to} className="block h-full">
      <Card className="p-2.5 sm:p-5 h-full hover:border-line-strong hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-accent text-accent-ink shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-normal sm:tracking-widest text-ink-strong break-words leading-tight">
              {titel}
            </div>
            <div className="text-[11px] sm:text-xs text-ink-muted mt-0.5 leading-tight">{untertitel}</div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

/**
 * Die seltenen Wege: eine Zeile, kein Kasten — sie sollen da sein, nicht auffallen.
 *
 * Am Handy in derselben Schriftgroesse wie die Kacheln darueber. Mit `text-sm` stand
 * „Spielbogen" groesser da als „Counter", und damit sagte die Seite das Gegenteil dessen,
 * wofuer die drei Stufen ueberhaupt da sind.
 */
function Zeile({ to, icon, titel, untertitel }: {
  to: string; icon: ReactNode; titel: string; untertitel: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl hover:bg-accent hover:text-accent-ink text-ink-strong transition-colors group"
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-normal sm:tracking-widest break-words leading-tight">{titel}</div>
        {/* Unter dem Zeiger die volle Tinte, nicht /75: auf dem dunklen Akzent fiel die
            gedeckte Variante auf 4,04:1 — der Hover-Pruefer hat es gemessen. Die Rangfolge
            zum Titel traegt hier ohnehin die Groesse und die Fettung, nicht die Helligkeit. */}
        <div className="text-[11px] sm:text-xs text-ink-muted group-hover:text-accent-ink mt-0.5 leading-tight">{untertitel}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-faint group-hover:text-accent-ink/75" aria-hidden="true" />
    </Link>
  )
}

function Ueberschrift({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted">{children}</h2>
      <span className="flex-1 h-px bg-line" aria-hidden="true" />
    </div>
  )
}

/**
 * Der Werkzeugkasten. Drei Stufen, und die Stufe ist die Auskunft: was man oft braucht,
 * was man manchmal braucht, was man selten braucht.
 *
 * Am Handy liegen die Kacheln zu zweit statt untereinander. Vorher war jede eine volle
 * Zeile mit Erklaertext — neun davon ergaben zweieinhalb Bildschirme, und eine Uebersicht,
 * durch die man scrollen muss, ist keine.
 */
export function OrgaHome() {
  const { istSuperadmin } = useRolle()
  return (
    <div className="space-y-3 sm:space-y-4">
      <h1 className="inline-flex items-center gap-2.5 font-headline text-2xl sm:text-3xl font-extrabold text-ink-strong tracking-wide uppercase"><Abschnittsmarke size="lg" />Orga</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <Kachel to="/counter" icon={<CounterIcon size={20} />} titel="Counter" untertitel="Beim Umpen zählen" />
        <Kachel to="/orga/whatsapp-umfrage" icon={<SendIcon size={20} />} titel="WhatsApp-Umfragen" untertitel="Training und Spieltage" />
        <Kachel to="/orga/trainerabrechnung" icon={<Receipt size={20} />} titel="Trainerabrechnung" untertitel="Für den Hochschulsport" />
        <Kachel to="/orga/accounts" icon={<Users size={20} />} titel="Accounts" untertitel="Rollen und Rechte" />
      </div>

      <Ueberschrift>Weiteres</Ueberschrift>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <Kachel to="/kalender" icon={<CalendarIcon size={20} />} titel="Kalender" untertitel="Termine, ICS-Export" />
        <Kachel to="/orga/einladungen" icon={<Mail size={20} />} titel="Einladungen" untertitel="Für Heimspieltage" />
        {/*
          EINE Kachel, nicht zwei. Der Playmaker stand hier bis zum 31.10.2026 daneben und
          fuehrte auf dieselbe Haelfte, die im Spielwissen „Defense" heisst — zwei Namen
          fuer eine Sache, und wer die eine Kachel nahm, sah die andere Haelfte nie.
          Spielwissen hat in der Spielerleiste ohnehin einen eigenen Reiter; beim Trainer
          liegt es hier, weil er die Regeln selten nachschlaegt und ein Neuer dauernd.
        */}
        <Kachel to="/spielwissen" icon={<BookOpen size={20} />} titel="Spielwissen" untertitel="Offense und Defense" />
      </div>

      <Ueberschrift>Selten</Ueberschrift>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-w-2xl">
        <Zeile to="/spielbogen" icon={<ClipboardListIcon size={20} />} titel="Spielbogen" untertitel="Live-Scoring, RFL-Bogen" />
        {istSuperadmin && (
          <Zeile to="/orga/historie" icon={<History size={20} />} titel="Historie" untertitel="Wer was geändert hat" />
        )}
      </div>
    </div>
  )
}
