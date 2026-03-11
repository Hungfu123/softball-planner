package com.softball.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SetAvailablePlayersRequest(@NotEmpty List<Long> playerIds) {}
