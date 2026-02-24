package com.algoaccel.dto.response;

import java.math.BigDecimal;
import java.util.List;

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
    String timingWindow,
    String additionalRequirements,
    String confidence,
    String reviewStatus,
    int displayOrder,
    List<ValueSetRefDto> valueSets
) {
    public record ThresholdDto(
        Integer ageMin,
        Integer ageMax,
        BigDecimal valueMin,
        BigDecimal valueMax,
        String comparator,
        String unit
    ) {}

    /**
     * Lightweight value set reference with codes, attached to a data element.
     */
    public record ValueSetRefDto(
        String id,
        String oid,
        String name,
        String version,
        String source,
        boolean verified,
        List<ValueSetCodeDto> codes
    ) {}
}
