package com.softball.shared.config;

import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.NichtAngemeldetException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(final ResourceNotFoundException ex) {
        log.warn("Ressource nicht gefunden: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage()));
    }

    @ExceptionHandler(BusinessValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(final BusinessValidationException ex) {
        log.warn("Validierungsfehler: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage()));
    }

    @ExceptionHandler(NichtAngemeldetException.class)
    public ResponseEntity<Map<String, Object>> handleNichtAngemeldet(final NichtAngemeldetException ex) {
        log.warn("Zugriff ohne angemeldeten Account");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody(ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(final IllegalArgumentException ex) {
        log.warn("Ungueltiges Argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(final MethodArgumentNotValidException ex) {
        final String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining(", "));
        log.warn("Validierungsfehler: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(message));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(final DataIntegrityViolationException ex) {
        // Betroffen sind sowohl Löschungen (noch referenzierte Datensätze) als auch
        // Speicherungen (doppelte Einträge) — die Meldung muss beides abdecken.
        log.warn("Datenintegritaet verletzt: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(errorBody("Änderung nicht möglich: Sie verletzt eine Datenbankregel (doppelte Einträge oder noch referenzierte Daten)."));
    }

    private Map<String, Object> errorBody(final String message) {
        return Map.of(
            "error", message,
            "timestamp", Instant.now().toString()
        );
    }
}
