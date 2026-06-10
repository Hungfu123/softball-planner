package com.softball.adapter.in.web;

import com.softball.adapter.dto.CreateLineupSetRequest;
import com.softball.adapter.dto.LineupSetResponse;
import com.softball.adapter.dto.RenameLineupSetRequest;
import com.softball.application.LineupSetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LineupSetController {

    private final LineupSetService lineupSetService;

    public LineupSetController(final LineupSetService lineupSetService) {
        this.lineupSetService = lineupSetService;
    }

    @GetMapping("/gamedays/{gameDayId}/lineup-sets")
    public List<LineupSetResponse> list(@PathVariable final Long gameDayId) {
        return lineupSetService.findByGameDay(gameDayId).stream().map(LineupSetResponse::from).toList();
    }

    @PostMapping("/gamedays/{gameDayId}/lineup-sets")
    @ResponseStatus(HttpStatus.CREATED)
    public LineupSetResponse create(@PathVariable final Long gameDayId,
                                    @Valid @RequestBody final CreateLineupSetRequest request) {
        return LineupSetResponse.from(lineupSetService.snapshot(gameDayId, request.name()));
    }

    @PatchMapping("/lineup-sets/{id}")
    public LineupSetResponse rename(@PathVariable final Long id,
                                    @Valid @RequestBody final RenameLineupSetRequest request) {
        return LineupSetResponse.from(lineupSetService.rename(id, request.name()));
    }

    @DeleteMapping("/lineup-sets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        lineupSetService.delete(id);
    }
}
