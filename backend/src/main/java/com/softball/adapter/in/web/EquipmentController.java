package com.softball.adapter.in.web;

import com.softball.adapter.dto.EquipmentRequest;
import com.softball.adapter.dto.EquipmentResponse;
import com.softball.adapter.dto.GameDayEquipmentResponse;
import com.softball.adapter.dto.ToggleEquipmentRequest;
import com.softball.application.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(final EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping("/gamedays/{gameDayId}/equipment")
    public List<GameDayEquipmentResponse> getForGameDay(@PathVariable final Long gameDayId) {
        final Set<Long> used = equipmentService.usedItemIds(gameDayId);
        return equipmentService.findAll().stream()
            .map(i -> GameDayEquipmentResponse.from(i, used.contains(i.getId())))
            .toList();
    }

    @PostMapping("/gamedays/{gameDayId}/equipment")
    @ResponseStatus(HttpStatus.CREATED)
    public GameDayEquipmentResponse createForGameDay(@PathVariable final Long gameDayId,
                                                     @Valid @RequestBody final EquipmentRequest req) {
        return GameDayEquipmentResponse.from(equipmentService.createAndMarkUsed(
            gameDayId, req.name(), req.category(), req.quantity(), req.storageLocation(), req.notes()), true);
    }

    @PutMapping("/gamedays/{gameDayId}/equipment/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void toggle(@PathVariable final Long gameDayId, @PathVariable final Long itemId,
                       @Valid @RequestBody final ToggleEquipmentRequest req) {
        equipmentService.setUsed(gameDayId, itemId, req.used());
    }

    @PostMapping("/gamedays/{gameDayId}/equipment/carry-over")
    public List<GameDayEquipmentResponse> carryOver(@PathVariable final Long gameDayId) {
        equipmentService.carryOverFromLast(gameDayId);
        return getForGameDay(gameDayId);
    }

    @PutMapping("/equipment/{itemId}")
    public EquipmentResponse update(@PathVariable final Long itemId,
                                    @Valid @RequestBody final EquipmentRequest req) {
        return EquipmentResponse.from(equipmentService.update(
            itemId, req.name(), req.category(), req.quantity(), req.storageLocation(), req.notes()));
    }

    @DeleteMapping("/equipment/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long itemId) {
        equipmentService.delete(itemId);
    }
}
