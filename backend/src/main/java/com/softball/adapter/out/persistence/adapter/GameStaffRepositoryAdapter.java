package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.GameStaffMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringGameStaffRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.GameStaff;
import com.softball.domain.port.out.GameStaffRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class GameStaffRepositoryAdapter implements GameStaffRepository {

    private final SpringGameStaffRepository repo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final GameStaffMapper mapper;

    public GameStaffRepositoryAdapter(final SpringGameStaffRepository repo,
                                       final SpringGameRepository gameRepo,
                                       final SpringPlayerRepository playerRepo,
                                       final GameStaffMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<GameStaff> findByGameId(final Long gameId) {
        return repo.findByGameId(gameId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<GameStaff> findByGameIdIn(final List<Long> gameIds) {
        return repo.findByGameIdIn(gameIds).stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional
    public void deleteByGameId(final Long gameId) {
        repo.deleteByGameId(gameId);
    }

    @Override
    public GameStaff save(final GameStaff staff) {
        GameEntity gameEntity = gameRepo.getReferenceById(staff.getGame().getId());
        PlayerEntity playerEntity = playerRepo.getReferenceById(staff.getPlayer().getId());
        var entity = mapper.toEntity(staff, gameEntity, playerEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public List<GameStaff> saveAll(final List<GameStaff> staffList) {
        var entities = staffList.stream().map(staff -> {
            GameEntity gameEntity = gameRepo.getReferenceById(staff.getGame().getId());
            PlayerEntity playerEntity = playerRepo.getReferenceById(staff.getPlayer().getId());
            return mapper.toEntity(staff, gameEntity, playerEntity);
        }).toList();
        return repo.saveAll(entities).stream().map(mapper::toDomain).toList();
    }

    @Override
    public void flush() {
        repo.flush();
    }

    @Override
    public void deleteAll(final List<GameStaff> staff) {
        var ids = staff.stream().map(GameStaff::getId).filter(id -> id != null).toList();
        if (!ids.isEmpty()) {
            repo.deleteAllById(ids);
        }
    }
}
