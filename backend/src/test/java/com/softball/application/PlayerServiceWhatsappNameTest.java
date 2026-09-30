package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PlayerServiceWhatsappNameTest {

    private final PlayerRepository repo = mock(PlayerRepository.class);
    private final PlayerService service = new PlayerService(repo,
        mock(AtBatRepository.class),
        mock(BaseRunningEventRepository.class),
        mock(SubstitutionRepository.class),
        mock(TrainingAttendanceRepository.class),
        mock(AvailabilityService.class));

    @Test
    void setsWhatsappName() {
        final Player p = new Player(1L, "Max", true, null);
        when(repo.findById(1L)).thenReturn(Optional.of(p));
        when(repo.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));

        final Player result = service.setWhatsappName(1L, "Max ⚾");

        assertThat(result.getWhatsappName()).isEqualTo("Max ⚾");
        verify(repo).save(argThat(x -> "Max ⚾".equals(x.getWhatsappName())));
    }

    @Test
    void throwsWhenPlayerMissing() {
        when(repo.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setWhatsappName(9L, "x"))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
