package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringWhatsappPollRepository extends JpaRepository<WhatsappPollEntity, Long> {
}
