package com.softball.shared.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(final String resourceType, final Long id) {
        super(resourceType + " not found: " + id);
    }

    public ResourceNotFoundException(final String message) {
        super(message);
    }
}
