package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.CoachBillingProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringCoachBillingProfileRepository extends JpaRepository<CoachBillingProfileEntity, Long> {
}
