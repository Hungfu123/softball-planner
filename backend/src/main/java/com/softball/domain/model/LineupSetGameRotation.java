package com.softball.domain.model;

/**
 * Coach-Rotation eines Spiels innerhalb eines Lineup-Sets.
 * Die Rotation liegt sonst am {@link Game} — als Teil des Set-Snapshots
 * bleibt sie beim Laden eines Sets erhalten statt vom Vorgaenger zu leaken.
 */
public class LineupSetGameRotation {
    private Long id;
    private Integer gameNumber;
    private CoachRotationPair firstBase;
    private boolean firstBaseReversed;
    private CoachRotationPair thirdBase;
    private boolean thirdBaseReversed;

    public LineupSetGameRotation() {}

    public LineupSetGameRotation(final Integer gameNumber,
                                 final CoachRotationPair firstBase, final boolean firstBaseReversed,
                                 final CoachRotationPair thirdBase, final boolean thirdBaseReversed) {
        this.gameNumber = gameNumber;
        this.firstBase = firstBase;
        this.firstBaseReversed = firstBaseReversed;
        this.thirdBase = thirdBase;
        this.thirdBaseReversed = thirdBaseReversed;
    }

    /** true, wenn keine der beiden Basen eine Rotation hat — solche Zeilen werden nicht gespeichert. */
    public boolean isEmpty() {
        return firstBase == null && thirdBase == null;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public CoachRotationPair getFirstBase() { return firstBase; }
    public void setFirstBase(final CoachRotationPair firstBase) { this.firstBase = firstBase; }
    public boolean isFirstBaseReversed() { return firstBaseReversed; }
    public void setFirstBaseReversed(final boolean firstBaseReversed) { this.firstBaseReversed = firstBaseReversed; }
    public CoachRotationPair getThirdBase() { return thirdBase; }
    public void setThirdBase(final CoachRotationPair thirdBase) { this.thirdBase = thirdBase; }
    public boolean isThirdBaseReversed() { return thirdBaseReversed; }
    public void setThirdBaseReversed(final boolean thirdBaseReversed) { this.thirdBaseReversed = thirdBaseReversed; }
}
