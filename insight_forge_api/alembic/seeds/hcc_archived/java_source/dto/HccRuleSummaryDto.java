package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.HccRuleStatus;
import lombok.Builder;
import lombok.Data;

/**
 * Summary DTO for HCC Rule list view.
 */
@Data
@Builder
public class HccRuleSummaryDto {
    private Long id;
    private String name;
    private String hccCategory;
    private String conditionName;
    private HccRuleStatus status;
    private String modelYear;
    private Boolean cmsEnabled;
    private Boolean hhsEnabled;
    private Boolean esrdEnabled;
}
