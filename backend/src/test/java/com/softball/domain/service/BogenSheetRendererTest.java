package com.softball.domain.service;

import com.softball.domain.model.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BogenSheetRendererTest {

    private final BogenSheetRenderer renderer = new BogenSheetRenderer();

    @Test
    void rendersSingle() {
        var ab = build(AtBatResult.SINGLE, null, null, false, null, 0);
        var cell = renderCell(ab);
        assertThat(cell.label).isEqualTo("1B");
        assertThat(cell.runScored).isFalse();
    }

    @Test
    void rendersHomerun() {
        var ab = build(AtBatResult.HOMERUN, null, null, false, null, 1);
        var cell = renderCell(ab);
        assertThat(cell.label).isEqualTo("HR");
        assertThat(cell.runScored).isTrue();
    }

    @Test
    void rendersWalk() {
        var ab = build(AtBatResult.WALK, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("BB");
    }

    @Test
    void rendersStrikeoutAsK() {
        var ab = build(AtBatResult.STRIKEOUT, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("K");
    }

    @Test
    void rendersOutWithFielderChain63() {
        var ab = build(AtBatResult.OUT, OutType.GROUNDER, List.of(6, 3), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("6-3");
    }

    @Test
    void rendersDoublePlay() {
        var ab = build(AtBatResult.OUT, OutType.DOUBLE_PLAY, List.of(6, 4, 3), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("6-4-3 DP");
    }

    @Test
    void rendersFlyOutOutfield() {
        var ab = build(AtBatResult.OUT, OutType.FLY, List.of(8), false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("F8");
    }

    @Test
    void rendersGenericOutWhenNoDetails() {
        var ab = build(AtBatResult.OUT, null, null, false, null, 0);
        assertThat(renderCell(ab).label).isEqualTo("OUT");
    }

    @Test
    void rendersErrorWithPosition() {
        var ab = build(AtBatResult.OUT, null, null, true, 5, 0);
        assertThat(renderCell(ab).label).isEqualTo("E5");
    }

    @Test
    void rendersStealingArrow() {
        SpielbogenStealingEvent st = new SpielbogenStealingEvent();
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(50L);
        st.setSlot(slot);
        st.setSide(BogenSide.HOME);
        st.setInning(1);
        st.setType(StealingEventType.STOLEN_BASE);
        st.setFromBase(1);
        st.setToBase(2);

        var cells = renderer.renderCells(List.of(), List.of(st), List.of());
        var cell = cells.get(new BogenSheetRenderer.CellKey(BogenSide.HOME, 50L, 1));
        assertThat(cell).isNotNull();
        assertThat(cell.stealingArrow).isNotNull();
        assertThat(cell.stealingArrow.fromBase()).isEqualTo(1);
        assertThat(cell.stealingArrow.toBase()).isEqualTo(2);
    }

    private BogenSheetRenderer.CellNotation renderCell(final SpielbogenAtBat ab) {
        var cells = renderer.renderCells(List.of(ab), List.of(), List.of());
        return cells.get(new BogenSheetRenderer.CellKey(ab.getSide(), ab.getSlot().getId(), ab.getInning()));
    }

    private SpielbogenAtBat build(AtBatResult result, OutType outType, List<Integer> chain,
                                  boolean isError, Integer errorPos, int runs) {
        SpielbogenAtBat ab = new SpielbogenAtBat();
        SpielbogenSlot slot = new SpielbogenSlot();
        slot.setId(1L);
        ab.setSlot(slot);
        ab.setSide(BogenSide.HOME);
        ab.setInning(1);
        ab.setResult(result);
        ab.setOutType(outType);
        ab.setFielderChain(chain);
        ab.setIsError(isError);
        ab.setErrorPosition(errorPos);
        ab.setRunsScored(runs);
        return ab;
    }
}
