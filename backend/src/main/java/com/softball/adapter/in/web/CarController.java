package com.softball.adapter.in.web;

import com.softball.adapter.dto.*;
import com.softball.application.CarService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CarController {

    private final CarService carService;

    public CarController(final CarService carService) {
        this.carService = carService;
    }

    @GetMapping("/gamedays/{gameDayId}/cars")
    public List<CarResponse> getCars(@PathVariable final Long gameDayId) {
        return carService.getCars(gameDayId).stream().map(CarResponse::from).toList();
    }

    @PostMapping("/gamedays/{gameDayId}/cars")
    @ResponseStatus(HttpStatus.CREATED)
    public CarResponse createCar(@PathVariable final Long gameDayId,
                                 @Valid @RequestBody final CreateCarRequest request) {
        return CarResponse.from(carService.createCar(gameDayId, request));
    }

    @PutMapping("/gamedays/{gameDayId}/cars/{carId}")
    public CarResponse updateCar(@PathVariable final Long gameDayId, @PathVariable final Long carId,
                                 @RequestBody final UpdateCarRequest request) {
        return CarResponse.from(carService.updateCar(gameDayId, carId, request));
    }

    @DeleteMapping("/cars/{carId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCar(@PathVariable final Long carId) {
        carService.deleteCar(carId);
    }
}
