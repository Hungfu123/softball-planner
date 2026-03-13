package com.softball.domain.port.out;

import com.softball.domain.model.Car;
import java.util.List;
import java.util.Optional;

public interface CarRepository {
    List<Car> findByGameDayId(Long gameDayId);
    Optional<Car> findById(Long id);
    Car save(Car car);
    void deleteById(Long id);
    void deleteByGameDayId(Long gameDayId);
    void deleteAll(List<Car> cars);
    boolean existsById(Long id);
}
