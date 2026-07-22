package com.softball.domain.port.out;

import com.softball.domain.model.AutomaticOutEvent;
import java.util.List;

public interface AutomaticOutEventRepository {
    List<AutomaticOutEvent> findByGameIdOrderByCreatedAtAsc(Long gameId);
    AutomaticOutEvent save(AutomaticOutEvent event);
    void deleteById(Long id);
}
