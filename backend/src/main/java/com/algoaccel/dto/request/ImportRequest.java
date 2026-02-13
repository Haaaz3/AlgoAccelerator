package com.algoaccel.dto.request;

import java.util.List;
import java.util.Map;

/**
 * Request DTO for importing data from Zustand export format.
 */
public record ImportRequest(
    List<Map<String, Object>> measures,
    List<Map<String, Object>> components,
    List<Map<String, Object>> validationTraces,
    Map<String, Object> codeStates,
    Integer version,
    String exportedAt
) {}
