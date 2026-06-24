package com.softball.domain.port.out;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

public interface GameDayEquipmentRepository {
    Set<Long> findUsedItemIds(Long gameDayId);
    void markUsed(Long gameDayId, Long itemId);
    void markUnused(Long gameDayId, Long itemId);
    Optional<Long> findMostRecentGameDayIdWithUsageBefore(Long seasonId, LocalDate date);
}
