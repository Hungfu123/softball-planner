package com.softball.domain.model;

public class InvitationGame {
    private String time;
    private String teamA;
    private String teamB;
    private String ump;

    public InvitationGame() {}

    public String getTime() { return time; }
    public void setTime(final String time) { this.time = time; }
    public String getTeamA() { return teamA; }
    public void setTeamA(final String teamA) { this.teamA = teamA; }
    public String getTeamB() { return teamB; }
    public void setTeamB(final String teamB) { this.teamB = teamB; }
    public String getUmp() { return ump; }
    public void setUmp(final String ump) { this.ump = ump; }
}
