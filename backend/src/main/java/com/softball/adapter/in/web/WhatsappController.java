package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.WhatsappAccountStatusResponse;
import com.softball.adapter.dto.WhatsappGroupResponse;
import com.softball.adapter.dto.WhatsappPollRequest;
import com.softball.adapter.dto.WhatsappPollResponse;
import com.softball.application.WhatsappPollService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/orga/whatsapp")
public class WhatsappController {

    private final WhatsappPollService service;

    public WhatsappController(final WhatsappPollService service) {
        this.service = service;
    }

    // --- Konto / Setup ---
    @GetMapping("/status")
    public WhatsappAccountStatusResponse status() {
        return WhatsappAccountStatusResponse.from(service.status());
    }

    @GetMapping("/qr")
    public Map<String, String> qr() {
        return java.util.Collections.singletonMap("qr", service.qr());
    }

    @GetMapping("/groups")
    public List<WhatsappGroupResponse> groups() {
        return service.groups().stream().map(WhatsappGroupResponse::from).toList();
    }

    // --- Polls ---
    @GetMapping("/polls")
    public List<WhatsappPollResponse> all() {
        return service.findAll().stream().map(WhatsappPollResponse::from).toList();
    }

    @PostMapping("/polls")
    @ResponseStatus(HttpStatus.CREATED)
    public WhatsappPollResponse create(@Valid @RequestBody final WhatsappPollRequest req) {
        return WhatsappPollResponse.from(service.create(req.toDomain()));
    }

    @PutMapping("/polls/{id}")
    public WhatsappPollResponse update(@PathVariable final Long id, @Valid @RequestBody final WhatsappPollRequest req) {
        return WhatsappPollResponse.from(service.update(id, req.toDomain()));
    }

    @DeleteMapping("/polls/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        service.delete(id);
    }

    @PostMapping("/polls/{id}/send-now")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendNow(@PathVariable final Long id) {
        service.sendNow(id);
    }

    @PostMapping("/polls/{id}/reset-sent")
    public WhatsappPollResponse resetSent(@PathVariable final Long id) {
        return WhatsappPollResponse.from(service.resetLastSent(id));
    }

    @PostMapping("/polls/{id}/skip-dates")
    public WhatsappPollResponse addSkip(@PathVariable final Long id, @RequestBody final Map<String, String> body) {
        return WhatsappPollResponse.from(service.addSkipDate(id, LocalDate.parse(body.get("date"))));
    }

    @DeleteMapping("/polls/{id}/skip-dates/{date}")
    public WhatsappPollResponse removeSkip(@PathVariable final Long id, @PathVariable final String date) {
        return WhatsappPollResponse.from(service.removeSkipDate(id, LocalDate.parse(date)));
    }
}
