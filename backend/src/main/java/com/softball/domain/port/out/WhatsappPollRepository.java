package com.softball.domain.port.out;

import com.softball.domain.model.WhatsappPoll;
import java.util.List;
import java.util.Optional;

public interface WhatsappPollRepository {
    List<WhatsappPoll> findAll();
    Optional<WhatsappPoll> findById(Long id);
    WhatsappPoll save(WhatsappPoll poll);
    void deleteById(Long id);
    boolean existsById(Long id);
}
