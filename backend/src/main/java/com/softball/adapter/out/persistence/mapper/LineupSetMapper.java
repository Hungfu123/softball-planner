package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.LineupSetAvailablePlayerEntity;
import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import com.softball.adapter.out.persistence.entity.LineupSetEntryEntity;
import com.softball.adapter.out.persistence.entity.LineupSetGameRotationEntity;
import com.softball.adapter.out.persistence.entity.LineupSetStaffEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.LineupSet;
import com.softball.domain.model.LineupSetEntry;
import com.softball.domain.model.LineupSetGameRotation;
import com.softball.domain.model.LineupSetStaffEntry;
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
        set.setStaffEntries(entity.getStaff().stream()
            .map(s -> {
                final LineupSetStaffEntry e = new LineupSetStaffEntry(
                    s.getGameNumber(), playerMapper.toDomain(s.getPlayer()), s.getRole());
                e.setId(s.getId());
                return e;
            })
            .toList());
        set.setAvailablePlayerIds(entity.getAvailablePlayers().stream()
            .map(a -> a.getPlayer().getId())
            .toList());
        set.setGameRotations(entity.getGameRotations().stream()
            .sorted((a, b) -> Integer.compare(a.getGameNumber(), b.getGameNumber()))
            .map(r -> {
                final LineupSetGameRotation rot = new LineupSetGameRotation(
                    r.getGameNumber(),
                    r.getFirstBasePair(), r.isFirstBaseReversed(),
                    r.getThirdBasePair(), r.isThirdBaseReversed());
                rot.setId(r.getId());
                return rot;
            })
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
        entity.setStaff(domain.getStaffEntries().stream().map(d -> {
            final LineupSetStaffEntity e = new LineupSetStaffEntity();
            e.setLineupSet(entity);
            e.setGameNumber(d.getGameNumber());
            e.setPlayer(playerRepo.getReferenceById(d.getPlayer().getId()));
            e.setRole(d.getRole());
            return e;
        }).toList());
        entity.setGameRotations(domain.getGameRotations().stream()
            .filter(r -> !r.isEmpty())
            .map(r -> {
                final LineupSetGameRotationEntity e = new LineupSetGameRotationEntity();
                e.setLineupSet(entity);
                e.setGameNumber(r.getGameNumber());
                e.setFirstBasePair(r.getFirstBase());
                e.setFirstBaseReversed(r.isFirstBaseReversed());
                e.setThirdBasePair(r.getThirdBase());
                e.setThirdBaseReversed(r.isThirdBaseReversed());
                return e;
            }).toList());
        entity.setAvailablePlayers(domain.getAvailablePlayerIds().stream().map(pid -> {
            final LineupSetAvailablePlayerEntity a = new LineupSetAvailablePlayerEntity();
            a.setLineupSet(entity);
            a.setPlayer(playerRepo.getReferenceById(pid));
            return a;
        }).toList());
        return entity;
    }
}
