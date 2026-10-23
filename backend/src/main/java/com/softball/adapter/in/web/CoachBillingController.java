package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.CoachBillingProfileResponse;
import com.softball.adapter.dto.UpdateCoachBillingProfileRequest;
import com.softball.application.CoachBillingProfileService;
import com.softball.domain.model.CoachBillingProfile;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/coach-billing")
public class CoachBillingController {

    private final CoachBillingProfileService service;

    public CoachBillingController(final CoachBillingProfileService service) {
        this.service = service;
    }

    /** 204, solange noch nichts eingetragen ist — kein Fehler, sondern ein leeres Formular. */
    @GetMapping("/profile")
    public ResponseEntity<CoachBillingProfileResponse> getProfile() {
        return service.find()
            .map(CoachBillingProfileResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/profile")
    public CoachBillingProfileResponse updateProfile(@Valid @RequestBody final UpdateCoachBillingProfileRequest request) {
        final CoachBillingProfile profile = new CoachBillingProfile();
        profile.setFirstName(request.firstName());
        profile.setLastName(request.lastName());
        profile.setStreet(request.street());
        profile.setZip(request.zip());
        profile.setCity(request.city());
        profile.setSportCourse(request.sportCourse());
        profile.setHourlyRate(request.hourlyRate());
        profile.setMaxHours(request.maxHours());
        profile.setRecipientName(request.recipientName());
        profile.setRecipientEmail(request.recipientEmail());
        profile.setSignaturePng(request.signaturePng());
        return CoachBillingProfileResponse.from(service.save(profile));
    }
}
