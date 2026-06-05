package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.InvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringInvitationRepository extends JpaRepository<InvitationEntity, Long> {
    List<InvitationEntity> findAllByOrderByUpdatedAtDesc();
}
