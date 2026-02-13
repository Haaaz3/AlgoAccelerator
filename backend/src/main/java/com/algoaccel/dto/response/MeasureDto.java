package com.algoaccel.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Full measure DTO with all fields and eagerly resolved relationships.
 */
public record MeasureDto(
    String id,
    String measureId,
    String title,
    String version,
    String steward,
    String program,
    String measureType,
    String description,
    String rationale,
    String clinicalRecommendation,
    String periodStart,
    String periodEnd,
    GlobalConstraintsDto globalConstraints,
    String status,
    String overallConfidence,
    LocalDateTime lockedAt,
    String lockedBy,
    List<PopulationDto> populations,
    List<MeasureValueSetDto> valueSets,
    List<CorrectionDto> corrections,
    String generatedCql,
    String generatedSql,
    LocalDateTime createdAt,
    String createdBy,
    LocalDateTime updatedAt,
    String updatedBy
) {
    public record GlobalConstraintsDto(
        Integer ageMin,
        Integer ageMax,
        String ageCalculation,
        String gender,
        String measurementPeriodType,
        String measurementPeriodAnchor
    ) {}
}
