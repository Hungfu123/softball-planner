package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.CarMapper;
import com.softball.adapter.out.persistence.repository.SpringCarRepository;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.domain.model.Car;
import com.softball.domain.port.out.CarRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class CarRepositoryAdapter implements CarRepository {

    private final SpringCarRepository repo;
    private final SpringGameDayRepository gameDayRepo;
    private final SpringPlayerRepository playerRepo;
    private final CarMapper mapper;

    public CarRepositoryAdapter(final SpringCarRepository repo,
                                 final SpringGameDayRepository gameDayRepo,
                                 final SpringPlayerRepository playerRepo,
                                 final CarMapper mapper) {
        this.repo = repo;
        this.gameDayRepo = gameDayRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<Car> findByGameDayId(final Long gameDayId) {
        return repo.findByGameDay_Id(gameDayId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Car> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Car save(final Car car) {
        GameDayEntity gameDayEntity = gameDayRepo.getReferenceById(car.getGameDay().getId());
        PlayerEntity driverEntity = playerRepo.getReferenceById(car.getDriver().getId());
        var entity = mapper.toEntity(car, gameDayEntity, driverEntity);
        if (car.getId() != null) {
            var existing = repo.findById(car.getId()).orElse(null);
            if (existing != null) {
                existing.setDriver(driverEntity);
                existing.setTotalSeats(car.getTotalSeats());
                existing.setDirection(car.getDirection());
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteByGameDayId(final Long gameDayId) {
        repo.deleteByGameDay_Id(gameDayId);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public void deleteAll(final List<Car> cars) {
        var ids = cars.stream().map(Car::getId).filter(id -> id != null).toList();
        if (!ids.isEmpty()) {
            repo.deleteAllById(ids);
        }
    }
}
