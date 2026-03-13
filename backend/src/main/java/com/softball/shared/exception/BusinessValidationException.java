package com.softball.shared.exception;

public class BusinessValidationException extends RuntimeException {

    public BusinessValidationException(final String message) {
        super(message);
    }
}
