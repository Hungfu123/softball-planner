package com.softball.domain.service;

import com.softball.domain.model.Player;
import com.softball.domain.model.WhatsappVote;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Berechnet aus den WhatsApp-Stimmen einer Spieltag-Umfrage das Delta zur aktuellen
 * Anwesenheitsliste. Rein rechnend, ohne Repository- oder Sender-Zugriff.
 * <ul>
 *   <li>Anwesend ist, wer die <b>erste</b> Antwortoption gewaehlt hat (beide Vorlagen stellen
 *       die Ja-Option an Position 1).</li>
 *   <li>Zeigen zwei WhatsApp-Namen auf denselben Spieler, gewinnt ein Ja.</li>
 *   <li>Wer nicht abgestimmt hat, wird nicht angetastet.</li>
 * </ul>
 */
public class GameDayVoteMirror {

    public record OptionVoters(String option, List<String> voterNames) {}

    public record Result(List<Long> toAdd, List<Long> toRemove, List<String> unknownVoters,
                         List<OptionVoters> optionVoters, int voteCount, int yesCount) {}

    public Result compute(final List<String> pollOptions, final List<WhatsappVote> votes,
                          final Set<Long> currentlyAvailableIds, final Map<String, Player> byWhatsappName) {
        final List<String> options = pollOptions != null ? pollOptions : List.of();
        final String yesOption = options.isEmpty() ? null : normalize(options.getFirst());
        final Set<Long> currently = currentlyAvailableIds != null ? currentlyAvailableIds : Set.of();
        final Map<String, Player> players = byWhatsappName != null ? byWhatsappName : Map.of();

        final Map<Long, Boolean> yesByPlayer = new LinkedHashMap<>();
        final Set<String> unknown = new LinkedHashSet<>();
        final Map<String, List<String>> votersByOption = new LinkedHashMap<>();
        for (final String option : options) votersByOption.put(option, new ArrayList<>());

        int voteCount = 0;
        int yesCount = 0;

        for (final WhatsappVote vote : votes != null ? votes : List.<WhatsappVote>of()) {
            if (vote.voterName() == null || vote.voterName().isBlank()) continue;
            voteCount++;
            final String voterName = vote.voterName().trim();
            final boolean yes = pickedYes(vote, yesOption);
            if (yes) yesCount++;

            for (final String option : options) {
                if (contains(vote, option)) votersByOption.get(option).add(voterName);
            }

            final Player player = players.get(voterName.toLowerCase());
            if (player == null) {
                unknown.add(voterName);
                continue;
            }
            // Ein Ja gewinnt: sobald irgendeine Stimme dieses Spielers "Ja" ist, bleibt es dabei.
            yesByPlayer.merge(player.getId(), yes, (a, b) -> a || b);
        }

        final List<Long> toAdd = new ArrayList<>();
        final List<Long> toRemove = new ArrayList<>();
        yesByPlayer.forEach((playerId, yes) -> {
            if (yes && !currently.contains(playerId)) toAdd.add(playerId);
            if (!yes && currently.contains(playerId)) toRemove.add(playerId);
        });

        final List<OptionVoters> optionVoters = new ArrayList<>();
        votersByOption.forEach((option, voters) -> optionVoters.add(new OptionVoters(option, List.copyOf(voters))));

        return new Result(List.copyOf(toAdd), List.copyOf(toRemove), List.copyOf(unknown),
                List.copyOf(optionVoters), voteCount, yesCount);
    }

    private boolean pickedYes(final WhatsappVote vote, final String yesOption) {
        if (yesOption == null) return false;
        return vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && yesOption.equals(normalize(o)));
    }

    private boolean contains(final WhatsappVote vote, final String option) {
        final String wanted = normalize(option);
        return vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && wanted.equals(normalize(o)));
    }

    private String normalize(final String s) {
        return s.trim().toLowerCase();
    }
}
