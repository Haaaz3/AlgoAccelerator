package com.algoaccel.hcc.controller;

import com.algoaccel.hcc.dto.*;
import com.algoaccel.hcc.model.HccSuspectRule;
import com.algoaccel.hcc.model.StratificationTier;
import com.algoaccel.hcc.model.HccSuppressionConfig;
import com.algoaccel.hcc.model.enums.HccRuleStatus;
import com.algoaccel.hcc.service.HccRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for HCC Suspect Rule management.
 */
@RestController
@RequestMapping("/api/hcc/rules")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "hcc.enabled", havingValue = "true", matchIfMissing = true)
public class HccRuleController {

    private final HccRuleService hccRuleService;

    /**
     * List all rules (summary view).
     */
    @GetMapping
    public ResponseEntity<List<HccRuleSummaryDto>> getAllRules() {
        List<HccRuleSummaryDto> rules = hccRuleService.findAll().stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rules);
    }

    /**
     * Get rule detail with tiers and suppression configs.
     */
    @GetMapping("/{id}")
    public ResponseEntity<HccRuleDetailDto> getRuleById(@PathVariable Long id) {
        return hccRuleService.getRuleWithTiers(id)
                .map(rule -> ResponseEntity.ok(toDetailDto(rule)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new rule.
     */
    @PostMapping
    public ResponseEntity<HccRuleDetailDto> createRule(@RequestBody CreateHccRuleRequest request) {
        HccSuspectRule rule = HccSuspectRule.builder()
                .name(request.getName())
                .hccCategory(request.getHccCategory())
                .conditionName(request.getConditionName())
                .status(request.getStatus() != null ? request.getStatus() : HccRuleStatus.DRAFT)
                .modelYear(request.getModelYear())
                .lookbackYears(request.getLookbackYears() != null ? request.getLookbackYears() : 2)
                .cmsEnabled(request.getCmsEnabled() != null ? request.getCmsEnabled() : true)
                .hhsEnabled(request.getHhsEnabled() != null ? request.getHhsEnabled() : true)
                .esrdEnabled(request.getEsrdEnabled() != null ? request.getEsrdEnabled() : true)
                .build();

        HccSuspectRule saved = hccRuleService.save(rule);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDetailDto(saved));
    }

    /**
     * Update an existing rule.
     */
    @PutMapping("/{id}")
    public ResponseEntity<HccRuleDetailDto> updateRule(@PathVariable Long id, @RequestBody CreateHccRuleRequest request) {
        HccSuspectRule update = HccSuspectRule.builder()
                .name(request.getName())
                .hccCategory(request.getHccCategory())
                .conditionName(request.getConditionName())
                .status(request.getStatus())
                .modelYear(request.getModelYear())
                .lookbackYears(request.getLookbackYears())
                .cmsEnabled(request.getCmsEnabled())
                .hhsEnabled(request.getHhsEnabled())
                .esrdEnabled(request.getEsrdEnabled())
                .build();

        try {
            HccSuspectRule updated = hccRuleService.update(id, update);
            return ResponseEntity.ok(toDetailDto(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a rule.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        if (hccRuleService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        hccRuleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private HccRuleSummaryDto toSummaryDto(HccSuspectRule rule) {
        return HccRuleSummaryDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .hccCategory(rule.getHccCategory())
                .conditionName(rule.getConditionName())
                .status(rule.getStatus())
                .modelYear(rule.getModelYear())
                .cmsEnabled(rule.getCmsEnabled())
                .hhsEnabled(rule.getHhsEnabled())
                .esrdEnabled(rule.getEsrdEnabled())
                .build();
    }

    private HccRuleDetailDto toDetailDto(HccSuspectRule rule) {
        List<StratificationTierDto> tierDtos = rule.getTiers().stream()
                .map(this::toTierDto)
                .collect(Collectors.toList());

        List<SuppressionConfigDto> configDtos = rule.getSuppressionConfigs().stream()
                .map(this::toConfigDto)
                .collect(Collectors.toList());

        return HccRuleDetailDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .hccCategory(rule.getHccCategory())
                .conditionName(rule.getConditionName())
                .status(rule.getStatus())
                .modelYear(rule.getModelYear())
                .lookbackYears(rule.getLookbackYears())
                .version(rule.getVersion())
                .cmsEnabled(rule.getCmsEnabled())
                .hhsEnabled(rule.getHhsEnabled())
                .esrdEnabled(rule.getEsrdEnabled())
                .tiers(tierDtos)
                .suppressionConfigs(configDtos)
                .build();
    }

    private StratificationTierDto toTierDto(StratificationTier tier) {
        return StratificationTierDto.builder()
                .id(tier.getId())
                .tierType(tier.getTierType())
                .minimumBranchesRequired(tier.getMinimumBranchesRequired())
                .criteriaJson(tier.getCriteriaJson())
                .supportingFactsJson(tier.getSupportingFactsJson())
                .build();
    }

    private SuppressionConfigDto toConfigDto(HccSuppressionConfig config) {
        return SuppressionConfigDto.builder()
                .id(config.getId())
                .modelType(config.getModelType())
                .targetHcc(config.getTargetHcc())
                .suppressionStates(config.getSuppressionStates())
                .resurfacingEnabled(config.getResurfacingEnabled())
                .resurfacingRequiresDifferentConcept(config.getResurfacingRequiresDifferentConcept())
                .build();
    }
}
