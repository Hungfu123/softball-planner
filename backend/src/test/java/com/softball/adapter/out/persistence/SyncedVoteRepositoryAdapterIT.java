package com.softball.adapter.out.persistence;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.entity.TrainingEntity;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSyncedVoteRepository;
import com.softball.adapter.out.persistence.repository.SpringTrainingRepository;
import com.softball.domain.model.SyncedVote;
import com.softball.domain.port.out.SyncedVoteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class SyncedVoteRepositoryAdapterIT {

    @Autowired
    private SyncedVoteRepository syncedVoteRepository;

    @Autowired
    private SpringSyncedVoteRepository springSyncedVoteRepository;

    @Autowired
    private SpringTrainingRepository trainingRepository;

    @Autowired
    private SpringPlayerRepository playerRepository;

    private Long trainingId;
    private Long playerId;

    @BeforeEach
    void setUp() {
        final TrainingEntity training = trainingRepository.save(
            new TrainingEntity(LocalDate.of(2026, 7, 20), "18:00", "Sportplatz"));
        trainingId = training.getId();

        final PlayerEntity player = playerRepository.save(new PlayerEntity("Max"));
        playerId = player.getId();
    }

    @AfterEach
    void tearDown() {
        springSyncedVoteRepository.deleteAll();
        trainingRepository.deleteAll();
        playerRepository.deleteAll();
    }

    @Test
    void save_thenFindByTrainingIdAndVoterName_findsRow() {
        syncedVoteRepository.save(new SyncedVote(trainingId, "Max Mustermann", playerId, true));

        final Optional<SyncedVote> found =
            syncedVoteRepository.findByTrainingIdAndVoterName(trainingId, "Max Mustermann");

        assertThat(found).isPresent();
        assertThat(found.get().getTrainingId()).isEqualTo(trainingId);
        assertThat(found.get().getVoterName()).isEqualTo("Max Mustermann");
        assertThat(found.get().getPlayerId()).isEqualTo(playerId);
        assertThat(found.get().isPresent()).isTrue();
    }

    @Test
    void save_withSameTrainingAndVoterName_upsertsInsteadOfInserting() {
        syncedVoteRepository.save(new SyncedVote(trainingId, "Max Mustermann", playerId, true));
        final Long id = syncedVoteRepository.findByTrainingIdAndVoterName(trainingId, "Max Mustermann")
            .orElseThrow().getId();

        final SyncedVote update = new SyncedVote(trainingId, "Max Mustermann", playerId, false);
        update.setId(id);
        syncedVoteRepository.save(update);

        final List<SyncedVote> rows = syncedVoteRepository.findByTrainingId(trainingId);
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getId()).isEqualTo(id);
        assertThat(rows.get(0).isPresent()).isFalse();
    }

    @Test
    void findByVoterNameAndPlayerIdIsNull_returnsOnlyUnmatchedVotesForVoter() {
        syncedVoteRepository.save(new SyncedVote(trainingId, "Unbekannt", null, true));
        syncedVoteRepository.save(new SyncedVote(trainingId, "Max Mustermann", playerId, true));

        final List<SyncedVote> unresolved =
            syncedVoteRepository.findByVoterNameAndPlayerIdIsNull("Unbekannt");

        assertThat(unresolved).hasSize(1);
        assertThat(unresolved.get(0).getVoterName()).isEqualTo("Unbekannt");
        assertThat(unresolved.get(0).getPlayerId()).isNull();
    }

    @Test
    void findByPlayerIdIsNull_returnsAllUnmatchedVotes() {
        syncedVoteRepository.save(new SyncedVote(trainingId, "Unbekannt 1", null, true));
        syncedVoteRepository.save(new SyncedVote(trainingId, "Unbekannt 2", null, false));
        syncedVoteRepository.save(new SyncedVote(trainingId, "Max Mustermann", playerId, true));

        final List<SyncedVote> unresolved = syncedVoteRepository.findByPlayerIdIsNull();

        assertThat(unresolved).hasSize(2);
        assertThat(unresolved).extracting(SyncedVote::getPlayerId).containsOnlyNulls();
    }
}
