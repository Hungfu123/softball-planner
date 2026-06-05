package com.softball.domain.model;

/** Eine Batting-Station im Trainings-Setup (eigenes Set, entkoppelt von Plan-Drills). */
public class TrainingStation {
    private StationType type;
    private String label;
    private StationLevel level;
    private Integer choiceGroup;
    /** Normalisierte Feld-Position 0..1 (links→rechts / oben→unten). Null = Auto-Platz. */
    private Double x;
    private Double y;

    public TrainingStation() {}

    public StationType getType() { return type; }
    public void setType(final StationType type) { this.type = type; }
    public String getLabel() { return label; }
    public void setLabel(final String label) { this.label = label; }
    public StationLevel getLevel() { return level; }
    public void setLevel(final StationLevel level) { this.level = level; }
    public Integer getChoiceGroup() { return choiceGroup; }
    public void setChoiceGroup(final Integer choiceGroup) { this.choiceGroup = choiceGroup; }
    public Double getX() { return x; }
    public void setX(final Double x) { this.x = x; }
    public Double getY() { return y; }
    public void setY(final Double y) { this.y = y; }
}
