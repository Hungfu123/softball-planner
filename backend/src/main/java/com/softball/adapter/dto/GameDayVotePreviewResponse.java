package com.softball.adapter.dto;

import com.softball.application.GameDayVoteSyncService.Preview;

import java.util.List;

public record GameDayVotePreviewResponse(
        boolean pollExists,
        boolean sent,
        List<PlayerRefDto> toAdd,
        List<RemovalDto> toRemove,
        List<OptionVotersDto> optionVoters,
        List<String> unknownVoters,
        int voteCount,
        int yesCount) {

    public record PlayerRefDto(Long id, String name) {}
    public record RemovalDto(Long playerId, String playerName, List<String> warnings) {}
    public record OptionVotersDto(String option, List<String> voters) {}

    public static GameDayVotePreviewResponse from(final Preview p) {
        return new GameDayVotePreviewResponse(
                p.pollExists(), p.sent(),
                p.toAdd().stream().map(a -> new PlayerRefDto(a.id(), a.name())).toList(),
                p.toRemove().stream().map(r -> new RemovalDto(r.playerId(), r.playerName(), r.warnings())).toList(),
                p.optionVoters().stream().map(o -> new OptionVotersDto(o.option(), o.voterNames())).toList(),
                p.unknownVoters(), p.voteCount(), p.yesCount());
    }
}
