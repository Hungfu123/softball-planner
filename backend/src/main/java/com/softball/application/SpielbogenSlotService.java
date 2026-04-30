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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class SpielbogenSlotService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenSlotService.class);
    private static final Set<String> VALID_POSITIONS = Set.of(
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "EH", "DH",
        "1", "2", "3", "4", "5", "6", "7", "8", "9"
    );

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotRepository slotRepo;
    private final BogenLineupValidator validator;
    private final GameDayService gameDayService;

    public SpielbogenSlotService(final SpielbogenRepository bogenRepo,
                                 final SpielbogenSlotRepository slotRepo,
                                 final BogenLineupValidator validator,
                                 final GameDayService gameDayService) {
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.validator = validator;
        this.gameDayService = gameDayService;
    }

    public record LineupResult(List<SpielbogenSlot> home, List<SpielbogenSlot> away) {}

    @Transactional(readOnly = true)
    public LineupResult getLineup(final Long bogenId) {
        if (!bogenRepo.existsById(bogenId)) {
            throw new ResourceNotFoundException("Spielbogen", bogenId);
        }
        return new LineupResult(
            slotRepo.findByBogenIdAndSide(bogenId, BogenSide.HOME),
            slotRepo.findByBogenIdAndSide(bogenId, BogenSide.AWAY)
        );
    }

    @Transactional
    public List<SpielbogenSlot> setLineup(final Long bogenId, final BogenSide side,
                                          final List<SpielbogenSlot> slots) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));

        if (bogen.getStatus() == BogenStatus.LIVE) {
            throw new BusinessValidationException(
                "Lineup-Bulk-Replace ist im Status LIVE nicht erlaubt — nur einzelne Slot-PATCH"
            );
        }

        for (SpielbogenSlot s : slots) {
            s.setBogen(bogen);
            s.setSide(side);
        }
        validator.validate(slots, side);

        slotRepo.deleteByBogenIdAndSide(bogenId, side);
        log.info("Spielbogen {} setLineup für Side {}: {} Slots", bogenId, side, slots.size());
        return slotRepo.saveAll(slots);
    }

    @Transactional
    public SpielbogenSlot updateSlot(final Long bogenId, final Long slotId,
                                     final String name, final String position,
                                     final Integer battingOrder) {
        SpielbogenSlot existing = slotRepo.findById(slotId)
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", slotId));

        if (!existing.getBogen().getId().equals(bogenId)) {
            throw new ResourceNotFoundException("SpielbogenSlot", slotId);
        }

        if (name != null) {
            if (name.isBlank()) {
                throw new BusinessValidationException("Name darf nicht leer sein");
            }
            existing.setName(name);
        }
        if (position != null) {
            if (!position.isBlank() && !VALID_POSITIONS.contains(position)) {
                throw new BusinessValidationException("Ungültige Position: " + position);
            }
            existing.setPosition(position.isBlank() ? null : position);
        }
        if (battingOrder != null) {
            existing.setBattingOrder(battingOrder);
        }

        return slotRepo.save(existing);
    }

    @Transactional
    public List<SpielbogenSlot> copyFromGameDay(final Long bogenId, final Long gameDayId,
                                                final Integer gameNumber, final BogenSide targetSide) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        if (bogen.getStatus() == BogenStatus.LIVE) {
            throw new BusinessValidationException("Lineup-Copy ist im Status LIVE nicht erlaubt");
        }

        var gd = gameDayService.findById(gameDayId);
        var game = gd.getGames().stream()
            .filter(g -> g.getGameNumber() != null && g.getGameNumber().equals(gameNumber))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameNumber.longValue()));

        List<SpielbogenSlot> slots = new ArrayList<>();
        int orderCounter = 1;
        for (var entry : game.getLineupEntries()) {
            SpielbogenSlot s = new SpielbogenSlot();
            s.setBogen(bogen);
            s.setSide(targetSide);
            s.setSlot(orderCounter);
            s.setBattingOrder(entry.getBattingOrder() != null ? entry.getBattingOrder() : orderCounter);
            s.setName(entry.getPlayer().getName());
            s.setPosition(entry.getPosition() != null ? entry.getPosition().name() : null);
            slots.add(s);
            orderCounter++;
        }

        slotRepo.deleteByBogenIdAndSide(bogenId, targetSide);
        log.info("Spielbogen {} copyFromGameDay: gd={} game={} side={} → {} slots",
                 bogenId, gameDayId, gameNumber, targetSide, slots.size());
        return slotRepo.saveAll(slots);
    }
}
