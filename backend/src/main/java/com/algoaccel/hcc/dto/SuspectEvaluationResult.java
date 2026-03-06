package com.algoaccel.hcc.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Complete evaluation result for a patient against an HCC suspecting rule.
 */
@Data
@Builder
public class SuspectEvaluationResult {
    private String patientId;
    private Long ruleId;
    private String ruleName;
    private String hccCategory;
    private String conditionName;

    /**
     * Results per model type (CMS, HHS, ESRD).
     */
    private Map<String, ModelEvaluationResult> modelResults;

    /**
     * Overall supporting facts that triggered any tier.
     */
    private List<SupportingFact> supportingFacts;

    /**
     * Competing facts (for future use - conditions that contradict the suspect).
     */
    private List<String> competingFacts;
}
