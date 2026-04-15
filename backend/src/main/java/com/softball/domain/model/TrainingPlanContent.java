package com.softball.domain.model;

import java.util.List;

public class TrainingPlanContent {
    private List<TrainingPlanSection> sections;
    private String groupDistributionHint;
    private String overallNotes;

    public TrainingPlanContent() {}

    public TrainingPlanContent(final List<TrainingPlanSection> sections, final String groupDistributionHint,
                               final String overallNotes) {
        this.sections = sections;
        this.groupDistributionHint = groupDistributionHint;
        this.overallNotes = overallNotes;
    }

    public List<TrainingPlanSection> getSections() { return sections; }
    public void setSections(final List<TrainingPlanSection> sections) { this.sections = sections; }
    public String getGroupDistributionHint() { return groupDistributionHint; }
    public void setGroupDistributionHint(final String groupDistributionHint) { this.groupDistributionHint = groupDistributionHint; }
    public String getOverallNotes() { return overallNotes; }
    public void setOverallNotes(final String overallNotes) { this.overallNotes = overallNotes; }
}
