package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.TierType;
import lombok.Builder;
import lombok.Data;

/**
 * DTO for stratification tier data.
 */
@Data
@Builder
public class StratificationTierDto {
    private Long id;
    private TierType tierType;
    private Integer minimumBranchesRequired;
    private String criteriaJson;
    private String supportingFactsJson;
}
