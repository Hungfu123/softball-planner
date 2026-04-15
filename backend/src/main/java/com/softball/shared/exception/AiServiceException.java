package com.softball.shared.exception;

public class AiServiceException extends RuntimeException {
    private final int httpStatus;

    public AiServiceException(final String message, final int httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public AiServiceException(final String message, final int httpStatus, final Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
