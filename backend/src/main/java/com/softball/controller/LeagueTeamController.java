package com.softball.controller;

import com.softball.dto.CreateLeagueTeamRequest;
import com.softball.dto.LeagueTeamResponse;
import com.softball.dto.StandingsEntry;
import com.softball.service.LeagueTeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LeagueTeamController {

    private final LeagueTeamService leagueTeamService;

    public LeagueTeamController(final LeagueTeamService leagueTeamService) {
        this.leagueTeamService = leagueTeamService;
    }

    @GetMapping("/seasons/{seasonId}/teams")
    public List<LeagueTeamResponse> getTeams(@PathVariable final Long seasonId) {
        return leagueTeamService.findBySeasonId(seasonId).stream().map(LeagueTeamResponse::from).toList();
    }

    @PostMapping("/seasons/{seasonId}/teams")
    @ResponseStatus(HttpStatus.CREATED)
    public LeagueTeamResponse createTeam(@PathVariable final Long seasonId,
                                          @Valid @RequestBody final CreateLeagueTeamRequest request) {
        return LeagueTeamResponse.from(leagueTeamService.create(seasonId, request.name(), request.ownTeam()));
    }

    @PutMapping("/teams/{teamId}")
    public LeagueTeamResponse updateTeam(@PathVariable final Long teamId,
                                          @RequestBody final CreateLeagueTeamRequest request) {
        return LeagueTeamResponse.from(leagueTeamService.update(teamId, request.name(), request.ownTeam()));
    }

    @DeleteMapping("/teams/{teamId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTeam(@PathVariable final Long teamId) {
        leagueTeamService.delete(teamId);
    }

    @GetMapping("/seasons/{seasonId}/standings")
    public List<StandingsEntry> getStandings(@PathVariable final Long seasonId) {
        return leagueTeamService.getStandings(seasonId);
    }
}
