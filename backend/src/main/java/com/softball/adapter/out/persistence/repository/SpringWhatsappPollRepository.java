package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpringWhatsappPollRepository extends JpaRepository<WhatsappPollEntity, Long> {
    Optional<WhatsappPollEntity> findByGameDayId(Long gameDayId);
}
