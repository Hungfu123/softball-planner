package com.softball.application;

import com.softball.domain.model.CoachBillingProfile;
import com.softball.domain.port.out.CoachBillingProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Die Stammdaten der Trainerabrechnung — lesen und ueberschreiben, mehr nicht.
 *
 * Kein Anlegen und kein Loeschen: die Tabelle haelt eine Zeile, die beim ersten
 * Speichern entsteht. Solange sie fehlt, liefert {@link #find()} leer und die
 * Oberflaeche fragt die Angaben ab.
 */
@Service
public class CoachBillingProfileService {

    private static final Logger log = LoggerFactory.getLogger(CoachBillingProfileService.class);

    private final CoachBillingProfileRepository repository;

    public CoachBillingProfileService(final CoachBillingProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<CoachBillingProfile> find() {
        return repository.find();
    }

    @Transactional
    public CoachBillingProfile save(final CoachBillingProfile profile) {
        final CoachBillingProfile saved = repository.save(profile);
        log.info("Trainerabrechnung: Stammdaten gespeichert ({} {}, {} EUR/h, max {} h)",
            saved.getFirstName(), saved.getLastName(), saved.getHourlyRate(), saved.getMaxHours());
        return saved;
    }
}
