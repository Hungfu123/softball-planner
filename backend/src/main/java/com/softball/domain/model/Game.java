package com.softball.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Game {
    private Long id;
    private Integer gameNumber;
    private LeagueTeam opponentTeam;
    private Integer scoreUs;
    private Integer scoreThem;
    private GameDay gameDay;
    private int lineupEntryCount;
    private Instant endedAt;
    private String battingSide;
    private CoachRotationPair firstBaseCoachRotation;
    private CoachRotationPair thirdBaseCoachRotation;
    private boolean firstBaseCoachRotationReversed;
    private boolean thirdBaseCoachRotationReversed;
    private List<LineupEntry> lineupEntries = new ArrayList<>();
    private List<GameStaff> staff = new ArrayList<>();

    public Game() {}

    public Game(final Long id, final Integer gameNumber) {
        this.id = id;
        this.gameNumber = gameNumber;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Integer getGameNumber() { return gameNumber; }
    public void setGameNumber(final Integer gameNumber) { this.gameNumber = gameNumber; }
    public LeagueTeam getOpponentTeam() { return opponentTeam; }
    public void setOpponentTeam(final LeagueTeam opponentTeam) { this.opponentTeam = opponentTeam; }
    public Integer getScoreUs() { return scoreUs; }
    public void setScoreUs(final Integer scoreUs) { this.scoreUs = scoreUs; }
    public Integer getScoreThem() { return scoreThem; }
    public void setScoreThem(final Integer scoreThem) { this.scoreThem = scoreThem; }
    public GameDay getGameDay() { return gameDay; }
    public void setGameDay(final GameDay gameDay) { this.gameDay = gameDay; }
    public List<LineupEntry> getLineupEntries() { return lineupEntries; }
    public void setLineupEntries(final List<LineupEntry> lineupEntries) { this.lineupEntries = lineupEntries; }
    public int getLineupEntryCount() { return lineupEntryCount; }
    public void setLineupEntryCount(final int lineupEntryCount) { this.lineupEntryCount = lineupEntryCount; }
    public List<GameStaff> getStaff() { return staff; }
    public void setStaff(final List<GameStaff> staff) { this.staff = staff; }
    public Long getGameDayId() { return gameDay != null ? gameDay.getId() : null; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(final Instant endedAt) { this.endedAt = endedAt; }
    public String getBattingSide() { return battingSide; }
    public void setBattingSide(final String battingSide) { this.battingSide = battingSide; }
    public CoachRotationPair getFirstBaseCoachRotation() { return firstBaseCoachRotation; }
    public void setFirstBaseCoachRotation(final CoachRotationPair v) { this.firstBaseCoachRotation = v; }
    public CoachRotationPair getThirdBaseCoachRotation() { return thirdBaseCoachRotation; }
    public void setThirdBaseCoachRotation(final CoachRotationPair v) { this.thirdBaseCoachRotation = v; }
    public boolean isFirstBaseCoachRotationReversed() { return firstBaseCoachRotationReversed; }
    public void setFirstBaseCoachRotationReversed(final boolean v) { this.firstBaseCoachRotationReversed = v; }
    public boolean isThirdBaseCoachRotationReversed() { return thirdBaseCoachRotationReversed; }
    public void setThirdBaseCoachRotationReversed(final boolean v) { this.thirdBaseCoachRotationReversed = v; }
}
