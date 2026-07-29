package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.domain.service.GameDayVoteMirror;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Holt die Stimmen der Spieltag-Umfrage und berechnet daraus das Delta zur Anwesenheitsliste.
 * Schreibt selbst NIE in {@code availablePlayers} — das macht erst {@code apply} ueber
 * {@code AvailabilityService}, weil dort die destruktive Kaskade (Lineup, Staff) haengt.
 */
@Service
public class GameDayVoteSyncService {

    private static final Logger log = LoggerFactory.getLogger(GameDayVoteSyncService.class);

    public record PlayerRef(Long id, String name) {}
    public record Removal(Long playerId, String playerName, List<String> warnings) {}
    public record Preview(boolean pollExists, boolean sent, List<PlayerRef> toAdd, List<Removal> toRemove,
                          List<GameDayVoteMirror.OptionVoters> optionVoters, List<String> unknownVoters,
                          int voteCount, int yesCount) {}

    private final WhatsappPollRepository pollRepo;
    private final WhatsappSender sender;
    private final GameDayRepository gameDayRepo;
    private final PlayerRepository playerRepo;
    private final SyncedVoteRepository voteRepo;
    private final LineupEntryRepository lineupRepo;
    private final GameStaffRepository staffRepo;
    private final AvailabilityService availabilityService;
    private final GameDayVoteMirror mirror = new GameDayVoteMirror();

    public GameDayVoteSyncService(final WhatsappPollRepository pollRepo, final WhatsappSender sender,
                                  final GameDayRepository gameDayRepo, final PlayerRepository playerRepo,
                                  final SyncedVoteRepository voteRepo, final LineupEntryRepository lineupRepo,
                                  final GameStaffRepository staffRepo, final AvailabilityService availabilityService) {
        this.pollRepo = pollRepo; this.sender = sender; this.gameDayRepo = gameDayRepo;
        this.playerRepo = playerRepo; this.voteRepo = voteRepo; this.lineupRepo = lineupRepo;
        this.staffRepo = staffRepo; this.availabilityService = availabilityService;
    }

    @Transactional
    public Preview fetchAndPreview(final Long gameDayId) {
        final WhatsappPoll poll = pollRepo.findByGameDayId(gameDayId)
            .orElseThrow(() -> new BusinessValidationException("Für diesen Spieltag gibt es keine Umfrage"));
        if (poll.getLastSentMessageId() == null) {
            throw new BusinessValidationException("Die Umfrage wurde noch nicht gesendet");
        }
        if (!sender.status().connected()) {
            // fetchVotes schluckt Fehler und liefert eine leere Liste — ohne diese Pruefung
            // waere "Sidecar tot" nicht von "niemand hat abgestimmt" zu unterscheiden.
            throw new BusinessValidationException("WhatsApp ist nicht verbunden — Stimmen konnten nicht abgerufen werden");
        }

        final GameDay gameDay = loadGameDay(gameDayId);
        final Map<String, Player> byName = playersByWhatsappName();
        final List<WhatsappVote> votes = sender.fetchVotes(poll.getLastSentMessageId());
        final Set<Long> available = gameDay.getAvailablePlayers().stream().map(Player::getId).collect(Collectors.toSet());

        final GameDayVoteMirror.Result result = mirror.compute(poll.getOptions(), votes, available, byName);
        // Waehlt eine Stimme mindestens eine Option, die zu KEINER aktuellen Antwortoption passt,
        // wurden die Optionstexte vermutlich nach dem Versand geändert (z.B. Tippfehler korrigiert)
        // — sonst würde dieser Voter fälschlich als "abgesagt" (toRemove) erscheinen und beim
        // Uebernehmen die Kaskade (Lineup, DH, Staff) auslösen. Eine leere Optionsliste (echte
        // Stimmruecknahme) zaehlt nicht als Drift, siehe GameDayVoteMirror.hasUnmatchedOption.
        if (!result.unmatchedVoters().isEmpty()) {
            throw new BusinessValidationException(
                "Die Antwortoptionen passen nicht zu den abgegebenen Stimmen — wurden sie nach dem Versand geändert? Betroffen: "
                    + String.join(", ", result.unmatchedVoters()));
        }
        persist(gameDayId, votes, byName, poll.getOptions());
        log.info("Spieltag {}: {} Stimmen abgerufen, +{} / -{}", gameDayId, result.voteCount(),
                result.toAdd().size(), result.toRemove().size());
        return toPreview(gameDay, result, true);
    }

    @Transactional(readOnly = true)
    public Preview stored(final Long gameDayId) {
        final Optional<WhatsappPoll> poll = pollRepo.findByGameDayId(gameDayId);
        final List<SyncedVote> stored = voteRepo.findByGameDayId(gameDayId);
        final List<String> unknown = stored.stream().filter(v -> v.getPlayerId() == null)
            .map(SyncedVote::getVoterName).toList();
        return new Preview(poll.isPresent(), poll.map(p -> p.getLastSentMessageId() != null).orElse(false),
                List.of(), List.of(), List.of(), unknown, stored.size(),
                (int) stored.stream().filter(SyncedVote::isPresent).count());
    }

