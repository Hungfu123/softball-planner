package com.softball.service;

import com.softball.adapter.dto.DataExport;
import com.softball.adapter.dto.DataExport.*;
import com.softball.application.DataImportService;
import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataImportServiceTest {

    @Mock private PlayerRepository playerRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private GameDayRepository gameDayRepository;
    @Mock private GameRepository gameRepository;
    @Mock private LineupEntryRepository lineupEntryRepository;
    @Mock private GameStaffRepository gameStaffRepository;
    @Mock private CarRepository carRepository;
    @Mock private LeagueTeamRepository leagueTeamRepository;
    @Mock private LeagueResultRepository leagueResultRepository;

    @InjectMocks
    private DataImportService dataImportService;

    private final AtomicLong idCounter = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        // Default: save returns entity with new ID
        lenient().when(playerRepository.save(any(Player.class))).thenAnswer(inv -> {
            final Player p = inv.getArgument(0);
            p.setId(idCounter.getAndIncrement());
            return p;
        });
        lenient().when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> {
            final Season s = inv.getArgument(0);
            s.setId(idCounter.getAndIncrement());
            return s;
        });
        lenient().when(leagueTeamRepository.save(any(LeagueTeam.class))).thenAnswer(inv -> {
            final LeagueTeam t = inv.getArgument(0);
            t.setId(idCounter.getAndIncrement());
            return t;
        });
        lenient().when(gameDayRepository.save(any(GameDay.class))).thenAnswer(inv -> {
            final GameDay gd = inv.getArgument(0);
            gd.setId(idCounter.getAndIncrement());
            for (final Game g : gd.getGames()) {
                g.setId(idCounter.getAndIncrement());
            }
            return gd;
        });
        lenient().when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(lineupEntryRepository.save(any(LineupEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(gameStaffRepository.save(any(GameStaff.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(carRepository.save(any(Car.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(leagueResultRepository.save(any(LeagueResult.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(playerRepository.findAllById(anyList())).thenAnswer(inv -> {
            final List<Long> ids = inv.getArgument(0);
            return ids.stream().map(id -> {
                final Player p = new Player("Imported");
                p.setId(id);
                return p;
            }).toList();
        });
    }

    @Test
    void importAll_createsPlayers() {
        final DataExport data = new DataExport(
            List.of(new PlayerExport(1L, "Alice", null), new PlayerExport(2L, "Bob", null)),
            List.of()
        );

        dataImportService.importAll(data);

        verify(playerRepository, times(2)).save(any(Player.class));
    }

    @Test
    void importAll_createsSeasonWithOwnTeam() {
        final DataExport data = new DataExport(
            List.of(),
            List.of(new SeasonExport(1L, "2025", 2025, List.of(), null))
        );

        dataImportService.importAll(data);

        verify(seasonRepository).save(any(Season.class));

        final ArgumentCaptor<LeagueTeam> teamCaptor = ArgumentCaptor.forClass(LeagueTeam.class);
        verify(leagueTeamRepository).save(teamCaptor.capture());
        assertThat(teamCaptor.getValue().getName()).isEqualTo("Dead Sox");
        assertThat(teamCaptor.getValue().isOwnTeam()).isTrue();
    }

    @Test
    void importAll_createsGameDayWith3Games() {
        final DataExport data = new DataExport(
            List.of(),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld A",
                    List.of(), List.of(), List.of())),
                null))
        );

        dataImportService.importAll(data);

        final ArgumentCaptor<GameDay> gdCaptor = ArgumentCaptor.forClass(GameDay.class);
        verify(gameDayRepository).save(gdCaptor.capture());
        assertThat(gdCaptor.getValue().getGames()).hasSize(3);
    }

    @Test
    void importAll_importsLineupWithPlayerMapping() {
        final DataExport data = new DataExport(
            List.of(new PlayerExport(1L, "Alice", null)),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld",
                    List.of(),
                    List.of(new GameExport(1, null, null, null,
                        List.of(new LineupExport(1L, "P", 1, null)),
                        List.of())),
                    List.of())),
                null))
        );

        dataImportService.importAll(data);

        verify(lineupEntryRepository).save(argThat(e ->
            e.getPosition() == Position.P && e.getBattingOrder() == 1));
    }

    @Test
    void importAll_missingPlayerMapping_throws() {
        final DataExport data = new DataExport(
            List.of(), // No players
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld",
                    List.of(),
                    List.of(new GameExport(1, null, null, null,
                        List.of(new LineupExport(999L, "P", 1, null)),
                        List.of())),
                    List.of())),
                null))
        );

        assertThatThrownBy(() -> dataImportService.importAll(data))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Spieler-Mapping fehlt");
    }

    @Test
    void importAll_importsOpponentTeam() {
        final DataExport data = new DataExport(
            List.of(),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld",
                    List.of(),
                    List.of(new GameExport(1, "Tigers", 10, 5, List.of(), List.of())),
                    List.of())),
                null))
        );

        dataImportService.importAll(data);

        // Team "Tigers" should be created (non-own)
        verify(leagueTeamRepository, atLeast(2)).save(any(LeagueTeam.class)); // Dead Sox + Tigers
        verify(gameRepository).save(argThat(g ->
            g.getOpponentTeam() != null && g.getScoreUs() == 10 && g.getScoreThem() == 5));
    }

    @Test
    void importAll_importsStaff() {
        final DataExport data = new DataExport(
            List.of(new PlayerExport(1L, "Coach", null)),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld",
                    List.of(),
                    List.of(new GameExport(1, null, null, null,
                        List.of(),
                        List.of(new StaffExport(1L, "BASE_COACH_1ST")))),
                    List.of())),
                null))
        );

        dataImportService.importAll(data);

        verify(gameStaffRepository).save(argThat(s ->
            s.getRole() == StaffRole.BASE_COACH_1ST));
    }

    @Test
    void importAll_importsLeagueResults() {
        final DataExport data = new DataExport(
            List.of(),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(),
                List.of(new LeagueResultExport("Tigers", "Bears", 8, 3, LocalDate.of(2025, 6, 1)))))
        );

        dataImportService.importAll(data);

        verify(leagueResultRepository).save(any(LeagueResult.class));
        // Tigers and Bears should be created as non-own teams
        verify(leagueTeamRepository, atLeast(3)).save(any()); // Dead Sox + Tigers + Bears
    }

    @Test
    void importAll_reusesSameTeamName() {
        // Opponent "Tigers" used twice — should only create once
        final DataExport data = new DataExport(
            List.of(),
            List.of(new SeasonExport(1L, "2025", 2025,
                List.of(new GameDayExport(LocalDate.of(2025, 6, 1), "Tag 1", "Feld",
                    List.of(),
                    List.of(
                        new GameExport(1, "Tigers", 10, 5, List.of(), List.of()),
                        new GameExport(2, "Tigers", 8, 3, List.of(), List.of())),
                    List.of())),
                null))
        );

        dataImportService.importAll(data);

        // Dead Sox + Tigers = 2 teams total (Tigers only once)
        verify(leagueTeamRepository, times(2)).save(any(LeagueTeam.class));
    }
}
