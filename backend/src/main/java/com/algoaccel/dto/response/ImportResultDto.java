package com.algoaccel.dto.response;

/**
 * Result of an import operation.
 */
public record ImportResultDto(
    int componentsImported,
    int measuresImported,
    int validationTracesImported,
    boolean success,
    String message
) {}
