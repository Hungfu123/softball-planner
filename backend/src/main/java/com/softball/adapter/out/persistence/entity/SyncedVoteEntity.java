package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "whatsapp_synced_vote", uniqueConstraints = {
    @UniqueConstraint(name = "uq_synced_vote", columnNames = {"training_id", "voter_name"})
})
public class SyncedVoteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "voter_name", nullable = false)
    private String voterName;

    @Column(name = "player_id")
    private Long playerId;

    @Column(nullable = false)
    private boolean present;

    public SyncedVoteEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(final Long trainingId) { this.trainingId = trainingId; }
    public String getVoterName() { return voterName; }
    public void setVoterName(final String voterName) { this.voterName = voterName; }
    public Long getPlayerId() { return playerId; }
    public void setPlayerId(final Long playerId) { this.playerId = playerId; }
    public boolean isPresent() { return present; }
    public void setPresent(final boolean present) { this.present = present; }
}
