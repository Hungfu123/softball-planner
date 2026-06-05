package com.softball.application;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.port.out.InvitationRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private final InvitationRepository repository;

    public InvitationService(final InvitationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Invitation> findAll() {
        return repository.findAllOrderByUpdatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Invitation findById(final Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Invitation", id));
    }

    @Transactional
    public Invitation create(final Invitation invitation) {
        invitation.setId(null);
        log.info("Einladung erstellt: {}", invitation.getTitle());
        return repository.save(invitation);
    }

    @Transactional
    public Invitation update(final Long id, final Invitation incoming) {
        final Invitation existing = findById(id);
        existing.setTitle(incoming.getTitle());
        existing.setLetterDate(incoming.getLetterDate());
        existing.setEventDate(incoming.getEventDate());
        existing.setVenue(incoming.getVenue());
        existing.setPairingMode(incoming.getPairingMode());
        existing.setBodyText(incoming.getBodyText());
        existing.setGuestTeams(incoming.getGuestTeams());
        existing.setGames(incoming.getGames());
        existing.setContacts(incoming.getContacts());
        log.info("Einladung aktualisiert: {} ({})", id, incoming.getTitle());
        return repository.save(existing);
    }

    @Transactional
    public Invitation duplicate(final Long id) {
        final Invitation src = findById(id);
        final Invitation copy = new Invitation();
        copy.setTitle(src.getTitle() + " (Kopie)");
        copy.setLetterDate(src.getLetterDate());
        copy.setEventDate(src.getEventDate());
        copy.setVenue(src.getVenue());
        copy.setPairingMode(src.getPairingMode());
        copy.setBodyText(src.getBodyText());
        copy.setGuestTeams(new ArrayList<>(src.getGuestTeams()));
        copy.setGames(copyGames(src.getGames()));
        copy.setContacts(copyContacts(src.getContacts()));
        log.info("Einladung dupliziert: {} -> Kopie", id);
        return repository.save(copy);
    }

    @Transactional
    public void delete(final Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Invitation", id);
        }
        log.info("Einladung geloescht: {}", id);
        repository.deleteById(id);
    }

    private List<InvitationGame> copyGames(final List<InvitationGame> src) {
        final List<InvitationGame> out = new ArrayList<>();
        for (final InvitationGame g : src) {
            final InvitationGame c = new InvitationGame();
            c.setTime(g.getTime()); c.setTeamA(g.getTeamA()); c.setTeamB(g.getTeamB()); c.setUmp(g.getUmp());
            out.add(c);
        }
        return out;
    }

    private List<InvitationContact> copyContacts(final List<InvitationContact> src) {
        final List<InvitationContact> out = new ArrayList<>();
        for (final InvitationContact c0 : src) {
            final InvitationContact c = new InvitationContact();
            c.setRole(c0.getRole()); c.setName(c0.getName()); c.setEmail(c0.getEmail()); c.setPhone(c0.getPhone());
            out.add(c);
        }
        return out;
    }
}
