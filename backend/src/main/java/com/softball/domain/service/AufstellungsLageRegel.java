package com.softball.domain.service;

import com.softball.domain.model.AufstellungsLage;
import com.softball.domain.model.GameDay;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Wo ein Spieltag auf dem Weg zur sichtbaren Aufstellung steht — fuer jeden Betrachter gleich.
 * Wer sie dann sehen darf, entscheidet die Sicherheitsschicht; diese Regel kennt keine Rolle.
 *
 * <p>Der Trainer baut die Aufstellung tagelang um, dabei soll keiner zusehen; steht sie, gibt
 * er sie frei. Vergisst er das, steht sie am Spieltag trotzdem da — ab morgens, nicht ab
 * Mitternacht, denn um Mitternacht baut er unter Umstaenden noch um. Das ist KEINE automatische
 * Freigabe: {@code lineupsReleasedAt} bleibt leer.
 *
 * <p>Geprueft wird in dieser Reihenfolge, und sie ist Teil der Bedeutung:
 * <ol>
 *   <li>{@code date < heute} -> {@code OFFEN_VERGANGEN}: ein gespieltes Spiel ist Geschichte,
 *       keine Planung. Das steht VOR der Freigabe, damit ein vergangener, freigegebener
 *       Spieltag nicht als {@code FREIGEGEBEN} gilt (er bliebe fuer Spieler fuer immer der
 *       "naechste" Spieltag).</li>
 *   <li>heute, ab 07:00 -> {@code OFFEN_AB_SIEBEN} (auch wenn freigegeben)</li>
 *   <li>freigegeben -> {@code FREIGEGEBEN}</li>
 *   <li>heute, vor 07:00 -> {@code HEUTE_VOR_SIEBEN}</li>
 *   <li>sonst -> {@code GESPERRT}</li>
 * </ol>
 *
 * <p>Die Lage sagt, WARUM etwas sichtbar ist. Ist es sichtbar, weil der Tag da ist, schlaegt das
 * "weil freigegeben wurde": nur in der ersten Lesart ist die Freigabe folgenlos, und nur so
 * bietet die Oberflaeche keinen "zuruecknehmen"-Knopf an, der nichts bewirkt (und dessen
 * Rueckfrage, die Aufstellung verschwinde wieder, luege). Bewusst verloren geht dabei: am
 * Spieltag ab 07:00 hat die Oberflaeche keine Freigabe-Lage mehr, an der sie "seit der Freigabe
 * geaendert" haengen koennte — ab dann
 * sehen ohnehin alle den Live-Stand, das ist die Praemisse des Vorhabens. Nicht zurueckbauen.
 *
 * <p>Berlin kommt NUR hier vor: der Zeitpunkt der {@link Clock} wird ausdruecklich umgerechnet,
 * die Zone des Containers spielt keine Rolle und wird nirgends umgestellt (viele Spalten sind
 * {@code TIMESTAMP} ohne Zone, jede historische Zeit wuerde sich verschieben).
 */
public final class AufstellungsLageRegel {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final LocalTime SCHWELLE = LocalTime.of(7, 0);

    private AufstellungsLageRegel() {}

    /**
     * Ob der Spieltag nach Berliner Kalender heute ist. Die Lage kann das nicht sagen: ein
     * heutiger, freigegebener Spieltag vor 07:00 traegt {@code FREIGEGEBEN}, genau wie ein
     * kuenftiger. Der Browser darf es nicht selbst rechnen (er kennt weder Berlin noch die Uhr
     * des Servers), deshalb steht es in derselben Regel und derselben Uhr wie die Lage.
     */
    public static boolean istHeute(final GameDay gameDay, final Clock clock) {
        return stand(gameDay, clock).istHeute();
    }

    public static AufstellungsLage lage(final GameDay gameDay, final Clock clock) {
        return stand(gameDay, clock).lage();
    }

    /**
     * Beides aus EINEM gelesenen Zeitpunkt: wer {@link #lage} und {@link #istHeute} nacheinander
     * fragt, liest die Uhr zweimal, und um Mitternacht oder 07:00 behauptete eine Antwort zwei
     * verschiedene Zeitpunkte. Antworten, die beides tragen, nehmen diese Methode.
     */
    public static Stand stand(final GameDay gameDay, final Clock clock) {
        final ZonedDateTime jetzt = berlinJetzt(clock);
        final LocalDate heute = jetzt.toLocalDate();
        final LocalDate datum = gameDay.getDate();
        final boolean heuteSpieltag = datum != null && datum.equals(heute);
        if (datum != null && datum.isBefore(heute)) {
            return new Stand(AufstellungsLage.OFFEN_VERGANGEN, false);
        }
        if (heuteSpieltag && !jetzt.toLocalTime().isBefore(SCHWELLE)) {
            return new Stand(AufstellungsLage.OFFEN_AB_SIEBEN, true);
        }
        if (gameDay.getLineupsReleasedAt() != null) {
            return new Stand(AufstellungsLage.FREIGEGEBEN, heuteSpieltag);
        }
        return new Stand(heuteSpieltag ? AufstellungsLage.HEUTE_VOR_SIEBEN : AufstellungsLage.GESPERRT, heuteSpieltag);
    }

    public record Stand(AufstellungsLage lage, boolean istHeute) {}

    /** Die einzige Stelle, die die Uhr liest — zwei Lesarten derselben Uhr koennten auseinanderlaufen. */
    private static ZonedDateTime berlinJetzt(final Clock clock) {
        return clock.instant().atZone(BERLIN);
    }
}
