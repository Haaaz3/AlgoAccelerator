package com.algoaccel.dto.response;

import java.math.BigDecimal;

/**
 * Data element (leaf node) DTO.
 */
public record DataElementDto(
    String id,
    String elementType,
    String resourceType,
    String description,
    String libraryComponentId,
    boolean negation,
    String negationRationale,
    String genderValue,
    ThresholdDto thresholds,
    String timingOverride,
    String additionalRequirements,
    String confidence,
    String reviewStatus,
    int displayOrder
) {
    public record ThresholdDto(
        Integer ageMin,
        Integer ageMax,
        BigDecimal valueMin,
        BigDecimal valueMax,
        String comparator,
        String unit
    ) {}
}
