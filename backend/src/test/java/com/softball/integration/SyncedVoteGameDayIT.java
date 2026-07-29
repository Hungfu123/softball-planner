package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.GameDayEntity;
import com.softball.adapter.out.persistence.entity.SeasonEntity;
import com.softball.adapter.out.persistence.repository.SpringGameDayRepository;
import com.softball.adapter.out.persistence.repository.SpringSeasonRepository;
import com.softball.domain.model.SyncedVote;
import com.softball.domain.port.out.SyncedVoteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class SyncedVoteGameDayIT {

    @Autowired
    private SyncedVoteRepository voteRepo;

    @Autowired
    private SpringSeasonRepository seasonRepository;

    @Autowired
    private SpringGameDayRepository gameDayRepository;

    @Test
    void shouldPersistAndFindGameDayVote() {
        final SeasonEntity season = seasonRepository.save(new SeasonEntity("Saison 2026", 2026));
        final GameDayEntity gameDay = gameDayRepository.save(
            new GameDayEntity(LocalDate.of(2026, 8, 1), "Spieltag", "Platz 1", season));
        final Long gameDayId = gameDay.getId();

        voteRepo.save(SyncedVote.forGameDay(gameDayId, "Max M.", null, true));

        assertThat(voteRepo.findByGameDayIdAndVoterName(gameDayId, "Max M.")).isPresent();
        assertThat(voteRepo.findByGameDayId(gameDayId)).hasSize(1);
        assertThat(voteRepo.findByGameDayId(gameDayId).getFirst().getTrainingId()).isNull();
    }
}
