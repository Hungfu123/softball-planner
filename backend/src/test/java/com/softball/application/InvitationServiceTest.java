package com.softball.application;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.port.out.InvitationRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InvitationServiceTest {

    /** In-Memory-Fake des Ports — kein Spring/DB nötig. */
    static class FakeRepo implements InvitationRepository {
        final List<Invitation> store = new ArrayList<>();
        final AtomicLong seq = new AtomicLong(1);
        public List<Invitation> findAllOrderByUpdatedAtDesc() { return List.copyOf(store); }
        public Optional<Invitation> findById(Long id) { return store.stream().filter(i -> id.equals(i.getId())).findFirst(); }
        public Invitation save(Invitation inv) {
            if (inv.getId() == null) { inv.setId(seq.getAndIncrement()); store.add(inv); }
            return inv;
        }
        public void deleteById(Long id) { store.removeIf(i -> id.equals(i.getId())); }
        public boolean existsById(Long id) { return store.stream().anyMatch(i -> id.equals(i.getId())); }
    }

    private Invitation sample() {
        final Invitation inv = new Invitation();
        inv.setTitle("Indoor Series Turnier");
        inv.setGuestTeams(List.of("Padres", "Aixplosives", "Roadrunners"));
        final InvitationGame g = new InvitationGame();
        g.setTime("10:00"); g.setTeamA("Dead Sox"); g.setTeamB("Padres"); g.setUmp("Aixplosives");
        inv.setGames(new ArrayList<>(List.of(g)));
        return inv;
    }

    @Test
    void createAssignsIdAndDuplicateCopiesContentWithNewTitle() {
        final InvitationService service = new InvitationService(new FakeRepo());
        final Invitation saved = service.create(sample());
        assertThat(saved.getId()).isNotNull();

        final Invitation dup = service.duplicate(saved.getId());
        assertThat(dup.getId()).isNotEqualTo(saved.getId());
        assertThat(dup.getTitle()).isEqualTo("Indoor Series Turnier (Kopie)");
        assertThat(dup.getGuestTeams()).containsExactly("Padres", "Aixplosives", "Roadrunners");
        assertThat(dup.getGames()).hasSize(1);
    }

    @Test
    void deleteMissingThrows() {
        final InvitationService service = new InvitationService(new FakeRepo());
        assertThatThrownBy(() -> service.delete(999L))
            .isInstanceOf(com.softball.shared.exception.ResourceNotFoundException.class);
    }
}
