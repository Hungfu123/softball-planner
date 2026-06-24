package com.softball.service;

import com.softball.TestcontainersConfig;
import com.softball.application.EquipmentService;
import com.softball.application.GameDayService;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.EquipmentItem;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class EquipmentServiceCarryOverTest {

    @Autowired private EquipmentService equipmentService;
    @Autowired private GameDayService gameDayService;
    @Autowired private SpringSeasonRepository seasonRepository;

    private Long seasonId;

    @BeforeEach
    void setUp() {
        seasonId = seasonRepository.save(new SeasonEntity("Saison 2026", 2026)).getId();
    }

    @AfterEach
    void tearDown() {
        seasonRepository.deleteAll();
    }

    @Test
    void carryOver_copiesUsedItemsFromMostRecentEarlierGameDay() {
        final Long oldGameDay = gameDayService.create(seasonId, LocalDate.parse("2026-05-01"), null, null, 1).id();
        final Long newGameDay = gameDayService.create(seasonId, LocalDate.parse("2026-06-27"), null, null, 1).id();

        final EquipmentItem pavillon = equipmentService.create("Pavillon", "Aufbau", 3, "Garage", null);
        final EquipmentItem bases = equipmentService.create("Bases", "Spielmaterial", 4, "Raum", null);
        equipmentService.setUsed(oldGameDay, pavillon.getId(), true);
        equipmentService.setUsed(oldGameDay, bases.getId(), true);

        final Set<Long> carried = equipmentService.carryOverFromLast(newGameDay);

        assertThat(carried).containsExactlyInAnyOrder(pavillon.getId(), bases.getId());
        assertThat(equipmentService.usedItemIds(newGameDay))
            .containsExactlyInAnyOrder(pavillon.getId(), bases.getId());
    }
}
