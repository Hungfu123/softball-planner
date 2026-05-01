package com.softball.domain.service;

import com.softball.domain.model.*;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenSheetRenderer {

    public Map<CellKey, CellNotation> renderCells(final List<SpielbogenAtBat> atBats,
                                                   final List<SpielbogenStealingEvent> stealings,
                                                   final List<SpielbogenSubstitution> subs) {
        Map<CellKey, CellNotation> cells = new HashMap<>();

        for (SpielbogenAtBat ab : atBats) {
            CellKey key = new CellKey(ab.getSide(), ab.getSlot().getId(), ab.getInning());
            CellNotation notation = renderAtBat(ab);
            cells.merge(key, notation, this::merge);
        }

        for (SpielbogenStealingEvent st : stealings) {
            CellKey key = new CellKey(st.getSide(), st.getSlot().getId(), st.getInning());
            CellNotation existing = cells.computeIfAbsent(key, k -> new CellNotation("", false, null));
            existing.stealingArrow = new StealingArrow(st.getFromBase(), st.getToBase(), st.getType());
        }

        return cells;
    }

    private CellNotation renderAtBat(final SpielbogenAtBat ab) {
        boolean runScored = ab.getRunsScored() != null && ab.getRunsScored() > 0;
        if (Boolean.TRUE.equals(ab.getIsError()) && ab.getErrorPosition() != null) {
            return new CellNotation("E" + ab.getErrorPosition(), runScored, null);
        }
        return switch (ab.getResult()) {
            case SINGLE -> new CellNotation("1B", runScored, null);
            case DOUBLE -> new CellNotation("2B", runScored, null);
            case TRIPLE -> new CellNotation("3B", runScored, null);
            case HOMERUN -> new CellNotation("HR", true, null);
            case WALK -> new CellNotation("BB", runScored, null);
            case HIT_BY_PITCH -> new CellNotation("HP", runScored, null);
            case STRIKEOUT -> new CellNotation("K", false, null);
            case OUT -> new CellNotation(renderOutNotation(ab), false, null);
        };
    }

    private String renderOutNotation(final SpielbogenAtBat ab) {
        if (ab.getOutType() == null) return "OUT";
        if (ab.getFielderChain() != null && !ab.getFielderChain().isEmpty()) {
            String chain = String.join("-", ab.getFielderChain().stream().map(String::valueOf).toList());
            if (ab.getOutType() == OutType.DOUBLE_PLAY) return chain + " DP";
            if (ab.getOutType() == OutType.TRIPLE_PLAY) return chain + " TP";
            if (ab.getOutType() == OutType.FIELDERS_CHOICE) return "FC " + chain;
            if (ab.getOutType() == OutType.FLY && ab.getFielderChain().size() == 1) return "F" + ab.getFielderChain().get(0);
            return chain;
        }
        return switch (ab.getOutType()) {
            case GROUNDER -> "GO";
            case FLY -> "FO";
            case FOUL -> "FOUL";
            case UNASSISTED -> "U";
            case DOUBLE_PLAY -> "DP";
            case TRIPLE_PLAY -> "TP";
            case FORCE_OUT -> "FO";
            case TAG_OUT -> "TO";
            case FIELDERS_CHOICE -> "FC";
        };
    }

    private CellNotation merge(final CellNotation a, final CellNotation b) {
        return new CellNotation(a.label + " / " + b.label, a.runScored || b.runScored,
                                a.stealingArrow != null ? a.stealingArrow : b.stealingArrow);
    }

    public record CellKey(BogenSide side, Long slotId, Integer inning) {}

    public static class CellNotation {
        public String label;
        public boolean runScored;
        public StealingArrow stealingArrow;

        public CellNotation(String label, boolean runScored, StealingArrow stealingArrow) {
            this.label = label;
            this.runScored = runScored;
            this.stealingArrow = stealingArrow;
        }

        public String getLabel() { return label; }
        public boolean isRunScored() { return runScored; }
        public StealingArrow getStealingArrow() { return stealingArrow; }
    }

    public record StealingArrow(int fromBase, int toBase, StealingEventType type) {}
}
