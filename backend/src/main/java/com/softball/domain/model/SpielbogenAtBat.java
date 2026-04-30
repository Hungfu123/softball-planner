package com.softball.domain.model;

import java.time.Instant;
import java.util.List;

public class SpielbogenAtBat {
    private Long id;
    private Spielbogen bogen;
    private SpielbogenSlot slot;
    private BogenSide side;
    private Integer sequence;
    private Integer inning;
    private AtBatResult result;
    private OutType outType;
    private List<Integer> fielderChain;
    private Boolean isError;
    private Integer errorPosition;
    private Integer runsScored;
    private Integer rbi;
    private BogenBaseState baseStateAfter;
    private Instant createdAt;
    private String createdBy;

    public SpielbogenAtBat() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Spielbogen getBogen() { return bogen; }
    public void setBogen(final Spielbogen bogen) { this.bogen = bogen; }
    public SpielbogenSlot getSlot() { return slot; }
    public void setSlot(final SpielbogenSlot slot) { this.slot = slot; }
    public BogenSide getSide() { return side; }
    public void setSide(final BogenSide side) { this.side = side; }
    public Integer getSequence() { return sequence; }
    public void setSequence(final Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(final Integer inning) { this.inning = inning; }
    public AtBatResult getResult() { return result; }
    public void setResult(final AtBatResult result) { this.result = result; }
    public OutType getOutType() { return outType; }
    public void setOutType(final OutType outType) { this.outType = outType; }
    public List<Integer> getFielderChain() { return fielderChain; }
    public void setFielderChain(final List<Integer> fielderChain) { this.fielderChain = fielderChain; }
    public Boolean getIsError() { return isError; }
    public void setIsError(final Boolean isError) { this.isError = isError; }
    public Integer getErrorPosition() { return errorPosition; }
    public void setErrorPosition(final Integer errorPosition) { this.errorPosition = errorPosition; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(final Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(final Integer rbi) { this.rbi = rbi; }
    public BogenBaseState getBaseStateAfter() { return baseStateAfter; }
    public void setBaseStateAfter(final BogenBaseState baseStateAfter) { this.baseStateAfter = baseStateAfter; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(final String createdBy) { this.createdBy = createdBy; }
}
