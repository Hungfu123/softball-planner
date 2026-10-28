package com.softball.domain.service;

import com.softball.domain.model.GameStaff;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.StaffRole;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BaseCoachRegelTest {

    @Test void beideBasesUnbenannt_liefertDieUnterstenZwei() {
        var auskunft = BaseCoachRegel.fuer(lineup(10), List.of());
        assertThat(auskunft.ersteBase()).isNull();
        assertThat(auskunft.dritteBase()).isNull();
        assertThat(auskunft.startSchlagplaetze()).containsExactly(9, 10);
    }

    @Test void neunerAufstellung_liefertAchtUndNeun() {
        assertThat(BaseCoachRegel.fuer(lineup(9), List.of()).startSchlagplaetze()).containsExactly(8, 9);
    }

    @Test void eineBaseBenannt_liefertNurDenUntersten() {
        var auskunft = BaseCoachRegel.fuer(lineup(10), List.of(staff(StaffRole.BASE_COACH_1ST, "Jan")));
        assertThat(auskunft.ersteBase()).isEqualTo("Jan");
        assertThat(auskunft.dritteBase()).isNull();
        assertThat(auskunft.startSchlagplaetze()).containsExactly(10);
    }

    @Test void beideBasesBenannt_keineSchlagplaetze() {
        var auskunft = BaseCoachRegel.fuer(lineup(10), List.of(
            staff(StaffRole.BASE_COACH_1ST, "Jan"), staff(StaffRole.BASE_COACH_3RD, "Mike")));
        assertThat(auskunft.startSchlagplaetze()).isEmpty();
    }

    @Test void leereAufstellung_liefertNichts() {
        var auskunft = BaseCoachRegel.fuer(List.of(), List.of());
        assertThat(auskunft.ersteBase()).isNull();
        assertThat(auskunft.startSchlagplaetze()).isEmpty();
    }

    @Test void einEintrag_eineBaseBenannt_liefertGenauEinenPlatz() {
        var auskunft = BaseCoachRegel.fuer(lineup(1), List.of(staff(StaffRole.BASE_COACH_1ST, "Jan")));
        assertThat(auskunft.startSchlagplaetze()).containsExactly(1);
    }

    @Test void einEintrag_beideUnbenannt_liefertNurDiesenEinen() {
        assertThat(BaseCoachRegel.fuer(lineup(1), List.of()).startSchlagplaetze()).containsExactly(1);
    }

    @Test void unsortierteEintraege_zaehlenNachBattingOrder() {
        assertThat(BaseCoachRegel.fuer(lineupGemischt(1, 7, 4, 10, 2), List.of()).startSchlagplaetze())
            .containsExactly(7, 10);
    }

    private static List<LineupEntry> lineup(final int n) {
        final List<LineupEntry> eintraege = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            eintraege.add(eintrag(i));
        }
        return eintraege;
    }

    private static List<LineupEntry> lineupGemischt(final int... plaetze) {
        final List<LineupEntry> eintraege = new ArrayList<>();
        for (final int platz : plaetze) {
            eintraege.add(eintrag(platz));
        }
        return eintraege;
    }

    private static LineupEntry eintrag(final int platz) {
        return new LineupEntry(null, new Player("Spieler " + platz), null, platz);
    }

    private static GameStaff staff(final StaffRole rolle, final String name) {
        return new GameStaff(null, new Player(name), rolle);
    }
}
