package com.algoaccel.hcc.dto;

import com.algoaccel.hcc.model.enums.HccRuleStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Detail DTO for HCC Rule with tiers and suppression configs.
 */
@Data
@Builder
public class HccRuleDetailDto {
    private Long id;
    private String name;
    private String hccCategory;
    private String conditionName;
    private HccRuleStatus status;
    private String modelYear;
    private Integer lookbackYears;
    private Integer version;
    private Boolean cmsEnabled;
    private Boolean hhsEnabled;
    private Boolean esrdEnabled;
    private List<StratificationTierDto> tiers;
    private List<SuppressionConfigDto> suppressionConfigs;
}
