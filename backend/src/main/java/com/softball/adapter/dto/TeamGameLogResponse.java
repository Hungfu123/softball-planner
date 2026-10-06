package com.softball.adapter.dto;

import com.softball.domain.model.TeamGameLog;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record TeamGameLogResponse(
    Long gameId,
    LocalDate date,
    String opponent,
    String league,
    Integer year,
    Integer scoreUs,
    Integer scoreThem,
    boolean hasAtBatData,
    int plateAppearances,
    int atBats,
    int hits,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int strikeouts,
    int hitByPitch,
    int onBase,
    int leftOnBase,
    List<StrandedPlayerResponse> stranded,
    List<InningLogResponse> innings
) {
    public static TeamGameLogResponse from(final TeamGameLog log) {
        return new TeamGameLogResponse(
            log.gameId(), log.date(), log.opponent(), log.league(), log.year(),
            log.scoreUs(), log.scoreThem(), log.hasAtBatData(),
            log.plateAppearances(), log.atBats(), log.hits(), log.doubles(), log.triples(), log.homeRuns(),
            log.walks(), log.strikeouts(), log.hitByPitch(), log.onBase(), log.leftOnBase(),
            log.strandedByPlayer().entrySet().stream()
                .map(e -> new StrandedPlayerResponse(e.getKey(), e.getValue())).toList(),
            log.innings().stream().map(InningLogResponse::from).toList()
        );
    }

    /** Runner, die im Spiel auf Base kamen, aber nicht Home — mit Häufigkeit. */
    public record StrandedPlayerResponse(String playerName, int times) {}

    /**
     * Offensiv-Verlauf eines Halb-Innings.
     * outMaker: wessen At-Bat das Inning beendet hat (null ohne Out-Ende).
     * hitsByPlayer: wer in diesem Inning traf (Basis für den Hit-Verlauf pro Spieler).
     */
    public record InningLogResponse(int inning, int runs, int hits, int onBase, int walks, int outs, List<String> stranded, String outMaker, Map<String, Integer> hitsByPlayer) {
        public static InningLogResponse from(final TeamGameLog.InningLog inning) {
            return new InningLogResponse(inning.inning(), inning.runs(), inning.hits(),
                inning.onBase(), inning.walks(), inning.outs(), inning.stranded(),
                inning.outMaker(), inning.hitsByPlayer());
        }
    }
}
