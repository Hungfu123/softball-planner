package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import com.softball.adapter.out.persistence.entity.LineupSetEntryEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.LineupSet;
import com.softball.domain.model.LineupSetEntry;
import org.springframework.stereotype.Component;

@Component
public class LineupSetMapper {

    private final PlayerMapper playerMapper;
    private final SpringPlayerRepository playerRepo;

    public LineupSetMapper(final PlayerMapper playerMapper, final SpringPlayerRepository playerRepo) {
        this.playerMapper = playerMapper;
        this.playerRepo = playerRepo;
    }

    public LineupSet toDomain(final LineupSetEntity entity) {
        if (entity == null) return null;
        final LineupSet set = new LineupSet(entity.getGameDayId(), entity.getName(), entity.getSortOrder());
        set.setId(entity.getId());
        set.setCreatedAt(entity.getCreatedAt());
        set.setEntries(entity.getEntries().stream()
            .sorted((a, b) -> {
                final int g = Integer.compare(a.getGameNumber(), b.getGameNumber());
                return g != 0 ? g : Integer.compare(a.getBattingOrder(), b.getBattingOrder());
            })
            .map(this::toDomainEntry)
            .toList());
        return set;
    }

    private LineupSetEntry toDomainEntry(final LineupSetEntryEntity e) {
        final LineupSetEntry entry = new LineupSetEntry(
            e.getGameNumber(),
            playerMapper.toDomain(e.getPlayer()),
            e.getPosition(),
            e.getBattingOrder(),
            playerMapper.toDomain(e.getDhBatterPlayer())
        );
        entry.setId(e.getId());
        return entry;
    }

    public LineupSetEntity toEntity(final LineupSet domain) {
        final LineupSetEntity entity = new LineupSetEntity();
        entity.setId(domain.getId());
        entity.setGameDayId(domain.getGameDayId());
        entity.setName(domain.getName());
        if (domain.getCreatedAt() != null) entity.setCreatedAt(domain.getCreatedAt());
        entity.setSortOrder(domain.getSortOrder());
        entity.setEntries(domain.getEntries().stream().map(d -> {
            final LineupSetEntryEntity e = new LineupSetEntryEntity();
            e.setLineupSet(entity);
            e.setGameNumber(d.getGameNumber());
            e.setPlayer(playerRepo.getReferenceById(d.getPlayer().getId()));
            e.setPosition(d.getPosition());
            e.setBattingOrder(d.getBattingOrder());
            if (d.getDhBatterPlayer() != null) {
                e.setDhBatterPlayer(playerRepo.getReferenceById(d.getDhBatterPlayer().getId()));
            }
            return e;
        }).toList());
        return entity;
    }
}
