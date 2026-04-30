package com.softball.application;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.domain.port.out.SpielbogenSlotRepository;
import com.softball.domain.service.BogenLineupValidator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpielbogenSlotServiceTest {

    @Mock private SpielbogenRepository bogenRepo;
    @Mock private SpielbogenSlotRepository slotRepo;
    @Mock private BogenLineupValidator validator;
    @Mock private GameDayService gameDayService;

    @InjectMocks
    private SpielbogenSlotService service;

    private Spielbogen draftBogen;
    private Spielbogen liveBogen;

    @BeforeEach
    void setUp() {
        draftBogen = new Spielbogen();
        draftBogen.setId(1L);
        draftBogen.setStatus(BogenStatus.DRAFT);

        liveBogen = new Spielbogen();
        liveBogen.setId(2L);
        liveBogen.setStatus(BogenStatus.LIVE);
    }

    @Test
    void setLineupRejectsLiveBogen() {
        when(bogenRepo.findById(2L)).thenReturn(Optional.of(liveBogen));

        assertThatThrownBy(() -> service.setLineup(2L, BogenSide.HOME, sampleSlots(9)))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("LIVE");
    }

    @Test
    void setLineupReplacesAllSlots() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));
        when(slotRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<SpielbogenSlot> input = sampleSlots(9);
        service.setLineup(1L, BogenSide.HOME, input);

        verify(validator).validate(any(), any());
        verify(slotRepo).deleteByBogenIdAndSide(1L, BogenSide.HOME);
        verify(slotRepo).saveAll(any());
    }

    @Test
    void setLineupBogenNotFound() {
        when(bogenRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setLineup(99L, BogenSide.HOME, sampleSlots(9)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getLineupReturnsBothSides() {
        when(bogenRepo.existsById(1L)).thenReturn(true);
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.HOME)).thenReturn(sampleSlots(9));
        when(slotRepo.findByBogenIdAndSide(1L, BogenSide.AWAY)).thenReturn(sampleSlots(9));

        var result = service.getLineup(1L);

        assertThat(result.home()).hasSize(9);
        assertThat(result.away()).hasSize(9);
    }

    @Test
    void updateSlotChangesNameAndPosition() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setName("Original");
        existing.setPosition("5");
        existing.setBattingOrder(3);
        existing.setSlot(3);
        existing.setSide(BogenSide.HOME);

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));
        when(slotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SpielbogenSlot updated = service.updateSlot(1L, 50L, "Klaus", "6", null);

        assertThat(updated.getName()).isEqualTo("Klaus");
        assertThat(updated.getPosition()).isEqualTo("6");
    }

    @Test
    void updateSlotRejectsBlankName() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setSlot(3);
        existing.setBattingOrder(3);
        existing.setSide(BogenSide.HOME);
        existing.setName("Original");

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "  ", null, null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Name");
    }

    @Test
    void updateSlotInvalidPosition() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        existing.setBogen(draftBogen);
        existing.setSlot(3);
        existing.setBattingOrder(3);
        existing.setSide(BogenSide.HOME);
        existing.setName("Original");

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "Klaus", "XX", null))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Position");
    }

    @Test
    void updateSlotMismatchedBogenIdReturns404() {
        SpielbogenSlot existing = new SpielbogenSlot();
        existing.setId(50L);
        Spielbogen otherBogen = new Spielbogen();
        otherBogen.setId(99L);
        existing.setBogen(otherBogen);

        when(slotRepo.findById(50L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateSlot(1L, 50L, "Klaus", null, null))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void copyFromGameDayAddsSlotsForLineup() {
        when(bogenRepo.findById(1L)).thenReturn(Optional.of(draftBogen));

        com.softball.domain.model.Player p1 = new com.softball.domain.model.Player();
        p1.setId(101L);
        p1.setName("Hung");

        com.softball.domain.model.Player p2 = new com.softball.domain.model.Player();
        p2.setId(102L);
        p2.setName("Klaus");

        com.softball.domain.model.LineupEntry e1 = new com.softball.domain.model.LineupEntry();
        e1.setPlayer(p1);
        e1.setBattingOrder(1);
        e1.setPosition(com.softball.domain.model.Position.SS);

        com.softball.domain.model.LineupEntry e2 = new com.softball.domain.model.LineupEntry();
        e2.setPlayer(p2);
        e2.setBattingOrder(2);
        e2.setPosition(com.softball.domain.model.Position.P);

        com.softball.domain.model.Game game = new com.softball.domain.model.Game();
        game.setId(99L);
        game.setGameNumber(1);
        game.setLineupEntries(java.util.List.of(e1, e2));

        com.softball.domain.model.GameDay gd = new com.softball.domain.model.GameDay();
        gd.setGames(java.util.List.of(game));

        when(gameDayService.findById(50L)).thenReturn(gd);
        when(slotRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.copyFromGameDay(1L, 50L, 1, BogenSide.HOME);

        assertThat(result).hasSize(2);
        verify(slotRepo).deleteByBogenIdAndSide(1L, BogenSide.HOME);
        verify(slotRepo).saveAll(any());
    }

    private List<SpielbogenSlot> sampleSlots(final int count) {
        List<SpielbogenSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setSlot(i);
            s.setBattingOrder(i);
            s.setName("Spieler " + i);
            s.setPosition(i <= 9 ? String.valueOf(i) : "EH");
            s.setSide(BogenSide.HOME);
            slots.add(s);
        }
        return slots;
    }
}
