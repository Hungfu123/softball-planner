package com.softball.domain.port.out;

import com.softball.domain.model.InningAdvanceEvent;
import java.util.List;

public interface InningAdvanceEventRepository {
    List<InningAdvanceEvent> findByGameIdOrderByCreatedAtAsc(Long gameId);
    InningAdvanceEvent save(InningAdvanceEvent event);
    void deleteById(Long id);
}
