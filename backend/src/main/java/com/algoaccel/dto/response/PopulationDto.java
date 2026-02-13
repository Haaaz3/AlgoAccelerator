package com.algoaccel.dto.response;

/**
 * Population DTO with root clause.
 */
public record PopulationDto(
    String id,
    String populationType,
    String description,
    String narrative,
    LogicalClauseDto rootClause,
    int displayOrder,
    String confidence,
    String reviewStatus,
    String reviewNotes,
    String cqlDefinition,
    String cqlDefinitionName
) {}
