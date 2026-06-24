package com.softball.application;

import com.softball.domain.model.EquipmentItem;
import com.softball.domain.model.GameDay;
import com.softball.domain.port.out.EquipmentItemRepository;
import com.softball.domain.port.out.GameDayEquipmentRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class EquipmentService {

    private static final Logger log = LoggerFactory.getLogger(EquipmentService.class);

    private final EquipmentItemRepository itemRepository;
    private final GameDayEquipmentRepository usageRepository;
    private final GameDayRepository gameDayRepository;

    public EquipmentService(final EquipmentItemRepository itemRepository,
                            final GameDayEquipmentRepository usageRepository,
                            final GameDayRepository gameDayRepository) {
        this.itemRepository = itemRepository;
        this.usageRepository = usageRepository;
        this.gameDayRepository = gameDayRepository;
    }

    @Transactional(readOnly = true)
    public List<EquipmentItem> findAll() {
        return itemRepository.findAllOrdered();
    }

    @Transactional(readOnly = true)
    public Set<Long> usedItemIds(final Long gameDayId) {
        return usageRepository.findUsedItemIds(gameDayId);
    }

    @Transactional
    public EquipmentItem create(final String name, final String category, final int quantity,
                                final String storageLocation, final String notes) {
        log.info("Material anlegen: {} ({}, x{})", name, category, quantity);
        return itemRepository.save(new EquipmentItem(null, name, category, quantity, storageLocation, notes));
    }

    @Transactional
    public EquipmentItem createAndMarkUsed(final Long gameDayId, final String name, final String category,
                                           final int quantity, final String storageLocation, final String notes) {
        requireGameDay(gameDayId);
        final EquipmentItem created = create(name, category, quantity, storageLocation, notes);
        usageRepository.markUsed(gameDayId, created.getId());
        return created;
    }

    @Transactional
    public EquipmentItem update(final Long itemId, final String name, final String category, final int quantity,
                                final String storageLocation, final String notes) {
        final EquipmentItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        item.setName(name);
        item.setCategory(category);
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

    @Transactional
    public void setUsed(final Long gameDayId, final Long itemId, final boolean used) {
        requireGameDay(gameDayId);
        itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("EquipmentItem", itemId));
        log.info("Material {} für Spieltag {}: {}", itemId, gameDayId, used ? "eingepackt" : "ausgepackt");
        if (used) {
            usageRepository.markUsed(gameDayId, itemId);
        } else {
            usageRepository.markUnused(gameDayId, itemId);
        }
    }

    @Transactional
    public Set<Long> carryOverFromLast(final Long gameDayId) {
        final GameDay gameDay = requireGameDay(gameDayId);
        usageRepository.findMostRecentGameDayIdWithUsageBefore(gameDay.getSeasonId(), gameDay.getDate())
            .ifPresent(prevId -> {
                log.info("Carry-Over für Spieltag {} von Spieltag {}", gameDayId, prevId);
                usageRepository.findUsedItemIds(prevId)
                    .forEach(itemId -> usageRepository.markUsed(gameDayId, itemId));
            });
        return usageRepository.findUsedItemIds(gameDayId);
    }

    private GameDay requireGameDay(final Long gameDayId) {
        return gameDayRepository.findById(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
    }
}
