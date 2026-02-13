package com.algoaccel.dto.response;

import java.time.LocalDateTime;

/**
 * Correction entry DTO.
 */
public record CorrectionDto(
    String id,
    String correctionType,
    String description,
    String author,
    LocalDateTime timestamp,
    String field,
    String oldValue,
    String newValue
) {}
