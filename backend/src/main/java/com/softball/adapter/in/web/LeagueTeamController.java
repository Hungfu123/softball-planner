package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.CreateLeagueTeamRequest;
import com.softball.adapter.dto.LeagueTeamResponse;
import com.softball.adapter.dto.StandingsEntry;
import com.softball.adapter.dto.TeamDirectoryEntry;
import com.softball.adapter.dto.RenameClubRequest;
import com.softball.application.LeagueTeamService;
import com.softball.application.TeamDirectoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api")
public class LeagueTeamController {

    private final LeagueTeamService leagueTeamService;
    private final TeamDirectoryService teamDirectoryService;

    public LeagueTeamController(final LeagueTeamService leagueTeamService,
                                final TeamDirectoryService teamDirectoryService) {
        this.leagueTeamService = leagueTeamService;
        this.teamDirectoryService = teamDirectoryService;
    }

    @GetMapping("/teams/directory")
    public List<TeamDirectoryEntry> getTeamDirectory() {
        return teamDirectoryService.getDirectory();
    }

    @PutMapping("/teams/directory/rename")
    public List<TeamDirectoryEntry> renameClub(@Valid @RequestBody final RenameClubRequest request) {
        teamDirectoryService.renameClub(request.currentName(), request.newName());
        return teamDirectoryService.getDirectory();
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
