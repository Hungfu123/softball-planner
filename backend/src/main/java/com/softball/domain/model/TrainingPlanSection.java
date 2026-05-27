package com.softball.domain.model;

public class TrainingPlanSection {
    private String drillId;
    private String sectionType;
    private String title;
    private Integer durationMinutes;
    private Integer rounds;
    private String adaptationNotes;
    private String rotationPlan;
    private String setupNotes;
    private String tips;
    private String groupSetup;
    private String userNotes;
    private Integer parallelGroup;
    private Integer playersPerGroup;
    private SectionGroup group = SectionGroup.ALL;

    public TrainingPlanSection() {}

    public String getDrillId() { return drillId; }
    public void setDrillId(final String drillId) { this.drillId = drillId; }
    public String getSectionType() { return sectionType; }
    public void setSectionType(final String sectionType) { this.sectionType = sectionType; }
    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(final Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Integer getRounds() { return rounds; }
    public void setRounds(final Integer rounds) { this.rounds = rounds; }
    public String getAdaptationNotes() { return adaptationNotes; }
    public void setAdaptationNotes(final String adaptationNotes) { this.adaptationNotes = adaptationNotes; }
    public String getRotationPlan() { return rotationPlan; }
    public void setRotationPlan(final String rotationPlan) { this.rotationPlan = rotationPlan; }
    public String getSetupNotes() { return setupNotes; }
    public void setSetupNotes(final String setupNotes) { this.setupNotes = setupNotes; }
    public String getTips() { return tips; }
    public void setTips(final String tips) { this.tips = tips; }
    public String getGroupSetup() { return groupSetup; }
    public void setGroupSetup(final String groupSetup) { this.groupSetup = groupSetup; }
    public String getUserNotes() { return userNotes; }
    public void setUserNotes(final String userNotes) { this.userNotes = userNotes; }
    public Integer getParallelGroup() { return parallelGroup; }
    public void setParallelGroup(final Integer parallelGroup) { this.parallelGroup = parallelGroup; }
    public Integer getPlayersPerGroup() { return playersPerGroup; }
    public void setPlayersPerGroup(final Integer playersPerGroup) { this.playersPerGroup = playersPerGroup; }
    public SectionGroup getGroup() { return group != null ? group : SectionGroup.ALL; }
    public void setGroup(final SectionGroup group) { this.group = group; }
}
