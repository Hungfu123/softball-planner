package com.softball.domain.service;

import com.softball.domain.model.AufstellungsLage;
import com.softball.domain.model.GameDay;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class AufstellungsLageRegelTest {

    private static Clock um(final String utc) {
        return Clock.fixed(Instant.parse(utc), ZoneOffset.UTC);
    }

    private static GameDay spieltag(final LocalDate datum, final boolean freigegeben) {
        final GameDay gameDay = new GameDay(1L, datum, "Spieltag", "Feld");
        if (freigegeben) {
            gameDay.setLineupsReleasedAt(LocalDateTime.of(2026, 7, 1, 12, 0));
        }
        return gameDay;
    }

    @Test
    void istHeuteRechnetNachBerlinerKalenderNichtNachUtc() {
        // 23:30 UTC am 3.7. ist 01:30 am 4.7. in Berlin — das UTC-Datum waere gestern.
        final Clock nachMitternachtBerlin = um("2026-07-03T23:30:00Z");

        assertThat(AufstellungsLageRegel.istHeute(spieltag(LocalDate.of(2026, 7, 4), false), nachMitternachtBerlin)).isTrue();
        assertThat(AufstellungsLageRegel.istHeute(spieltag(LocalDate.of(2026, 7, 3), false), nachMitternachtBerlin)).isFalse();
    }

    @Test
    void istHeuteGiltAuchFuerEinenFreigegebenenSpieltagVorSieben() {
        final GameDay gameDay = spieltag(LocalDate.of(2026, 7, 4), true);
        final Clock vorSieben = um("2026-07-04T04:59:00Z"); // 06:59 Berlin

        // Genau hier reicht die Lage nicht: sie traegt FREIGEGEBEN wie ein kuenftiger Spieltag.
        assertThat(AufstellungsLageRegel.lage(gameDay, vorSieben)).isEqualTo(AufstellungsLage.FREIGEGEBEN);
        assertThat(AufstellungsLageRegel.istHeute(gameDay, vorSieben)).isTrue();
    }

    @Test
    void istHeuteIstFalschFuerKuenftigeUndVergangeneSpieltage() {
        final Clock jetzt = um("2026-07-04T10:00:00Z");

        assertThat(AufstellungsLageRegel.istHeute(spieltag(LocalDate.of(2026, 7, 5), true), jetzt)).isFalse();
        assertThat(AufstellungsLageRegel.istHeute(spieltag(LocalDate.of(2026, 7, 3), true), jetzt)).isFalse();
    }

    @Test
    void standTraegtLageUndIstHeuteAusEinemZeitpunkt() {
        final GameDay gameDay = spieltag(LocalDate.of(2026, 7, 4), true);

        final var vorSieben = AufstellungsLageRegel.stand(gameDay, um("2026-07-04T04:59:00Z"));
        assertThat(vorSieben.lage()).isEqualTo(AufstellungsLage.FREIGEGEBEN);
        assertThat(vorSieben.istHeute()).isTrue();

        final var gestern = AufstellungsLageRegel.stand(gameDay, um("2026-07-05T10:00:00Z"));
        assertThat(gestern.lage()).isEqualTo(AufstellungsLage.OFFEN_VERGANGEN);
        assertThat(gestern.istHeute()).isFalse();
    }
}
