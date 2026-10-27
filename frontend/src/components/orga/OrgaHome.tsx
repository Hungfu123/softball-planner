import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, Abschnittsmarke } from '@/components/shared'
import { SendIcon, CounterIcon, CalendarIcon, CrossBones, ClipboardListIcon } from '@/icons'
import { Mail, Receipt, ChevronRight, Users, History } from 'lucide-react'
import { useRolle } from '@/hooks/useRolle'

/**
 * Eine Kachel im Werkzeugkasten — am Handy klein und zu zweit, am Schreibtisch breit.
 *
 * Am Handy steht das Zeichen OBEN und der Name darunter: in einer halben Spalte bliebe
 * neben einem Zeichen keine Zeile fuer „WhatsApp-Umfragen" uebrig, der Name braeche auf
 * drei Zeilen. Uebereinander bekommt er die ganze Breite.
 *
 * Beschrieben wird in beiden Breiten, aber verschieden lang: am Handy drei Worte, am
 * Schreibtisch der ganze Satz. Neun volle Erklaerzeilen kosteten die Seite zweieinhalb
 * Bildschirme — ganz ohne Beschreibung sind es neun Namen, die man kennen muss. Die
 * Kurzfassung ist gekuerzt GESCHRIEBEN, nicht abgeschnitten: „Stunden eines Monats als
 * Bogen fuer den Hochsch…" ist keine Auskunft, „Stunden abrechnen" schon.
 */
function Kachel({ to, icon, titel, kurz, untertitel }: {
  to: string; icon: ReactNode; titel: string; kurz: string; untertitel: string
}) {
  return (
    <Link to={to} className="block h-full">
      <Card className="p-2.5 sm:p-5 h-full hover:border-line-strong hover:shadow-md transition-all cursor-pointer">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-accent text-accent-ink shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-display text-[11px] sm:text-sm font-extrabold uppercase tracking-wide sm:tracking-widest text-ink-strong break-words leading-tight">
              {titel}
            </div>
            <div className="text-[10px] sm:text-xs text-ink-muted mt-0.5 leading-tight sm:hidden">{kurz}</div>
            <div className="hidden sm:block text-xs text-ink-muted mt-0.5">{untertitel}</div>
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
function Zeile({ to, icon, titel, kurz, untertitel }: {
  to: string; icon: ReactNode; titel: string; kurz: string; untertitel: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl hover:bg-accent hover:text-accent-ink text-ink-strong transition-colors group"
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[11px] sm:text-sm font-extrabold uppercase tracking-wide sm:tracking-widest break-words leading-tight">{titel}</div>
        {/* Unter dem Zeiger die volle Tinte, nicht /75: auf dem dunklen Akzent fiel die
            gedeckte Variante auf 4,04:1 — der Hover-Pruefer hat es gemessen. Die Rangfolge
            zum Titel traegt hier ohnehin die Groesse und die Fettung, nicht die Helligkeit. */}
        <div className="text-[10px] sm:text-xs text-ink-muted group-hover:text-accent-ink mt-0.5 leading-tight">
          <span className="sm:hidden">{kurz}</span>
          <span className="hidden sm:inline">{untertitel}</span>
        </div>
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
        <Kachel to="/counter" icon={<CounterIcon size={20} />} titel="Counter" kurz="Beim Umpen zählen" untertitel="Balls, Strikes, Outs und Score beim Umpen" />
        <Kachel to="/orga/whatsapp-umfrage" icon={<SendIcon size={20} />} titel="WhatsApp-Umfragen" kurz="Training und Spieltage" untertitel="Abstimmungen für Trainings und Spieltage" />
        <Kachel to="/orga/trainerabrechnung" icon={<Receipt size={20} />} titel="Trainerabrechnung" kurz="Stunden abrechnen" untertitel="Stunden eines Monats als Bogen für den Hochschulsport" />
        <Kachel to="/orga/accounts" icon={<Users size={20} />} titel="Accounts" kurz="Rollen und Rechte" untertitel="Anmeldungen, Rollen und Scorer-Rechte des Kaders" />
      </div>

      <Ueberschrift>Weiteres</Ueberschrift>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <Kachel to="/kalender" icon={<CalendarIcon size={20} />} titel="Kalender" kurz="Termine im Monat" untertitel="Spieltage und Trainings im Monat, ICS-Export" />
        <Kachel to="/orga/einladungen" icon={<Mail size={20} />} titel="Einladungen" kurz="Für Heimspieltage" untertitel="Einladungsschreiben für Heimspieltage" />
        <Kachel to="/orga/playmaker" icon={<CrossBones size={20} />} titel="Playmaker" kurz="Spielzüge zeigen" untertitel="Spielsituationen bauen und als Animation zeigen" />
      </div>

      <Ueberschrift>Selten</Ueberschrift>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-w-2xl">
        <Zeile to="/spielbogen" icon={<ClipboardListIcon size={20} />} titel="Spielbogen" kurz="RFL-Bogen live" untertitel="Live-Scoring im RFL-Bogen" />
        {istSuperadmin && (
          <Zeile to="/orga/historie" icon={<History size={20} />} titel="Historie" kurz="Wer was geändert hat" untertitel="Wer zuletzt da war und was geändert wurde" />
        )}
      </div>
    </div>
  )
}
