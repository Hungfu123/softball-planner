package com.softball.service;

import com.softball.dto.CreateCarRequest;
import com.softball.dto.UpdateCarRequest;
import com.softball.entity.*;
import com.softball.exception.BusinessValidationException;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.CarRepository;
import com.softball.repository.GameDayRepository;
import com.softball.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CarService {

    private static final Logger log = LoggerFactory.getLogger(CarService.class);

    private final CarRepository carRepository;
    private final GameDayRepository gameDayRepository;
    private final PlayerRepository playerRepository;

    public CarService(final CarRepository carRepository,
                      final GameDayRepository gameDayRepository, final PlayerRepository playerRepository) {
        this.carRepository = carRepository;
        this.gameDayRepository = gameDayRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<Car> getCars(final Long gameDayId) {
        return carRepository.findByGameDay_Id(gameDayId);
    }

    @Transactional
    public Car createCar(final Long gameDayId, final CreateCarRequest request) {
        final GameDay gameDay = gameDayRepository.findByIdWithPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));

        final Player driver = playerRepository.findById(request.driverPlayerId())
            .orElseThrow(() -> new ResourceNotFoundException("Player", request.driverPlayerId()));

        // Fahrer muss verfuegbar sein
        final Set<Long> availableIds = gameDay.getAvailablePlayers().stream()
            .map(Player::getId)
            .collect(Collectors.toSet());
        if (!availableIds.contains(driver.getId())) {
            throw new BusinessValidationException("Fahrer " + driver.getId() + " ist nicht fuer diesen Spieltag eingetragen");
        }

        // Fahrer darf nicht schon Fahrer eines anderen Autos sein
        final List<Car> existingCars = carRepository.findByGameDay_Id(gameDayId);
        for (final Car car : existingCars) {
            if (car.getDriver().getId().equals(driver.getId())) {
                throw new BusinessValidationException("Spieler " + driver.getId() + " ist bereits Fahrer eines Autos");
            }
        }

        log.info("Auto erstellen: Spieltag={}, Fahrer={}, Plaetze={}", gameDayId, driver.getName(), request.totalSeats());
        return carRepository.save(new Car(gameDay, driver, request.totalSeats(), request.direction()));
    }

    @Transactional
    public Car updateCar(final Long gameDayId, final Long carId, final UpdateCarRequest request) {
        final Car car = findById(carId);
        if (!car.getGameDay().getId().equals(gameDayId)) {
            throw new BusinessValidationException("Auto " + carId + " gehoert nicht zu Spieltag " + gameDayId);
        }

        if (request.totalSeats() != null) {
            car.setTotalSeats(request.totalSeats());
        }
        if (request.direction() != null) {
            car.setDirection(request.direction());
        }

        return carRepository.save(car);
    }

    @Transactional
    public void deleteCar(final Long carId) {
        if (!carRepository.existsById(carId)) {
            throw new ResourceNotFoundException("Car", carId);
        }
        log.info("Auto loeschen: {}", carId);
        carRepository.deleteById(carId);
    }

    public Car findById(final Long id) {
        return carRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Car", id));
    }
}
