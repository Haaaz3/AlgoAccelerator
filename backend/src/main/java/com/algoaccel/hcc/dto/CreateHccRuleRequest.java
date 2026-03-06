package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.HccRuleStatus;
import lombok.Data;

/**
 * Request DTO for creating/updating an HCC rule.
 */
@Data
public class CreateHccRuleRequest {
    private String name;
    private String hccCategory;
    private String conditionName;
    private HccRuleStatus status;
    private String modelYear;
    private Integer lookbackYears;
    private Boolean cmsEnabled;
    private Boolean hhsEnabled;
    private Boolean esrdEnabled;
}
