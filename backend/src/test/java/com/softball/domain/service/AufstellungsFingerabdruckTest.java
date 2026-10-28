package com.softball.domain.service;

import com.softball.domain.model.Game;
import com.softball.domain.model.GameStaff;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.Position;
import com.softball.domain.model.StaffRole;
import com.softball.domain.model.Substitution;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AufstellungsFingerabdruckTest {

    private static Game spiel(final long id) {
        final Game game = new Game();
        game.setId(id);
        return game;
    }

    private static Player spieler(final long id) {
        return new Player(id, "Spieler " + id, true);
    }

    private static LineupEntry eintrag(final Game game, final long spielerId, final Position position,
                                       final int schlagplatz) {
        return new LineupEntry(game, spieler(spielerId), position, schlagplatz);
    }

    private static List<LineupEntry> grundAufstellung() {
        final Game game = spiel(1);
        return new ArrayList<>(List.of(
            eintrag(game, 10, Position.P, 1),
            eintrag(game, 11, Position.C, 2),
            eintrag(game, 12, Position.SS, 3),
            eintrag(game, 13, Position.LF, 4)));
    }

    private static String abdruck(final List<LineupEntry> lineup) {
        return AufstellungsFingerabdruck.von(lineup, List.of(), List.of());
    }

    @Test
    void gleicheAufstellungGleicherAbdruck() {
        final List<LineupEntry> vorwaerts = grundAufstellung();
        final List<LineupEntry> umsortiert = grundAufstellung();
        Collections.reverse(umsortiert);

        assertThat(abdruck(umsortiert)).isEqualTo(abdruck(vorwaerts));
    }

    @Test
    void gleicheStaffUndAuswechslungenInAndererReihenfolgeGleicherAbdruck() {
        final Game game = spiel(1);
        final GameStaff erster = new GameStaff(game, spieler(20), StaffRole.BASE_COACH_1ST);
        final GameStaff dritter = new GameStaff(game, spieler(21), StaffRole.BASE_COACH_3RD);
        final Substitution fruehe = new Substitution(game, spieler(10), spieler(30), 2);
        final Substitution spaete = new Substitution(game, spieler(11), spieler(31), 4);

        final String a = AufstellungsFingerabdruck.von(grundAufstellung(), List.of(erster, dritter), List.of(fruehe, spaete));
        final String b = AufstellungsFingerabdruck.von(grundAufstellung(), List.of(dritter, erster), List.of(spaete, fruehe));

        assertThat(b).isEqualTo(a);
    }

    @Test
    void andererSchlagplatzAndererAbdruck() {
        final List<LineupEntry> getauscht = grundAufstellung();
        getauscht.get(2).setBattingOrder(4);
        getauscht.get(3).setBattingOrder(3);

        assertThat(abdruck(getauscht)).isNotEqualTo(abdruck(grundAufstellung()));
    }

    @Test
    void anderePositionAndererAbdruck() {
        final List<LineupEntry> geaendert = grundAufstellung();
        geaendert.get(3).setPosition(Position.RF);

        assertThat(abdruck(geaendert)).isNotEqualTo(abdruck(grundAufstellung()));
    }

    @Test
    void einAndererDhBatterAndererAbdruck() {
        final List<LineupEntry> mitDh = grundAufstellung();
        mitDh.get(3).setDhBatterPlayer(spieler(40));

        assertThat(abdruck(mitDh)).isNotEqualTo(abdruck(grundAufstellung()));
    }

    @Test
    void einEntfernterEintragAendertDenAbdruck() {
        final List<LineupEntry> kuerzer = grundAufstellung();
        kuerzer.remove(3);

        assertThat(abdruck(kuerzer)).isNotEqualTo(abdruck(grundAufstellung()));
    }

    @Test
    void einGeaenderterCoachAendertDenAbdruck() {
        final Game game = spiel(1);
        final String mitErstem = AufstellungsFingerabdruck.von(grundAufstellung(),
            List.of(new GameStaff(game, spieler(20), StaffRole.BASE_COACH_1ST)), List.of());
        final String mitAnderem = AufstellungsFingerabdruck.von(grundAufstellung(),
            List.of(new GameStaff(game, spieler(21), StaffRole.BASE_COACH_1ST)), List.of());
        final String ohne = abdruck(grundAufstellung());

        assertThat(mitAnderem).isNotEqualTo(mitErstem);
        assertThat(mitErstem).isNotEqualTo(ohne);
    }

    @Test
    void eineGeaenderteAuswechslungAendertDenAbdruck() {
        final Game game = spiel(1);
        final String inning2 = AufstellungsFingerabdruck.von(grundAufstellung(), List.of(),
            List.of(new Substitution(game, spieler(10), spieler(30), 2)));
        final String inning3 = AufstellungsFingerabdruck.von(grundAufstellung(), List.of(),
            List.of(new Substitution(game, spieler(10), spieler(30), 3)));

        assertThat(inning3).isNotEqualTo(inning2);
    }

    @Test
    void dieselbeAufstellungInAnderemSpielAendertDenAbdruck() {
        final List<LineupEntry> spielEins = List.of(eintrag(spiel(1), 10, Position.P, 1));
        final List<LineupEntry> spielZwei = List.of(eintrag(spiel(2), 10, Position.P, 1));

        assertThat(abdruck(spielZwei)).isNotEqualTo(abdruck(spielEins));
    }

    @Test
    void leereAufstellungGibtEinenStabilenAbdruck() {
        final String leer = AufstellungsFingerabdruck.von(List.of(), List.of(), List.of());

        assertThat(leer).isNotNull().isNotEmpty().hasSize(64);
        assertThat(AufstellungsFingerabdruck.von(new ArrayList<>(), new ArrayList<>(), new ArrayList<>())).isEqualTo(leer);
    }
}
