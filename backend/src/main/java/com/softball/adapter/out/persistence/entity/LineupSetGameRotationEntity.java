package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.CoachRotationPair;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "lineup_set_game_rotation")
public class LineupSetGameRotationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lineup_set_id", nullable = false)
    @JsonIgnore
    private LineupSetEntity lineupSet;

    @Column(name = "game_number", nullable = false)
    private Integer gameNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "first_base_pair", length = 20)
    private CoachRotationPair firstBasePair;

    @Column(name = "first_base_reversed", nullable = false)
    private boolean firstBaseReversed;

    @Enumerated(EnumType.STRING)
    @Column(name = "third_base_pair", length = 20)
    private CoachRotationPair thirdBasePair;

    @Column(name = "third_base_reversed", nullable = false)
    private boolean thirdBaseReversed;

    public LineupSetGameRotationEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public LineupSetEntity getLineupSet() { return lineupSet; }
    public void setLineupSet(final LineupSetEntity lineupSet) { this.lineupSet = lineupSet; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public CoachRotationPair getFirstBasePair() { return firstBasePair; }
    public void setFirstBasePair(final CoachRotationPair firstBasePair) { this.firstBasePair = firstBasePair; }
    public boolean isFirstBaseReversed() { return firstBaseReversed; }
    public void setFirstBaseReversed(final boolean firstBaseReversed) { this.firstBaseReversed = firstBaseReversed; }
    public CoachRotationPair getThirdBasePair() { return thirdBasePair; }
    public void setThirdBasePair(final CoachRotationPair thirdBasePair) { this.thirdBasePair = thirdBasePair; }
    public boolean isThirdBaseReversed() { return thirdBaseReversed; }
    public void setThirdBaseReversed(final boolean thirdBaseReversed) { this.thirdBaseReversed = thirdBaseReversed; }
}
