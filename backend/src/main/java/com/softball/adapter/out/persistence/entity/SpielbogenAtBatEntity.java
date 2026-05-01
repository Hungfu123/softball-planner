package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "spielbogen_at_bat",
       uniqueConstraints = @UniqueConstraint(columnNames = {"bogen_id", "side", "sequence"}))
public class SpielbogenAtBatEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bogen_id", nullable = false)
    private SpielbogenEntity bogen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private SpielbogenSlotEntity slot;

    @Column(nullable = false)
    private String side;

    @Column(nullable = false)
    private Integer sequence;

    @Column(nullable = false)
    private Integer inning;

    @Column(nullable = false)
    private String result;

    @Column(name = "out_type")
    private String outType;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "fielder_chain", columnDefinition = "integer[]")
    private Integer[] fielderChain;

    @Column(name = "is_error", nullable = false)
    private Boolean isError = Boolean.FALSE;

    @Column(name = "error_position")
    private Integer errorPosition;

    @Column(name = "runs_scored", nullable = false)
    private Integer runsScored = 0;

    @Column(nullable = false)
    private Integer rbi = 0;

    @Column(name = "sacrifice_type")
    private String sacrificeType;

    @Column(name = "base_state_first")
    private Long baseStateFirst;

    @Column(name = "base_state_second")
    private Long baseStateSecond;

    @Column(name = "base_state_third")
    private Long baseStateThird;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SpielbogenEntity getBogen() { return bogen; }
    public void setBogen(SpielbogenEntity bogen) { this.bogen = bogen; }
    public SpielbogenSlotEntity getSlot() { return slot; }
    public void setSlot(SpielbogenSlotEntity slot) { this.slot = slot; }
    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }
    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }
    public Integer getInning() { return inning; }
    public void setInning(Integer inning) { this.inning = inning; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getOutType() { return outType; }
    public void setOutType(String outType) { this.outType = outType; }
    public Integer[] getFielderChain() { return fielderChain; }
    public void setFielderChain(Integer[] fielderChain) { this.fielderChain = fielderChain; }
    public Boolean getIsError() { return isError; }
    public void setIsError(Boolean isError) { this.isError = isError; }
    public Integer getErrorPosition() { return errorPosition; }
    public void setErrorPosition(Integer errorPosition) { this.errorPosition = errorPosition; }
    public Integer getRunsScored() { return runsScored; }
    public void setRunsScored(Integer runsScored) { this.runsScored = runsScored; }
    public Integer getRbi() { return rbi; }
    public void setRbi(Integer rbi) { this.rbi = rbi; }
    public String getSacrificeType() { return sacrificeType; }
    public void setSacrificeType(String sacrificeType) { this.sacrificeType = sacrificeType; }
    public Long getBaseStateFirst() { return baseStateFirst; }
    public void setBaseStateFirst(Long baseStateFirst) { this.baseStateFirst = baseStateFirst; }
    public Long getBaseStateSecond() { return baseStateSecond; }
    public void setBaseStateSecond(Long baseStateSecond) { this.baseStateSecond = baseStateSecond; }
    public Long getBaseStateThird() { return baseStateThird; }
    public void setBaseStateThird(Long baseStateThird) { this.baseStateThird = baseStateThird; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
