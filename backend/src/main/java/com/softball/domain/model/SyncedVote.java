package com.softball.domain.model;

public class SyncedVote {
    private Long id;
    private Long trainingId;
    private String voterName;
    private Long playerId;
    private boolean present;

    public SyncedVote() {}

    public SyncedVote(final Long trainingId, final String voterName, final Long playerId, final boolean present) {
        this.trainingId = trainingId;
        this.voterName = voterName;
        this.playerId = playerId;
        this.present = present;
    }

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
