package com.softball.application;

import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditQuery;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AuditEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Die Obergrenze des Verlaufs. Ohne sie haengt eine Abfrage ohne Zeitraum an der ganzen
 * Aufbewahrung von zwoelf Monaten — und die Antwort koennte nicht einmal sagen, dass sie
 * unvollstaendig ist.
 */
class AuditServiceDeckelTest {

    private static final Instant ANKER = Instant.parse("2026-10-29T12:00:00Z");

    private AuditEventRepository repository;
    private AuditService service;

    @BeforeEach
    void setUp() {
        repository = mock(AuditEventRepository.class);
        final AppUserRepository appUsers = mock(AppUserRepository.class);
        final PlayerRepository players = mock(PlayerRepository.class);
        when(appUsers.findAll()).thenReturn(List.of());
        when(players.findAll()).thenReturn(List.of());
        service = new AuditService(repository, appUsers, players, Clock.fixed(ANKER, ZoneOffset.UTC));
    }

    @Test
    void fragtEineZeileMehrAnAlsSieZeigt() {
        when(repository.find(any(), anyInt())).thenReturn(List.of());

        service.verlauf(alles());

        // Der Unterschied zwischen "genau aufgegangen" und "da war noch was" laesst sich ohne
        // zweite Abfrage nur so feststellen.
        final ArgumentCaptor<Integer> grenze = ArgumentCaptor.forClass(Integer.class);
        verify(repository).find(any(), grenze.capture());
        assertThat(grenze.getValue()).isEqualTo(AuditService.HOECHSTENS + 1);
    }

    @Test
    void genauAufDerGrenzeGiltAlsVollstaendig() {
        when(repository.find(any(), anyInt())).thenReturn(ereignisse(AuditService.HOECHSTENS));

        final AuditService.Verlauf verlauf = service.verlauf(alles());

        assertThat(verlauf.abgeschnitten()).isFalse();
        assertThat(verlauf.bisZurueck()).isNull();
        assertThat(verlauf.zeilen()).hasSize(AuditService.HOECHSTENS);
    }

    @Test
    void eineZeileDarueberGiltAlsAbgeschnitten() {
        when(repository.find(any(), anyInt())).thenReturn(ereignisse(AuditService.HOECHSTENS + 1));

        final AuditService.Verlauf verlauf = service.verlauf(alles());

        assertThat(verlauf.abgeschnitten()).isTrue();
        assertThat(verlauf.zeilen()).hasSize(AuditService.HOECHSTENS);
        // Die Ausserste gelieferte Zeile ist die aelteste — davor faengt das Ungezeigte an.
        assertThat(verlauf.bisZurueck()).isEqualTo(ANKER.minusSeconds(AuditService.HOECHSTENS - 1));
    }

    private static AuditQuery alles() {
        return new AuditQuery(null, null, null, null);
    }

    /** Neueste zuerst, je eine Sekunde auseinander — so liefert es auch das Repository. */
    private static List<AuditEvent> ereignisse(final int n) {
        final List<AuditEvent> liste = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            liste.add(new AuditEvent((long) i, null, "hung", AuditKind.WRITE, "PUT", "/api/ding",
                    "Etwas geaendert", null, null, 200, ANKER.minusSeconds(i)));
        }
        return liste;
    }
}
