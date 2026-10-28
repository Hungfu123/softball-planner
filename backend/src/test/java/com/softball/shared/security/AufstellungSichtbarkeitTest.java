package com.softball.shared.security;

import com.softball.domain.model.AufstellungsLage;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AufstellungSichtbarkeitTest {

    private final ScoringPermission scoring = mock(ScoringPermission.class);
    private final GameDayRepository gameDayRepository = mock(GameDayRepository.class);
    private final GameRepository gameRepository = mock(GameRepository.class);

    @AfterEach
    void aufraeumen() {
        SecurityContextHolder.clearContext();
    }

    private AufstellungSichtbarkeit zu(final String utc) {
        final Clock uhr = Clock.fixed(Instant.parse(utc), ZoneOffset.UTC);
        return new AufstellungSichtbarkeit(scoring, gameDayRepository, gameRepository, uhr);
    }

    private static GameDay spieltag(final LocalDate datum) {
        final GameDay gameDay = new GameDay();
        gameDay.setId(1L);
        gameDay.setDate(datum);
        return gameDay;
    }

    private static GameDay freigegeben(final LocalDate datum) {
        final GameDay gameDay = spieltag(datum);
        gameDay.setLineupsReleasedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
        return gameDay;
    }

    private static void angemeldetAls(final String rolle) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            "x", "x", AuthorityUtils.createAuthorityList("ROLE_" + rolle)));
    }

    @Test
    void sechsUhrNeunundfuenfzigBerlinImSommer_istNochGesperrt() {
        assertThat(zu("2026-07-04T04:59:00Z").lage(spieltag(LocalDate.of(2026, 7, 4))))
            .isEqualTo(AufstellungsLage.HEUTE_VOR_SIEBEN);
    }

    @Test
    void siebenUhrEinsBerlinImSommer_istOffen() {
        assertThat(zu("2026-07-04T05:01:00Z").lage(spieltag(LocalDate.of(2026, 7, 4))))
            .isEqualTo(AufstellungsLage.OFFEN_AB_SIEBEN);
    }

    @Test
    void sechsUhrNeunundfuenfzigBerlinImWinter_istNochGesperrt() {
        assertThat(zu("2026-01-10T05:59:00Z").lage(spieltag(LocalDate.of(2026, 1, 10))))
            .isEqualTo(AufstellungsLage.HEUTE_VOR_SIEBEN);
    }

    @Test
    void siebenUhrEinsBerlinImWinter_istOffen() {
        assertThat(zu("2026-01-10T06:01:00Z").lage(spieltag(LocalDate.of(2026, 1, 10))))
            .isEqualTo(AufstellungsLage.OFFEN_AB_SIEBEN);
    }

    @Test
    void genauSiebenUhrBerlin_istOffen() {
        assertThat(zu("2026-07-04T05:00:00Z").lage(spieltag(LocalDate.of(2026, 7, 4))))
            .isEqualTo(AufstellungsLage.OFFEN_AB_SIEBEN);
    }

    @Test
    void kurzNachMitternachtBerlin_gehoertSchonZumSpieltag() {
        // 22:30 UTC ist in Berlin (UTC+2) schon 00:30 am 5.7.
        final AufstellungSichtbarkeit regel = zu("2026-07-04T22:30:00Z");
        assertThat(regel.lage(spieltag(LocalDate.of(2026, 7, 5)))).isEqualTo(AufstellungsLage.HEUTE_VOR_SIEBEN);
        assertThat(regel.lage(spieltag(LocalDate.of(2026, 7, 4)))).isEqualTo(AufstellungsLage.OFFEN_VERGANGEN);
    }

    @Test
    void vergangenerSpieltag_istOffenEgalWieSpaet() {
        assertThat(zu("2026-07-04T00:30:00Z").lage(spieltag(LocalDate.of(2026, 7, 3))))
            .isEqualTo(AufstellungsLage.OFFEN_VERGANGEN);
        assertThat(zu("2026-07-04T23:30:00Z").lage(spieltag(LocalDate.of(2026, 6, 1))))
            .isEqualTo(AufstellungsLage.OFFEN_VERGANGEN);
    }

    @Test
    void vergangenUndFreigegeben_istVergangen() {
        assertThat(zu("2026-07-04T10:00:00Z").lage(freigegeben(LocalDate.of(2026, 7, 3))))
            .isEqualTo(AufstellungsLage.OFFEN_VERGANGEN);
    }

    @Test
    void freigegebenHeuteVorSiebenUndKuenftig_istFreigegeben() {
        final AufstellungSichtbarkeit regel = zu("2026-07-04T04:59:00Z"); // 06:59 Berlin
        assertThat(regel.lage(freigegeben(LocalDate.of(2026, 7, 4)))).isEqualTo(AufstellungsLage.FREIGEGEBEN);
        assertThat(regel.lage(freigegeben(LocalDate.of(2026, 7, 11)))).isEqualTo(AufstellungsLage.FREIGEGEBEN);
    }

    @Test
    void freigegebenHeuteAbSieben_istOffenAbSieben() {
        assertThat(zu("2026-07-04T05:01:00Z").lage(freigegeben(LocalDate.of(2026, 7, 4))))
            .isEqualTo(AufstellungsLage.OFFEN_AB_SIEBEN);
        assertThat(zu("2026-01-10T06:01:00Z").lage(freigegeben(LocalDate.of(2026, 1, 10))))
            .isEqualTo(AufstellungsLage.OFFEN_AB_SIEBEN);
    }

    @Test
    void kuenftigNichtFreigegeben_istGesperrt() {
        assertThat(zu("2026-07-04T10:00:00Z").lage(spieltag(LocalDate.of(2026, 7, 5))))
            .isEqualTo(AufstellungsLage.GESPERRT);
    }

    @Test
    void trainerSiehtImmerOhneDatenbank() {
        angemeldetAls(Role.ADMIN.name());
        final AufstellungSichtbarkeit regel = zu("2026-07-04T10:00:00Z");

        assertThat(regel.darfSehen(1L)).isTrue();
        assertThat(regel.darfSehenFuerSpiel(1L)).isTrue();
        assertThat(regel.filter().test(spieltag(LocalDate.of(2026, 7, 11)))).isTrue();
        verifyNoInteractions(gameDayRepository, gameRepository, scoring);
    }

    @Test
    void darfSehenFuerSpielFolgtDerLageDesSpieltagsEinesNichtTrainers() {
        angemeldetAls(Role.PLAYER.name());
        when(scoring.darfSchreiben(any())).thenReturn(false);
        when(gameRepository.findGameDayIdByGameId(7L)).thenReturn(Optional.of(1L));
        when(gameRepository.findGameDayIdByGameId(8L)).thenReturn(Optional.empty());
        final AufstellungSichtbarkeit regel = zu("2026-07-04T10:00:00Z");

        when(gameDayRepository.findById(1L)).thenReturn(Optional.of(spieltag(LocalDate.of(2026, 7, 11))));
        assertThat(regel.darfSehenFuerSpiel(7L)).isFalse();

        when(gameDayRepository.findById(1L)).thenReturn(Optional.of(freigegeben(LocalDate.of(2026, 7, 11))));
        assertThat(regel.darfSehenFuerSpiel(7L)).isTrue();

        assertThat(regel.darfSehenFuerSpiel(8L)).isFalse();
        assertThat(regel.darfSehenFuerSpiel(null)).isFalse();
    }

    @Test
    void scorerSiehtDenHeutigenSpieltagAuchVorSieben() {
        angemeldetAls(Role.PLAYER.name());
        when(scoring.darfSchreiben(any())).thenReturn(true);

        assertThat(zu("2026-07-04T04:00:00Z").filter().test(spieltag(LocalDate.of(2026, 7, 4)))).isTrue();
    }

    @Test
    void scorerSiehtKuenftigenNichtFreigegebenenSpieltagNicht() {
        angemeldetAls(Role.PLAYER.name());
        when(scoring.darfSchreiben(any())).thenReturn(true);
        final GameDay naechsteWoche = spieltag(LocalDate.of(2026, 7, 11));
        when(gameDayRepository.findById(1L)).thenReturn(Optional.of(naechsteWoche));
        final AufstellungSichtbarkeit regel = zu("2026-07-04T10:00:00Z");

        assertThat(regel.filter().test(naechsteWoche)).isFalse();
        assertThat(regel.darfSehen(1L)).isFalse();
    }

    @Test
    void spielerSiehtHeuteErstAbSieben() {
        angemeldetAls(Role.PLAYER.name());
        when(scoring.darfSchreiben(any())).thenReturn(false);
        final GameDay heute = spieltag(LocalDate.of(2026, 7, 4));

        assertThat(zu("2026-07-04T04:59:00Z").filter().test(heute)).isFalse();
        assertThat(zu("2026-07-04T05:01:00Z").filter().test(heute)).isTrue();
    }

    @Test
    void filterFragtDieDatenbankNichtUndDasScorerRechtNurEinmal() {
        angemeldetAls(Role.PLAYER.name());
        when(scoring.darfSchreiben(any())).thenReturn(true);
        final var filter = zu("2026-07-04T10:00:00Z").filter();

        for (int i = 0; i < 5; i++) {
            filter.test(spieltag(LocalDate.of(2026, 7, 11)));
        }

        verifyNoInteractions(gameDayRepository, gameRepository);
        org.mockito.Mockito.verify(scoring, org.mockito.Mockito.times(1)).darfSchreiben(any());
    }
}
