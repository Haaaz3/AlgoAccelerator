package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.HccModelType;
import lombok.Builder;
import lombok.Data;

/**
 * DTO for suppression configuration.
 */
@Data
@Builder
public class SuppressionConfigDto {
    private Long id;
    private HccModelType modelType;
    private String targetHcc;
    private String suppressionStates;
    private Boolean resurfacingEnabled;
    private Boolean resurfacingRequiresDifferentConcept;
}