    /**
     * Rechnet das Vorschau-Delta auf die AKTUELLE Anwesenheitsliste (nicht auf die aus der
     * Vorschau), damit parallele Aenderungen in einem anderen Tab nicht ueberschrieben werden.
     */
    @Transactional
    public GameDay apply(final Long gameDayId, final List<Long> add, final List<Long> remove) {
        final List<Long> toAdd = add != null ? add : List.of();
        final List<Long> toRemove = remove != null ? remove : List.of();
        final Set<Long> overlap = new HashSet<>(toAdd);
        overlap.retainAll(toRemove);
        if (!overlap.isEmpty()) {
            throw new BusinessValidationException("Spieler kann nicht gleichzeitig hinzugefügt und entfernt werden");
        }

        final GameDay gameDay = loadGameDay(gameDayId);
        final Set<Long> next = gameDay.getAvailablePlayers().stream()
            .map(Player::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        next.addAll(toAdd);
        toRemove.forEach(next::remove);
        log.info("Spieltag {}: Anwesenheit aus Umfrage übernommen (+{} / -{})", gameDayId, toAdd.size(), toRemove.size());
        return availabilityService.setAvailablePlayers(gameDayId, new ArrayList<>(next));
    }

    private void persist(final Long gameDayId, final List<WhatsappVote> votes,
                         final Map<String, Player> byName, final List<String> options) {
        final String yesOption = options.isEmpty() ? null : options.getFirst().trim().toLowerCase();
        for (final WhatsappVote vote : votes) {
            if (vote.voterName() == null || vote.voterName().isBlank()) continue;
            final String voterName = vote.voterName().trim();
            final Player player = byName.get(voterName.toLowerCase());
            final boolean present = yesOption != null && vote.options() != null && vote.options().stream()
                .anyMatch(o -> o != null && yesOption.equals(o.trim().toLowerCase()));
            final SyncedVote row = voteRepo.findByGameDayIdAndVoterName(gameDayId, voterName)
                .orElseGet(() -> SyncedVote.forGameDay(gameDayId, voterName, null, present));
            row.setPlayerId(player != null ? player.getId() : null);
            row.setPresent(present);
            voteRepo.save(row);
        }
    }

    private Preview toPreview(final GameDay gameDay, final GameDayVoteMirror.Result result, final boolean sent) {
        final Map<Long, Player> all = playerRepo.findAll().stream()
            .collect(Collectors.toMap(Player::getId, p -> p, (a, b) -> a));
        final List<PlayerRef> toAdd = result.toAdd().stream()
            .map(id -> new PlayerRef(id, name(all, id))).toList();
        final List<Removal> toRemove = result.toRemove().stream()
            .map(id -> new Removal(id, name(all, id), warningsFor(gameDay, id))).toList();
        return new Preview(true, sent, toAdd, toRemove, result.optionVoters(), result.unknownVoters(),
                result.voteCount(), result.yesCount());
    }

    /** Was der Anwesenheits-Entzug dieses Spielers zerstoert (Kaskade in AvailabilityService). */
    private List<String> warningsFor(final GameDay gameDay, final Long playerId) {
        final List<String> warnings = new ArrayList<>();
        int gameNumber = 0;
        for (final Game game : gameDay.getGames()) {
            gameNumber++;
            for (final LineupEntry entry : lineupRepo.findByGameIdOrderByBattingOrderAsc(game.getId())) {
                if (entry.getPlayer() != null && playerId.equals(entry.getPlayer().getId())) {
                    warnings.add("Lineup Spiel " + gameNumber + " (#" + entry.getBattingOrder()
                        + (entry.getPosition() != null ? ", " + entry.getPosition().name() : "") + ") wird gelöscht");
                }
                if (entry.getDhBatterPlayer() != null && playerId.equals(entry.getDhBatterPlayer().getId())) {
                    warnings.add("DH-Zuordnung in Spiel " + gameNumber + " wird entfernt");
                }
            }
            for (final GameStaff staff : staffRepo.findByGameId(game.getId())) {
                if (staff.getPlayer() != null && playerId.equals(staff.getPlayer().getId())) {
                    warnings.add(staff.getRole().name() + " in Spiel " + gameNumber + " wird entfernt");
                }
            }
        }
        return warnings;
    }

    private GameDay loadGameDay(final Long gameDayId) {
        return gameDayRepo.findByIdWithGamesAndPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
    }

    private Map<String, Player> playersByWhatsappName() {
        return playerRepo.findAll().stream()
            .filter(p -> p.getWhatsappName() != null && !p.getWhatsappName().isBlank())
            .collect(Collectors.toMap(p -> p.getWhatsappName().trim().toLowerCase(), p -> p, (a, b) -> a));
    }

    private String name(final Map<Long, Player> all, final Long id) {
        final Player p = all.get(id);
        return p != null ? p.getName() : "Spieler " + id;
    }
}
