package com.algoaccel.dto.response;

import java.util.List;

/**
 * Recursive logical clause DTO.
 * No parent reference to avoid circular JSON.
 */
public record LogicalClauseDto(
    String id,
    String operator,
    String description,
    int displayOrder,
    List<LogicalClauseDto> children,
    List<DataElementDto> dataElements
) {}
