package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameDayEquipmentEntity;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayEquipmentRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.domain.port.out.GameDayEquipmentRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class GameDayEquipmentRepositoryAdapter implements GameDayEquipmentRepository {

    private final SpringGameDayEquipmentRepository repo;
    private final SpringGameDayRepository gameDayRepo;
    private final SpringEquipmentItemRepository itemRepo;

    public GameDayEquipmentRepositoryAdapter(final SpringGameDayEquipmentRepository repo,
                                             final SpringGameDayRepository gameDayRepo,
                                             final SpringEquipmentItemRepository itemRepo) {
        this.repo = repo;
        this.gameDayRepo = gameDayRepo;
        this.itemRepo = itemRepo;
    }

    @Override
    public Set<Long> findUsedItemIds(final Long gameDayId) {
        return new HashSet<>(repo.findItemIdsByGameDayId(gameDayId));
    }

    @Override
    public void markUsed(final Long gameDayId, final Long itemId) {
        if (repo.existsByGameDay_IdAndItem_Id(gameDayId, itemId)) return;
        repo.save(new GameDayEquipmentEntity(
            gameDayRepo.getReferenceById(gameDayId),
            itemRepo.getReferenceById(itemId)));
    }

    @Override
    @Transactional
    public void markUnused(final Long gameDayId, final Long itemId) {
        repo.deleteByGameDay_IdAndItem_Id(gameDayId, itemId);
    }

    @Override
    public Optional<Long> findMostRecentGameDayIdWithUsageBefore(final Long seasonId, final LocalDate date) {
        final List<Long> ids = repo.findGameDayIdsWithUsageBefore(seasonId, date);
        return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
    }
}
