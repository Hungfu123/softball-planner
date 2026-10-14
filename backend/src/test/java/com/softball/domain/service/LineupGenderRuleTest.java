package com.softball.domain.service;

import com.softball.domain.model.Gender;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.Position;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LineupGenderRuleTest {

    private LineupGenderRule rule;
    private long nextId;

    @BeforeEach
    void setUp() {
        rule = new LineupGenderRule();
        nextId = 1;
    }

    private LineupEntry entry(final Gender gender, final Position position) {
        final Player player = new Player(nextId, "Spieler " + nextId, true);
        nextId++;
        player.setGender(gender);
        final LineupEntry e = new LineupEntry();
        e.setPlayer(player);
        e.setPosition(position);
        return e;
    }

    @Test
    void twoWomenWithOneInInfield_noWarning() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.SS),
            entry(Gender.FEMALE, Position.LF),
            entry(Gender.MALE, Position.P));

        assertThat(rule.check(lineup)).isEmpty();
    }

    @Test
    void catcherCountsAsInfield() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.C),
            entry(Gender.FEMALE, Position.RF));

        assertThat(rule.check(lineup)).isEmpty();
    }

    @Test
    void onlyOutfieldWomen_missInfield() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.LF),
            entry(Gender.FEMALE, Position.CF));

        assertThat(rule.check(lineup)).singleElement().asString().contains("Infield");
    }

    @Test
    void oneWomanOnly_bothCountsTooLow() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.LF),
            entry(Gender.MALE, Position.SS));

        assertThat(rule.check(lineup)).hasSize(2);
        assertThat(rule.count(lineup).onField()).isEqualTo(1);
    }

    @Test
    void extraHitterDoesNotCount() {
        // EH schlägt nur — sie steht nicht auf dem Feld.
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.SS),
            entry(Gender.FEMALE, Position.EH));

        assertThat(rule.count(lineup).onField()).isEqualTo(1);
        assertThat(rule.check(lineup)).anySatisfy(w -> assertThat(w).contains("Nur eine Frau"));
    }

    @Test
    void dhBatterDoesNotCount() {
        // Der DH-Batter steht als Annotation am Feldspieler und spielt kein Feld.
        final LineupEntry host = entry(Gender.MALE, Position.FIRST_BASE);
        final Player dhBatter = new Player(99L, "DH", true);
        dhBatter.setGender(Gender.FEMALE);
        host.setDhBatterPlayer(dhBatter);

        final List<LineupEntry> lineup = List.of(host, entry(Gender.FEMALE, Position.SS));

        assertThat(rule.count(lineup).onField()).isEqualTo(1);
    }

    @Test
    void unassignedGenderCountsForNobody() {
        final List<LineupEntry> lineup = new ArrayList<>(List.of(
            entry(null, Position.SS),
            entry(null, Position.LF)));

        assertThat(rule.count(lineup).onField()).isZero();
        assertThat(rule.check(lineup)).hasSize(2);
    }

    @Test
    void whenTooFewWomenAreThere_theHintSaysSoInsteadOfDemandingAFix() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.SS),
            entry(Gender.MALE, Position.LF));

        assertThat(rule.check(lineup, 1)).singleElement().asString()
            .contains("Heute ist nur eine Frau dabei");
    }

    @Test
    void withEnoughWomenAvailable_theHintAsksForAFix() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.SS),
            entry(Gender.MALE, Position.LF));

        assertThat(rule.check(lineup, 3)).singleElement().asString()
            .contains("Nur eine Frau auf dem Feld");
    }

    @Test
    void batterWithoutPositionDoesNotCount() {
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, null),
            entry(Gender.FEMALE, Position.SS));

        assertThat(rule.count(lineup).onField()).isEqualTo(1);
    }

    @Test
    void diverseDoesNotCountForTheWomensQuota() {
        // Die Liga-Regel spricht von Frauen — was fuer "divers" gilt, entscheidet
        // der Verband, nicht diese App. Bis dahin zaehlt die Angabe nicht mit.
        final List<LineupEntry> lineup = List.of(
            entry(Gender.FEMALE, Position.SS),
            entry(Gender.DIVERSE, Position.LF));

        assertThat(rule.count(lineup).onField()).isEqualTo(1);
        assertThat(rule.check(lineup)).anySatisfy(w -> assertThat(w).contains("Nur eine Frau"));
    }
}
