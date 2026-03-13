package com.softball.service;

import com.softball.application.SeasonService;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.LeagueTeamRepository;
import com.softball.domain.port.out.SeasonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeasonServiceTest {

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private LeagueTeamRepository leagueTeamRepository;

    @InjectMocks
    private SeasonService seasonService;

    @Test
    void findAll_returnsAllSeasons() {
        final Season s1 = new Season(1L, "Saison 2025", 2025);
        final Season s2 = new Season(2L, "Saison 2026", 2026);
        when(seasonRepository.findAll()).thenReturn(List.of(s1, s2));

        final List<Season> result = seasonService.findAll();

        assertThat(result).hasSize(2);
    }

    @Test
    void findById_existingSeason_returnsSeason() {
        final Season season = new Season(1L, "Saison 2025", 2025);
        when(seasonRepository.findById(1L)).thenReturn(Optional.of(season));

        final Season result = seasonService.findById(1L);

        assertThat(result.getName()).isEqualTo("Saison 2025");
    }

    @Test
    void findById_nonExisting_throwsResourceNotFound() {
        when(seasonRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> seasonService.findById(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_savesSeasonAndCreatesOwnTeam() {
        when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> {
            final Season s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });
        when(leagueTeamRepository.save(any(LeagueTeam.class))).thenAnswer(inv -> inv.getArgument(0));

        final Season result = seasonService.create("Saison 2026", 2026);

        assertThat(result.getName()).isEqualTo("Saison 2026");
        assertThat(result.getYear()).isEqualTo(2026);

        final ArgumentCaptor<LeagueTeam> teamCaptor = ArgumentCaptor.forClass(LeagueTeam.class);
        verify(leagueTeamRepository).save(teamCaptor.capture());
        assertThat(teamCaptor.getValue().getName()).isEqualTo("Dead Sox");
        assertThat(teamCaptor.getValue().isOwnTeam()).isTrue();
    }

    @Test
    void update_updatesNameAndYear() {
        final Season season = new Season(1L, "Alt", 2024);
        when(seasonRepository.findById(1L)).thenReturn(Optional.of(season));
        when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> inv.getArgument(0));

        final Season result = seasonService.update(1L, "Neu", 2025);

        assertThat(result.getName()).isEqualTo("Neu");
        assertThat(result.getYear()).isEqualTo(2025);
    }

    @Test
    void delete_existingSeason_deletes() {
        when(seasonRepository.existsById(1L)).thenReturn(true);

        seasonService.delete(1L);

        verify(seasonRepository).deleteById(1L);
    }

    @Test
    void delete_nonExisting_throwsResourceNotFound() {
        when(seasonRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> seasonService.delete(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
