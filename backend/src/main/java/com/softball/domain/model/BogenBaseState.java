package com.softball.domain.model;

public class BogenBaseState {
    private Long firstSlotId;
    private Long secondSlotId;
    private Long thirdSlotId;

    public BogenBaseState() {}

    public BogenBaseState(final Long firstSlotId, final Long secondSlotId, final Long thirdSlotId) {
        this.firstSlotId = firstSlotId;
        this.secondSlotId = secondSlotId;
        this.thirdSlotId = thirdSlotId;
    }

    public Long getFirstSlotId() { return firstSlotId; }
    public void setFirstSlotId(final Long firstSlotId) { this.firstSlotId = firstSlotId; }
    public Long getSecondSlotId() { return secondSlotId; }
    public void setSecondSlotId(final Long secondSlotId) { this.secondSlotId = secondSlotId; }
    public Long getThirdSlotId() { return thirdSlotId; }
    public void setThirdSlotId(final Long thirdSlotId) { this.thirdSlotId = thirdSlotId; }

    public static BogenBaseState empty() {
        return new BogenBaseState(null, null, null);
    }
}
