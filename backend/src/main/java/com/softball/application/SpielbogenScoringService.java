package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpielbogenScoringService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenScoringService.class);

    private final SpielbogenRepository bogenRepo;
    private final SpielbogenSlotRepository slotRepo;
    private final SpielbogenAtBatRepository atBatRepo;
    private final SpielbogenStealingRepository stealingRepo;
    private final SpielbogenSubstitutionRepository subRepo;

    public SpielbogenScoringService(final SpielbogenRepository bogenRepo,
                                    final SpielbogenSlotRepository slotRepo,
                                    final SpielbogenAtBatRepository atBatRepo,
                                    final SpielbogenStealingRepository stealingRepo,
                                    final SpielbogenSubstitutionRepository subRepo) {
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.atBatRepo = atBatRepo;
        this.stealingRepo = stealingRepo;
        this.subRepo = subRepo;
    }

    @Transactional
    public SpielbogenAtBat recordAtBat(final Long bogenId, final BogenSide side, final Long slotId,
                                       final Integer inning, final AtBatResult result,
                                       final OutType outType, final SacrificeType sacrificeType,
                                       final List<Integer> fielderChain,
                                       final Boolean isError, final Integer errorPosition,
                                       final Integer runsScored, final Integer rbi,
                                       final BogenBaseState baseStateAfter) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (outType != null && result != AtBatResult.OUT) {
            throw new BusinessValidationException("outType nur bei result=OUT erlaubt");
        }
        if (fielderChain != null && !fielderChain.isEmpty()) {
            if (result != AtBatResult.OUT) {
                throw new BusinessValidationException("fielderChain nur bei result=OUT erlaubt");
            }
            if (fielderChain.size() > 4) {
                throw new BusinessValidationException("fielderChain darf max 4 Einträge haben");
            }
            for (Integer pos : fielderChain) {
                if (pos == null || pos < 1 || pos > 9) {
                    throw new BusinessValidationException("fielderChain-Werte müssen 1-9 sein");
                }
            }
        }
        if (Boolean.TRUE.equals(isError) && (errorPosition == null || errorPosition < 1 || errorPosition > 9)) {
            throw new BusinessValidationException("isError=true erfordert errorPosition 1-9");
        }
        if (runsScored != null && runsScored < 0) {
            throw new BusinessValidationException("runsScored muss >= 0 sein");
        }

        SpielbogenAtBat atBat = new SpielbogenAtBat();
        atBat.setBogen(bogen);
        atBat.setSlot(slot);
        atBat.setSide(side);
        atBat.setInning(inning);
        atBat.setResult(result);
        atBat.setOutType(outType);
        atBat.setSacrificeType(sacrificeType);
        atBat.setFielderChain(fielderChain);
        atBat.setIsError(isError != null ? isError : Boolean.FALSE);
        atBat.setErrorPosition(errorPosition);
        atBat.setRunsScored(runsScored != null ? runsScored : 0);
        atBat.setRbi(rbi != null ? rbi : 0);
        atBat.setBaseStateAfter(baseStateAfter != null ? baseStateAfter : BogenBaseState.empty());

        // Retry on concurrent sequence collision (UNIQUE constraint on bogen+side+sequence)
        SpielbogenAtBat saved;
        int retries = 0;
        while (true) {
            try {
                Integer nextSeq = atBatRepo.findMaxSequenceForBogenSide(bogenId, side) + 1;
                atBat.setSequence(nextSeq);
                saved = atBatRepo.save(atBat);
                break;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                if (++retries > 3) {
                    throw e;
                }
                log.warn("Spielbogen {} AtBat: sequence collision, retry {}", bogenId, retries);
            }
        }

        if (saved.getRunsScored() != null && saved.getRunsScored() > 0) {
            if (side == BogenSide.HOME) {
                bogen.setHomeRuns(bogen.getHomeRuns() + saved.getRunsScored());
            } else {
                bogen.setAwayRuns(bogen.getAwayRuns() + saved.getRunsScored());
            }
            bogenRepo.save(bogen);
        }

        log.info("Spielbogen {} AtBat: side={} inning={} result={} seq={}",
                 bogenId, side, inning, result, saved.getSequence());

        maybeAutoSwitchSide(bogen, side, inning);
        return saved;
    }

    @Transactional
    public SpielbogenStealingEvent recordStealingEvent(final Long bogenId, final BogenSide side,
                                                       final Long slotId, final Integer inning,
                                                       final StealingEventType type,
                                                       final Integer fromBase, final Integer toBase) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (fromBase == null || fromBase < 1 || fromBase > 3) {
            throw new BusinessValidationException("fromBase muss 1-3 sein");
        }
        if (toBase == null || toBase < 2 || toBase > 4) {
            throw new BusinessValidationException("toBase muss 2-4 sein");
        }

        SpielbogenStealingEvent event = new SpielbogenStealingEvent();
        event.setBogen(bogen);
        event.setSlot(slot);
        event.setSide(side);
        event.setInning(inning);
        event.setType(type);
        event.setFromBase(fromBase);
        event.setToBase(toBase);

        SpielbogenStealingEvent saved = stealingRepo.save(event);
        log.info("Spielbogen {} Stealing: side={} inning={} type={} {}→{}",
                 bogenId, side, inning, type, fromBase, toBase);

        maybeAutoSwitchSide(bogen, side, inning);
        return saved;
    }

    @Transactional
    public SpielbogenSubstitution recordSubstitution(final Long bogenId, final BogenSide side,
                                                     final Long slotId, final Integer inning,
                                                     final String playerInName, final boolean isPinchHitter) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenSlot slot = requireSlotForBogenAndSide(slotId, bogenId, side);

        if (playerInName == null || playerInName.isBlank()) {
            throw new BusinessValidationException("playerInName darf nicht leer sein");
        }

        SpielbogenSubstitution sub = new SpielbogenSubstitution();
        sub.setBogen(bogen);
        sub.setSlot(slot);
        sub.setSide(side);
        sub.setInning(inning);
        sub.setPlayerOutName(slot.getName());
        sub.setPlayerInName(playerInName);
        sub.setIsPinchHitter(isPinchHitter);

        slot.setName(playerInName);
        slotRepo.save(slot);

        SpielbogenSubstitution saved = subRepo.save(sub);
        log.info("Spielbogen {} Sub: side={} inning={} {} → {} (pinch={})",
                 bogenId, side, inning, sub.getPlayerOutName(), playerInName, isPinchHitter);
        return saved;
    }

    @Transactional
    public void undoLast(final Long bogenId, final BogenSide side) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenAtBat last = atBatRepo.findLatestForSide(bogenId, side)
            .orElseThrow(() -> new BusinessValidationException("Kein AtBat zum Rückgängigmachen für Side " + side));

        BogenSide undoneSide = last.getSide();
        Integer undoneInning = last.getInning();

        atBatRepo.deleteById(last.getId());

        int homeRuns = bogen.getHomeRuns() - (last.getSide() == BogenSide.HOME ? (last.getRunsScored() != null ? last.getRunsScored() : 0) : 0);
        int awayRuns = bogen.getAwayRuns() - (last.getSide() == BogenSide.AWAY ? (last.getRunsScored() != null ? last.getRunsScored() : 0) : 0);
        bogen.setHomeRuns(Math.max(0, homeRuns));
        bogen.setAwayRuns(Math.max(0, awayRuns));

        // Revert Auto-Switch: wenn der gelöschte AB ein 3rd-Out war (Inning hatte vorher
        // automatisch gewechselt), und die Outs jetzt wieder unter 3 sind, müssen Side und
        // Inning zurückgesetzt werden — sonst bleibt User im falschen Inning hängen.
        long outsAfterUndo = atBatRepo.countOutsInInning(bogenId, undoneSide, undoneInning);
        boolean sideOrInningChanged = bogen.getCurrentSide() != undoneSide
            || !undoneInning.equals(bogen.getCurrentInning());
        if (outsAfterUndo < 3 && sideOrInningChanged) {
            bogen.setCurrentSide(undoneSide);
            bogen.setCurrentInning(undoneInning);
            log.info("Spielbogen {} Undo: side/inning revert auf {}/{} (outs now {})",
                     bogenId, undoneSide, undoneInning, outsAfterUndo);
        }

        bogenRepo.save(bogen);
        log.info("Spielbogen {} Undo: AtBat id={} gelöscht", bogenId, last.getId());
    }

    @Transactional
    public Spielbogen switchSide(final Long bogenId) {
        Spielbogen bogen = requireLive(bogenId);
        BogenSide currentSide = bogen.getCurrentSide();
        Integer currentInning = bogen.getCurrentInning();

        long outs = atBatRepo.countOutsInInning(bogenId, currentSide, currentInning);
        if (outs < 3) {
            throw new BusinessValidationException("Side-Switch nur erlaubt wenn 3 Outs erreicht (aktuell: " + outs + ")");
        }

        BogenSide newSide = currentSide == BogenSide.AWAY ? BogenSide.HOME : BogenSide.AWAY;
        bogen.setCurrentSide(newSide);
        if (currentSide == BogenSide.HOME) {
            bogen.setCurrentInning(currentInning + 1);
        }
        log.info("Spielbogen {} Side-Switch: {} → {} (inning {})",
                 bogenId, currentSide, newSide, bogen.getCurrentInning());
        return bogenRepo.save(bogen);
    }

    @Transactional
    public void deleteStealingEvent(final Long bogenId, final Long eventId) {
        requireLive(bogenId);
        if (stealingRepo.findById(eventId).isEmpty()) {
            throw new ResourceNotFoundException("StealingEvent", eventId);
        }
        stealingRepo.deleteById(eventId);
    }

    @Transactional
    public void deleteSubstitution(final Long bogenId, final Long subId) {
        requireLive(bogenId);
        if (subRepo.findById(subId).isEmpty()) {
            throw new ResourceNotFoundException("Substitution", subId);
        }
        subRepo.deleteById(subId);
    }

    @Transactional
    public Spielbogen resetScoring(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException(
                "Reset nur in Status LIVE möglich (aktuell: " + bogen.getStatus() + ")"
            );
        }
        atBatRepo.findByBogenId(bogenId).forEach(ab -> atBatRepo.deleteById(ab.getId()));
        stealingRepo.findByBogenId(bogenId).forEach(st -> stealingRepo.deleteById(st.getId()));
        subRepo.findByBogenId(bogenId).forEach(sub -> subRepo.deleteById(sub.getId()));

        bogen.setHomeRuns(0);
        bogen.setAwayRuns(0);
        bogen.setCurrentInning(1);
        bogen.setCurrentSide(BogenSide.AWAY);
        Spielbogen saved = bogenRepo.save(bogen);
        log.info("Spielbogen {} reset — alle AtBats/Stealings/Subs gelöscht", bogenId);
        return saved;
    }

    @Transactional
    public SpielbogenAtBat updateLastAtBatBaseState(final Long bogenId, final BogenSide side,
                                                     final BogenBaseState newBaseStateAfter,
                                                     final Integer newRunsScored) {
        Spielbogen bogen = requireLive(bogenId);
        SpielbogenAtBat last = atBatRepo.findLatestForSide(bogenId, side)
            .orElseThrow(() -> new BusinessValidationException("Kein AtBat zum Bearbeiten für Side " + side));

        if (newRunsScored != null && newRunsScored < 0) {
            throw new BusinessValidationException("runsScored muss >= 0 sein");
        }

        last.setBaseStateAfter(newBaseStateAfter);
        if (newRunsScored != null) {
            last.setRunsScored(newRunsScored);
        }
        atBatRepo.save(last);

        // Recompute total runs from all at-bats
        var allAtBats = atBatRepo.findByBogenId(bogenId);
        int homeRuns = allAtBats.stream()
            .filter(a -> a.getSide() == BogenSide.HOME)
            .mapToInt(a -> a.getRunsScored() != null ? a.getRunsScored() : 0)
            .sum();
        int awayRuns = allAtBats.stream()
            .filter(a -> a.getSide() == BogenSide.AWAY)
            .mapToInt(a -> a.getRunsScored() != null ? a.getRunsScored() : 0)
            .sum();
        bogen.setHomeRuns(homeRuns);
        bogen.setAwayRuns(awayRuns);
        bogenRepo.save(bogen);

        log.info("Spielbogen {} AtBat {} corrected: baseStateAfter + runs={}",
                 bogenId, last.getId(), newRunsScored);
        return last;
    }

    @Transactional
    public Spielbogen setCurrentSide(final Long bogenId, final BogenSide newSide) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException("Set-Side nur in Status LIVE möglich (aktuell: " + bogen.getStatus() + ")");
        }
        bogen.setCurrentSide(newSide);
        log.info("Spielbogen {} currentSide manuell gesetzt auf {}", bogenId, newSide);
        return bogenRepo.save(bogen);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenAtBat> findAtBats(final Long bogenId, final BogenSide side) {
        if (side == null) return atBatRepo.findByBogenId(bogenId);
        return atBatRepo.findByBogenIdAndSide(bogenId, side);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenStealingEvent> findStealingEvents(final Long bogenId) {
        return stealingRepo.findByBogenId(bogenId);
    }

    @Transactional(readOnly = true)
    public List<SpielbogenSubstitution> findSubstitutions(final Long bogenId) {
        return subRepo.findByBogenId(bogenId);
    }

    private void maybeAutoSwitchSide(final Spielbogen bogen, final BogenSide side, final int inning) {
        long outs = atBatRepo.countOutsInInning(bogen.getId(), side, inning);
        if (outs >= 3) {
            BogenSide next = side == BogenSide.HOME ? BogenSide.AWAY : BogenSide.HOME;
            bogen.setCurrentSide(next);
            if (side == BogenSide.HOME) {
                bogen.setCurrentInning(inning + 1);
            }
            bogenRepo.save(bogen);
            log.info("Auto-Switch nach 3 Outs: bogen={} inning={} side={} → next={}",
                     bogen.getId(), inning, side, next);
        }
    }

    private Spielbogen requireLive(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        if (bogen.getStatus() != BogenStatus.LIVE) {
            throw new BusinessValidationException("Spielbogen muss im Status LIVE sein (aktuell: " + bogen.getStatus() + ")");
        }
        return bogen;
    }

    private SpielbogenSlot requireSlotForBogenAndSide(final Long slotId, final Long bogenId, final BogenSide side) {
        SpielbogenSlot slot = slotRepo.findById(slotId)
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", slotId));
        if (!slot.getBogen().getId().equals(bogenId)) {
            throw new BusinessValidationException("Slot gehört nicht zu Spielbogen " + bogenId);
        }
        if (slot.getSide() != side) {
            throw new BusinessValidationException("Slot ist auf Side " + slot.getSide() + ", erwartet " + side);
        }
        return slot;
    }

}
