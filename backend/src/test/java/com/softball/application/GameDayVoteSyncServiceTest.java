package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GameDayVoteSyncServiceTest {

    private final WhatsappPollRepository pollRepo = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final GameDayRepository gameDayRepo = mock(GameDayRepository.class);
    private final PlayerRepository playerRepo = mock(PlayerRepository.class);
    private final SyncedVoteRepository voteRepo = mock(SyncedVoteRepository.class);
    private final LineupEntryRepository lineupRepo = mock(LineupEntryRepository.class);
    private final GameStaffRepository staffRepo = mock(GameStaffRepository.class);
    // Seit Task 6 im Konstruktor injiziert. verifyNoInteractions(availabilityService) in
    // shouldPersistVotesAndReturnDeltaWithoutTouchingAvailability ist damit eine echte
    // Regressions-Sicherung: Vorschau darf nie schreiben, das darf nur apply().
    private final AvailabilityService availabilityService = mock(AvailabilityService.class);
    private GameDayVoteSyncService service;

    private final Player max = new Player(1L, "Max", true, null);
    private final Player ben = new Player(2L, "Ben", true, null);
    private final Player jana = new Player(4L, "Jana", true, null);
    private WhatsappPoll poll;
    private GameDay gameDay;

    @BeforeEach
    void setup() {
        service = new GameDayVoteSyncService(pollRepo, sender, gameDayRepo, playerRepo, voteRepo, lineupRepo, staffRepo,
                availabilityService);
        max.setWhatsappName("Max M.");
        ben.setWhatsappName("Ben B.");
        when(playerRepo.findAll()).thenReturn(List.of(max, ben));
        when(voteRepo.findByGameDayIdAndVoterName(anyLong(), anyString())).thenReturn(Optional.empty());
        when(voteRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lineupRepo.findByGameIdOrderByBattingOrderAsc(anyLong())).thenReturn(List.of());
        when(staffRepo.findByGameId(anyLong())).thenReturn(List.of());
    }

    private void givenPoll() {
        poll = new WhatsappPoll();
        poll.setId(1L);
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(7L);
        poll.setLastSentMessageId("msg-1");
        poll.setOptions(List.of("Ja ich will spielen", "Nein"));
        when(pollRepo.findByGameDayId(7L)).thenReturn(Optional.of(poll));
    }

    private void givenConnected() {
        when(sender.status()).thenReturn(new WhatsappAccountStatus(true, "0491234", "Bot", false, null,
            WhatsappAccountStatus.ConnectionState.CONNECTED, null, null));
    }

    private void givenGameDayWithAvailable(final Player... available) {
        gameDay = new GameDay();
        gameDay.setId(7L);
        gameDay.setAvailablePlayersList(List.of(available));
        gameDay.setGames(new ArrayList<>());
        when(gameDayRepo.findByIdWithGamesAndPlayers(7L)).thenReturn(Optional.of(gameDay));
    }

    private void givenBenInLineup(final int gameNumber, final int battingOrder, final Position position) {
        final List<Game> games = new ArrayList<>();
        for (int i = 1; i <= gameNumber; i++) games.add(new Game((long) i, i));
        gameDay.setGames(games);
        final Game targetGame = games.get(gameNumber - 1);
        final LineupEntry entry = new LineupEntry(targetGame, ben, position, battingOrder);
        when(lineupRepo.findByGameIdOrderByBattingOrderAsc(targetGame.getId())).thenReturn(List.of(entry));
    }

    @Test
    void shouldThrowWhenNoPollForGameDay() {
        when(pollRepo.findByGameDayId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("keine Umfrage");
    }

    @Test
    void shouldThrowWhenWhatsappNotConnected() {
        givenPoll();
        when(sender.status()).thenReturn(new WhatsappAccountStatus(false, null, null, true, null,
            WhatsappAccountStatus.ConnectionState.WAITING_QR, null, null));

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("nicht verbunden");
    }

    @Test
    void shouldPersistVotesAndReturnDeltaWithoutTouchingAvailability() {
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
            new WhatsappVote("Max M.", List.of("Ja ich will spielen")),
            new WhatsappVote("Ben B.", List.of("Nein"))));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toAdd()).extracting(GameDayVoteSyncService.PlayerRef::name).containsExactly("Max");
        assertThat(preview.toRemove()).extracting(GameDayVoteSyncService.Removal::playerName).containsExactly("Ben");
        verify(voteRepo, times(2)).save(any());
        verifyNoInteractions(availabilityService);
    }

    @Test
    void shouldWarnAboutLineupEntryOfRemovedPlayer() {
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        givenBenInLineup(2, 4, Position.SS);          // Spiel 2, Schlagposition 4, Shortstop
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Ben B.", List.of("Nein"))));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toRemove()).singleElement()
            .satisfies(r -> assertThat(r.warnings()).anyMatch(w -> w.contains("Spiel 2") && w.contains("SS")));
    }

    @Test
    void shouldThrowWhenOptionsChangedAfterSendAndNoVoteMatchesAnyOption() {
        // Options wurden nach dem Versand editiert (Tippfehler-Korrektur o.ä.) — die abgerufenen
        // Stimmen tragen noch den alten Optionstext und matchen keine der aktuellen Optionen.
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(max, ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
            new WhatsappVote("Max M.", List.of("Jaaa ich will spielen")),
            new WhatsappVote("Ben B.", List.of("Jaaa ich will spielen"))));

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Antwortoptionen passen nicht zu den abgegebenen Stimmen");
        // Darf bei diesem Fehlerfall auch nichts (falsch) persistieren.
        verify(voteRepo, never()).save(any());
    }

    @Test
    void shouldThrowWhenOnlyOneOptionTextDriftedEvenIfAnotherVoteStillMatches() {
        // Live reproduzierter Fall: nur "Ja"-Option umformuliert, "Nein" blieb unveraendert.
        // Der alte Guard (matchedVotes == 0) schlief hier, weil die Nein-Stimme noch matchte —
        // waehrend die beiden Ja-Stimmen (alter Text) faelschlich als Absage erschienen waeren.
        poll = new WhatsappPoll();
        poll.setId(1L);
        poll.setMode(PollMode.GAME_DAY);
        poll.setGameDayId(7L);
        poll.setLastSentMessageId("msg-1");
        poll.setOptions(List.of("Ja, ich will spielen!", "Ich habe ein Auto", "Nein"));
        when(pollRepo.findByGameDayId(7L)).thenReturn(Optional.of(poll));
        givenConnected();
        givenGameDayWithAvailable(max, ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
            new WhatsappVote("Max M.", List.of("Ja ich will spielen")),   // alter Text der Ja-Option
            new WhatsappVote("Ben B.", List.of("Ja ich will spielen")),  // alter Text der Ja-Option
            new WhatsappVote("Sandra W.", List.of("Nein"))));            // Nein-Option unveraendert

        assertThatThrownBy(() -> service.fetchAndPreview(7L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Antwortoptionen passen nicht zu den abgegebenen Stimmen");
        verify(voteRepo, never()).save(any());
    }

    @Test
    void shouldNotThrowWhenAllVotesMatchCurrentOptions() {
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(
            new WhatsappVote("Max M.", List.of("Ja ich will spielen")),
            new WhatsappVote("Ben B.", List.of("Nein"))));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toAdd()).extracting(GameDayVoteSyncService.PlayerRef::name).containsExactly("Max");
    }

    @Test
    void shouldNotThrowWhenVoterWithdrewAllOptions() {
        // Leere Optionsliste ist eine legitime Stimmruecknahme, kein Options-Drift.
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of(new WhatsappVote("Ben B.", List.of())));

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.toRemove()).extracting(GameDayVoteSyncService.Removal::playerName).containsExactly("Ben");
    }

    @Test
    void shouldNotThrowWhenNobodyVotedYet() {
        // Legitimer Fall: Umfrage ist raus, aber noch niemand hat abgestimmt (voteCount == 0).
        givenPoll();
        givenConnected();
        givenGameDayWithAvailable(ben);
        when(sender.fetchVotes("msg-1")).thenReturn(List.of());

        final var preview = service.fetchAndPreview(7L);

        assertThat(preview.voteCount()).isZero();
        assertThat(preview.toAdd()).isEmpty();
        assertThat(preview.toRemove()).isEmpty();
    }

    @Test
    void shouldReturnStoredVotesWithoutFetching() {
        givenPoll();
        when(voteRepo.findByGameDayId(7L)).thenReturn(List.of(
            SyncedVote.forGameDay(7L, "Sandra W.", null, true)));

        final var preview = service.stored(7L);

        assertThat(preview.unknownVoters()).containsExactly("Sandra W.");
        verify(sender, never()).fetchVotes(any());
    }

    @Test
    void shouldApplyDeltaOnCurrentAvailability() {
        givenGameDayWithAvailable(ben, jana);      // aktuell: Ben(2), Jana(4)
        when(availabilityService.setAvailablePlayers(eq(7L), any())).thenReturn(new GameDay());

        service.apply(7L, List.of(1L), List.of(2L));   // +Max(1), -Ben(2)

        final ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(availabilityService).setAvailablePlayers(eq(7L), captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(1L, 4L);   // Jana bleibt unberührt
    }

    @Test
    void shouldIgnoreRemovalOfPlayerWhoIsNotAvailable() {
        givenGameDayWithAvailable(jana);
        when(availabilityService.setAvailablePlayers(eq(7L), any())).thenReturn(new GameDay());

        service.apply(7L, List.of(), List.of(2L));

        final ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(availabilityService).setAvailablePlayers(eq(7L), captor.capture());
        assertThat(captor.getValue()).containsExactly(4L);
    }

    @Test
    void shouldRejectPlayerInBothAddAndRemove() {
        assertThatThrownBy(() -> service.apply(7L, List.of(1L), List.of(1L)))
            .isInstanceOf(BusinessValidationException.class);
    }
}
