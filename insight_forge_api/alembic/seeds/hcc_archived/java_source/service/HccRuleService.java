package com.algoaccel.hcc.service;

import com.algoaccel.hcc.model.HccSuspectRule;
import com.algoaccel.hcc.model.HccClientConfig;
import com.algoaccel.hcc.repository.HccSuspectRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for CRUD operations on HCC Suspect Rules.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class HccRuleService {

    private final HccSuspectRuleRepository ruleRepository;

    /**
     * Save a new rule or update an existing one.
     */
    public HccSuspectRule save(HccSuspectRule rule) {
        return ruleRepository.save(rule);
    }

    /**
     * Find all rules.
     */
    @Transactional(readOnly = true)
    public List<HccSuspectRule> findAll() {
        return ruleRepository.findAll();
    }

    /**
     * Find a rule by ID.
     */
    @Transactional(readOnly = true)
    public Optional<HccSuspectRule> findById(Long id) {
        return ruleRepository.findById(id);
    }

    /**
     * Get rule with all tiers and suppression configs loaded.
     */
    @Transactional(readOnly = true)
    public Optional<HccSuspectRule> getRuleWithTiers(Long ruleId) {
        Optional<HccSuspectRule> ruleOpt = ruleRepository.findById(ruleId);
        ruleOpt.ifPresent(rule -> {
            // Force lazy loading of tiers and suppression configs
            rule.getTiers().size();
            rule.getSuppressionConfigs().size();
            rule.getClientConfigs().size();
        });
        return ruleOpt;
    }

    /**
     * Update an existing rule.
     */
    public HccSuspectRule update(Long id, HccSuspectRule updatedRule) {
        return ruleRepository.findById(id)
                .map(existing -> {
                    existing.setName(updatedRule.getName());
                    existing.setHccCategory(updatedRule.getHccCategory());
                    existing.setConditionName(updatedRule.getConditionName());
                    existing.setCmsEnabled(updatedRule.getCmsEnabled());
                    existing.setHhsEnabled(updatedRule.getHhsEnabled());
                    existing.setEsrdEnabled(updatedRule.getEsrdEnabled());
                    existing.setStatus(updatedRule.getStatus());
                    existing.setModelYear(updatedRule.getModelYear());
                    existing.setLookbackYears(updatedRule.getLookbackYears());
                    return ruleRepository.save(existing);
                })
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with id: " + id));
    }

    /**
     * Delete a rule by ID.
     */
    public void delete(Long id) {
        ruleRepository.deleteById(id);
    }

    /**
     * Apply client-specific overrides to a rule.
     * Returns the effective rule with client overrides merged.
     */
    @Transactional(readOnly = true)
    public HccSuspectRule applyClientConfig(Long ruleId, String clientId) {
        HccSuspectRule rule = getRuleWithTiers(ruleId)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with id: " + ruleId));

        Optional<HccClientConfig> clientConfig = rule.getClientConfigs().stream()
                .filter(c -> c.getClientId().equals(clientId))
                .findFirst();

        if (clientConfig.isEmpty()) {
            return rule;
        }

        HccClientConfig config = clientConfig.get();

        // Apply overrides - create a copy with merged values
        HccSuspectRule effectiveRule = HccSuspectRule.builder()
                .id(rule.getId())
                .name(rule.getName())
                .hccCategory(rule.getHccCategory())
                .conditionName(rule.getConditionName())
                .cmsEnabled(config.getCmsEnabled() != null ? config.getCmsEnabled() : rule.getCmsEnabled())
                .hhsEnabled(config.getHhsEnabled() != null ? config.getHhsEnabled() : rule.getHhsEnabled())
                .esrdEnabled(config.getEsrdEnabled() != null ? config.getEsrdEnabled() : rule.getEsrdEnabled())
                .status(rule.getStatus())
                .modelYear(rule.getModelYear())
                .lookbackYears(config.getLookbackYearsOverride() != null ? config.getLookbackYearsOverride() : rule.getLookbackYears())
                .version(rule.getVersion())
                .build();

        // Copy tiers and suppression configs (client branch disabling handled in evaluation)
        effectiveRule.getTiers().addAll(rule.getTiers());
        effectiveRule.getSuppressionConfigs().addAll(rule.getSuppressionConfigs());

        return effectiveRule;
    }
}
