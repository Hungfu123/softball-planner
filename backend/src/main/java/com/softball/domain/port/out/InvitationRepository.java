package com.softball.domain.port.out;

import com.softball.domain.model.Invitation;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository {
    List<Invitation> findAllOrderByUpdatedAtDesc();
    Optional<Invitation> findById(Long id);
    Invitation save(Invitation invitation);
    void deleteById(Long id);
    boolean existsById(Long id);
}
