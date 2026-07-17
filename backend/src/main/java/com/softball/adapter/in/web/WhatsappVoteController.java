package com.softball.adapter.in.web;

import com.softball.adapter.dto.AssignNewVoterRequest;
import com.softball.adapter.dto.AssignVoterRequest;
import com.softball.adapter.dto.PlayerResponse;
import com.softball.adapter.dto.UnknownVoterResponse;
import com.softball.application.PollVoteSyncService;
import com.softball.application.VoterAssignmentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orga/whatsapp")
public class WhatsappVoteController {

    private final PollVoteSyncService syncService;
    private final VoterAssignmentService assignmentService;

    public WhatsappVoteController(final PollVoteSyncService syncService,
                                  final VoterAssignmentService assignmentService) {
        this.syncService = syncService;
        this.assignmentService = assignmentService;
    }

    @PostMapping("/sync")
    public Map<String, Integer> sync() {
        return Map.of("synced", syncService.syncNow());
    }

    @GetMapping("/unknown-voters")
    public List<UnknownVoterResponse> unknownVoters() {
        return assignmentService.unknownVoters().stream().map(UnknownVoterResponse::from).toList();
    }

    @PostMapping("/assign")
    public PlayerResponse assign(@Valid @RequestBody final AssignVoterRequest req) {
        return PlayerResponse.from(assignmentService.assignExisting(req.voterName(), req.playerId()));
    }

    @PostMapping("/assign-new")
    public PlayerResponse assignNew(@Valid @RequestBody final AssignNewVoterRequest req) {
        return PlayerResponse.from(assignmentService.assignNew(req.voterName(), req.playerName()));
    }
}
