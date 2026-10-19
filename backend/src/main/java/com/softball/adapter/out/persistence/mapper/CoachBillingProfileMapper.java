package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.CoachBillingProfileEntity;
import com.softball.domain.model.CoachBillingProfile;
import org.springframework.stereotype.Component;

@Component
public class CoachBillingProfileMapper {

    public CoachBillingProfile toDomain(final CoachBillingProfileEntity entity) {
        if (entity == null) return null;
        final CoachBillingProfile profile = new CoachBillingProfile();
        profile.setFirstName(entity.getFirstName());
        profile.setLastName(entity.getLastName());
        profile.setStreet(entity.getStreet());
        profile.setZip(entity.getZip());
        profile.setCity(entity.getCity());
        profile.setSportCourse(entity.getSportCourse());
        profile.setHourlyRate(entity.getHourlyRate());
        profile.setMaxHours(entity.getMaxHours());
        profile.setRecipientName(entity.getRecipientName());
        profile.setRecipientEmail(entity.getRecipientEmail());
        profile.setSignaturePng(entity.getSignaturePng());
        return profile;
    }

    /** Schreibt auf die vorhandene Zeile; es gibt nur eine, deshalb kein Anlegen daneben. */
    public void updateEntity(final CoachBillingProfileEntity entity, final CoachBillingProfile domain) {
        entity.setId(CoachBillingProfile.SINGLETON_ID);
        entity.setFirstName(domain.getFirstName());
        entity.setLastName(domain.getLastName());
        entity.setStreet(domain.getStreet());
        entity.setZip(domain.getZip());
        entity.setCity(domain.getCity());
        entity.setSportCourse(domain.getSportCourse());
        entity.setHourlyRate(domain.getHourlyRate());
        entity.setMaxHours(domain.getMaxHours());
        entity.setRecipientName(domain.getRecipientName());
        entity.setRecipientEmail(domain.getRecipientEmail());
        entity.setSignaturePng(domain.getSignaturePng());
    }
}
