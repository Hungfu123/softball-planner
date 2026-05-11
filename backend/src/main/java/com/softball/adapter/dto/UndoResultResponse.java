package com.softball.adapter.dto;

public record UndoResultResponse(
    UndoType type,
    Long removedId
) {
    public enum UndoType { AT_BAT, STEALING, SUBSTITUTION, INNING_ADVANCE, NONE }

    public static UndoResultResponse none() {
        return new UndoResultResponse(UndoType.NONE, null);
    }

    public static UndoResultResponse atBat(final Long id) {
        return new UndoResultResponse(UndoType.AT_BAT, id);
    }

    public static UndoResultResponse stealing(final Long id) {
        return new UndoResultResponse(UndoType.STEALING, id);
    }

    public static UndoResultResponse substitution(final Long id) {
        return new UndoResultResponse(UndoType.SUBSTITUTION, id);
    }

    public static UndoResultResponse inningAdvance(final Long id) {
        return new UndoResultResponse(UndoType.INNING_ADVANCE, id);
    }
}
