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
 *   <li>freigegeben -> {@code FREIGEGEBEN}</li>
 *   <li>heute, ab 07:00 -> {@code OFFEN_AB_SIEBEN}</li>
 *   <li>heute, vor 07:00 -> {@code HEUTE_VOR_SIEBEN}</li>
 *   <li>sonst -> {@code GESPERRT}</li>
 * </ol>
 *
 * <p>Berlin kommt NUR hier vor: der Zeitpunkt der {@link Clock} wird ausdruecklich umgerechnet,
 * die Zone des Containers spielt keine Rolle und wird nirgends umgestellt (viele Spalten sind
 * {@code TIMESTAMP} ohne Zone, jede historische Zeit wuerde sich verschieben).
 */
public final class AufstellungsLageRegel {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final LocalTime SCHWELLE = LocalTime.of(7, 0);

    private AufstellungsLageRegel() {}

    public static AufstellungsLage lage(final GameDay gameDay, final Clock clock) {
        final ZonedDateTime jetzt = clock.instant().atZone(BERLIN);
        final LocalDate heute = jetzt.toLocalDate();
        final LocalDate datum = gameDay.getDate();
        if (datum != null && datum.isBefore(heute)) {
            return AufstellungsLage.OFFEN_VERGANGEN;
        }
        if (gameDay.getLineupsReleasedAt() != null) {
            return AufstellungsLage.FREIGEGEBEN;
        }
        if (datum != null && datum.equals(heute)) {
            return jetzt.toLocalTime().isBefore(SCHWELLE)
                    ? AufstellungsLage.HEUTE_VOR_SIEBEN
                    : AufstellungsLage.OFFEN_AB_SIEBEN;
        }
        return AufstellungsLage.GESPERRT;
    }
}
