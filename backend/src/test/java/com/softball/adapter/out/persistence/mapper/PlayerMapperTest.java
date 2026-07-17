package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.domain.model.Player;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerMapperTest {

    private final PlayerMapper mapper = new PlayerMapper();

    @Test
    void mapsWhatsappNameBothDirections() {
        final Player domain = new Player(1L, "Max", true, null);
        domain.setWhatsappName("Max ⚾");

        final PlayerEntity entity = mapper.toEntity(domain);
        assertThat(entity.getWhatsappName()).isEqualTo("Max ⚾");

        final Player back = mapper.toDomain(entity);
        assertThat(back.getWhatsappName()).isEqualTo("Max ⚾");
    }
}
