package com.softball.adapter.in.web;

import com.softball.adapter.dto.DrillResponse;
import com.softball.application.DrillService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drills")
public class DrillController {

    private final DrillService drillService;

    public DrillController(final DrillService drillService) {
        this.drillService = drillService;
    }

    @GetMapping
    public List<DrillResponse> getAll(@RequestParam(required = false) final String focus,
                                      @RequestParam(required = false) final Integer maxPlayers) {
        if (focus != null && maxPlayers != null) {
            return drillService.findFiltered(focus, maxPlayers).stream()
                    .map(DrillResponse::from)
                    .toList();
        }
        return drillService.findAll().stream()
                .map(DrillResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public DrillResponse getById(@PathVariable final String id) {
        return drillService.findById(id)
                .map(DrillResponse::from)
                .orElseThrow(() -> new com.softball.shared.exception.ResourceNotFoundException("Drill not found: " + id));
    }
}
