package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.TierType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Stratification tier (HS/MS) containing criteria for evaluation.
 * Criteria are stored as JSON for flexibility in branch/logic configuration.
 */
@Entity
@Table(name = "hcc_stratification_tier", indexes = {
    @Index(name = "idx_tier_rule", columnList = "rule_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StratificationTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private HccSuspectRule rule;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier_type", nullable = false, length = 30)
    private TierType tierType;

    @Column(name = "minimum_branches_required")
    @Builder.Default
    private Integer minimumBranchesRequired = 1;

    /**
     * JSON array of EvidenceBranch objects defining the criteria.
     * Structure: [{ branchId, label, logic, criteria: [...] }, ...]
     */
    @Column(name = "criteria_json", columnDefinition = "TEXT")
    private String criteriaJson;

    /**
     * JSON array of SupportingFactVariable objects for output.
     */
    @Column(name = "supporting_facts_json", columnDefinition = "TEXT")
    private String supportingFactsJson;
}
