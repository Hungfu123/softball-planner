package com.softball.adapter.in.web;

import com.softball.adapter.dto.EquipmentRequest;
import com.softball.adapter.dto.EquipmentResponse;
import com.softball.application.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(final EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping("/equipment")
    public List<EquipmentResponse> getCatalog() {
        return equipmentService.findAll().stream().map(EquipmentResponse::from).toList();
    }

    @PostMapping("/equipment")
    @ResponseStatus(HttpStatus.CREATED)
    public EquipmentResponse createCatalogItem(@Valid @RequestBody final EquipmentRequest req) {
        return EquipmentResponse.from(equipmentService.create(
            req.name(), req.quantity(), req.storageLocation(), req.notes()));
    }

    @PutMapping("/equipment/{itemId}")
    public EquipmentResponse update(@PathVariable final Long itemId,
                                    @Valid @RequestBody final EquipmentRequest req) {
        return EquipmentResponse.from(equipmentService.update(
            itemId, req.name(), req.quantity(), req.storageLocation(), req.notes()));
    }

    @DeleteMapping("/equipment/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long itemId) {
        equipmentService.delete(itemId);
    }
}
