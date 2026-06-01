package com.softball.domain.port.out;

import com.softball.domain.model.Coordinates;

import java.util.Optional;

public interface GeocodingPort {
    Optional<Coordinates> geocode(String location);
}
