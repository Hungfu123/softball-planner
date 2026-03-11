package com.softball.repository;

import com.softball.entity.Car;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CarRepository extends JpaRepository<Car, Long> {
    List<Car> findByGameDay_Id(Long gameDayId);
    void deleteByGameDay_Id(Long gameDayId);
}
