package com.softball.domain.service;

import com.softball.domain.model.Player;
import com.softball.domain.model.WhatsappVote;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GameDayVoteMirrorTest {

    private static final List<String> AWAY_OPTIONS = List.of(
        "Ja ich will spielen", "Ich habe ein Auto und würde fahren", "Nein");

    private final GameDayVoteMirror mirror = new GameDayVoteMirror();

    private Player player(final long id, final String name, final String whatsappName) {
        final Player p = new Player(id, name, true);
        p.setWhatsappName(whatsappName);
        return p;
    }

    private Map<String, Player> byName(final Player... players) {
        return java.util.Arrays.stream(players)
            .collect(java.util.stream.Collectors.toMap(p -> p.getWhatsappName().toLowerCase(), p -> p));
    }

    @Test
    void shouldAddPlayerWhoPickedFirstOption() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Max M.", List.of("Ja ich will spielen"))),
            Set.of(), byName(max));

        assertThat(result.toAdd()).containsExactly(1L);
        assertThat(result.toRemove()).isEmpty();
        assertThat(result.yesCount()).isEqualTo(1);
    }

    @Test
    void shouldNotAddPlayerWhoOnlyOfferedACar() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of("Ich habe ein Auto und würde fahren"))),
            Set.of(), byName(ben));

        assertThat(result.toAdd()).isEmpty();
        assertThat(result.optionVoters())
            .anySatisfy(o -> {
                assertThat(o.option()).isEqualTo("Ich habe ein Auto und würde fahren");
                assertThat(o.voterNames()).containsExactly("Ben B.");
            });
    }

    @Test
    void shouldAddPlayerWhoPickedYesAndCar() {
        final Player tim = player(3L, "Tim", "Tim T.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Tim T.", List.of("Ja ich will spielen", "Ich habe ein Auto und würde fahren"))),
            Set.of(), byName(tim));

        assertThat(result.toAdd()).containsExactly(3L);
    }

    @Test
    void shouldRemoveAvailablePlayerWhoNoLongerVotesYes() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of("Nein"))),
            Set.of(2L), byName(ben));

        assertThat(result.toRemove()).containsExactly(2L);
    }

    @Test
    void shouldRemoveAvailablePlayerWhoWithdrewEveryOption() {
        final Player ben = player(2L, "Ben", "Ben B.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Ben B.", List.of())),
            Set.of(2L), byName(ben));

        assertThat(result.toRemove()).containsExactly(2L);
    }

    @Test
    void shouldLeaveNonVotersUntouched() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS, List.of(), Set.of(99L), byName(max));

        assertThat(result.toAdd()).isEmpty();
        assertThat(result.toRemove()).isEmpty();
    }

    @Test
    void shouldLetYesWinWhenTwoAliasesMapToSamePlayer() {
        final Player max = player(1L, "Max", "Max M.");
        final Map<String, Player> map = Map.of("max m.", max, "max mobil", max);
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Max Mobil", List.of("Nein")),
                    new WhatsappVote("Max M.", List.of("Ja ich will spielen"))),
            Set.of(), map);

        assertThat(result.toAdd()).containsExactly(1L);
        assertThat(result.toRemove()).isEmpty();
    }

    @Test
    void shouldListUnknownVotersAndCountAllVotes() {
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote("Sandra W.", List.of("Ja ich will spielen")),
                    new WhatsappVote("  ", List.of("Nein"))),
            Set.of(), Map.of());

        assertThat(result.unknownVoters()).containsExactly("Sandra W.");
        assertThat(result.voteCount()).isEqualTo(1);
    }

    @Test
    void shouldIgnoreCaseAndWhitespaceOnMatching() {
        final Player max = player(1L, "Max", "Max M.");
        final var result = mirror.compute(AWAY_OPTIONS,
            List.of(new WhatsappVote(" max m. ", List.of("  ja ich will spielen  "))),
            Set.of(), byName(max));

        assertThat(result.toAdd()).containsExactly(1L);
    }
}
