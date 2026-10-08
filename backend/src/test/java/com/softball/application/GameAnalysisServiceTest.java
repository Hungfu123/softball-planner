package com.softball.application;

import com.softball.adapter.dto.BattingSlotStatsResponse;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseState;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests für die Spiele-Auswahl in GameAnalysisService.getBattingSlots:
 * ohne gameIds alle At-Bats, mit gameIds nur die der Auswahl.
 * Die Slot-Berechnung selbst wird in TeamGameLogCalculatorTest getestet.
 */
@ExtendWith(MockitoExtension.class)
class GameAnalysisServiceTest {

    @Mock private GameRepository gameRepository;
    @Mock private AtBatRepository atBatRepository;
    @Mock private LineupEntryRepository lineupEntryRepository;
    @Mock private PlayerRepository playerRepository;
    @Mock private GameScoringService gameScoringService;

    @InjectMocks
    private GameAnalysisService service;

    private Player hung;
    private Game game1;
    private Game game2;
    private AtBat ab1;
    private AtBat ab2;
    private LineupEntry slotEntry1;
    private LineupEntry slotEntry2;

    @BeforeEach
    void setUp() {
        hung = new Player(1L, "Hung", false, 1);
        game1 = new Game(10L, 1);
        game2 = new Game(20L, 2);
        ab1 = atBat(game1, hung, AtBatResult.SINGLE);
        ab2 = atBat(game2, hung, AtBatResult.OUT);
        slotEntry1 = new LineupEntry();
        slotEntry1.setGame(game1);
        slotEntry1.setPlayer(hung);
        slotEntry1.setBattingOrder(1);
        slotEntry2 = new LineupEntry();
        slotEntry2.setGame(game2);
        slotEntry2.setPlayer(hung);
        slotEntry2.setBattingOrder(1);
    }

    @Test
    void battingSlots_ohneGameIdsNutztAlleAtBats() {
        when(atBatRepository.findAll()).thenReturn(List.of(ab1, ab2));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L, 20L)))
            .thenReturn(List.of(slotEntry1, slotEntry2));

        final List<BattingSlotStatsResponse> slots = service.getBattingSlots(null);

        assertThat(slots).hasSize(1);
        assertThat(slots.get(0).slot()).isEqualTo(1);
        assertThat(slots.get(0).plateAppearances()).isEqualTo(2);
        verify(atBatRepository, never()).findByGameIdInOrderBySequenceAsc(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void battingSlots_mitGameIdsFiltertAufAuswahl() {
        when(atBatRepository.findByGameIdInOrderBySequenceAsc(List.of(10L))).thenReturn(List.of(ab1));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L)))
            .thenReturn(List.of(slotEntry1));

        final List<BattingSlotStatsResponse> slots = service.getBattingSlots(List.of(10L));

        assertThat(slots).hasSize(1);
        assertThat(slots.get(0).plateAppearances()).isEqualTo(1); // nur Spiel 10, nicht Spiel 20
        verify(atBatRepository, never()).findAll();
    }

    @Test
    void battingSlots_leereGameIdsFaelltAufAlleZurueck() {
        when(atBatRepository.findAll()).thenReturn(List.of(ab1, ab2));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L, 20L)))
            .thenReturn(List.of(slotEntry1, slotEntry2));

        final List<BattingSlotStatsResponse> slots = service.getBattingSlots(List.of());

        assertThat(slots).hasSize(1);
        assertThat(slots.get(0).plateAppearances()).isEqualTo(2);
        verify(atBatRepository, never()).findByGameIdInOrderBySequenceAsc(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void battingSlots_auswahlOhneAtBatsGibtLeereListe() {
        when(atBatRepository.findByGameIdInOrderBySequenceAsc(List.of(99L))).thenReturn(List.of());

        final List<BattingSlotStatsResponse> slots = service.getBattingSlots(List.of(99L));

        assertThat(slots).isEmpty();
    }

    private AtBat atBat(final Game game, final Player batter, final AtBatResult result) {
        final AtBat ab = new AtBat();
        ab.setGame(game);
        ab.setBatter(batter);
        ab.setResult(result);
        ab.setInning(1);
        ab.setSequence(1);
        ab.setBaseStateAfter(BaseState.empty());
        ab.setRunsScored(0);
        ab.setRbi(0);
        return ab;
    }
}
