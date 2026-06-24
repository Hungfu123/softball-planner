package com.softball.application;

import com.softball.domain.model.EquipmentItem;
import com.softball.domain.port.out.EquipmentItemRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EquipmentService {

    private static final Logger log = LoggerFactory.getLogger(EquipmentService.class);

    private final EquipmentItemRepository itemRepository;

    public EquipmentService(final EquipmentItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public List<EquipmentItem> findAll() {
        return itemRepository.findAllOrdered();
    }

    @Transactional
    public EquipmentItem create(final String name, final int quantity,
                                final String storageLocation, final String notes) {
        log.info("Material anlegen: {} (x{})", name, quantity);
        return itemRepository.save(new EquipmentItem(null, name, quantity, storageLocation, notes));
    }

    @Transactional
    public EquipmentItem update(final Long itemId, final String name, final int quantity,
                                final String storageLocation, final String notes) {
        final EquipmentItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        item.setName(name);
        item.setQuantity(quantity);
        item.setStorageLocation(storageLocation);
        item.setNotes(notes);
        log.info("Material bearbeiten: {} ({})", name, itemId);
        return itemRepository.save(item);
    }

    @Transactional
    public void delete(final Long itemId) {
        itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        log.info("Material löschen: {}", itemId);
        itemRepository.deleteById(itemId);
    }
}
