package com.softball.application;

import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class SpielbogenShareService {

    private static final Logger log = LoggerFactory.getLogger(SpielbogenShareService.class);

    /** 32 Byte = 256 Bit → 43 Zeichen base64url ohne Padding. */
    private static final int TOKEN_BYTES = 32;

    private final SpielbogenRepository bogenRepo;
    private final SecureRandom random = new SecureRandom();

    public SpielbogenShareService(final SpielbogenRepository bogenRepo) {
        this.bogenRepo = bogenRepo;
    }

    @Transactional
    public String createOrGetToken(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));

        if (bogen.getPublicToken() != null) {
            return bogen.getPublicToken();
        }

        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        bogen.setPublicToken(token);
        bogenRepo.save(bogen);
        log.info("Spielbogen {}: öffentlicher Link erzeugt", bogenId);
        return token;
    }

    @Transactional
    public void revokeToken(final Long bogenId) {
        Spielbogen bogen = bogenRepo.findById(bogenId)
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", bogenId));
        bogen.setPublicToken(null);
        bogenRepo.save(bogen);
        log.info("Spielbogen {}: öffentlicher Link zurückgezogen", bogenId);
    }

    /**
     * Löst einen Token auf. Unbekannt oder zurückgezogen → 404, nie 403:
     * ein 403 würde bestätigen, dass der Token einmal existiert hat.
     */
    @Transactional(readOnly = true)
    public Spielbogen resolve(final String token) {
        return bogenRepo.findByPublicToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Kein Spielbogen zu diesem Link"));
    }
}
