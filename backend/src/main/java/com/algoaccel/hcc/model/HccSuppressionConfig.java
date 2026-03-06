package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.HccModelType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Suppression configuration for a specific HCC model type (CMS/HHS/ESRD).
 * Defines when to suppress suspect output based on existing validated conditions.
 */
@Entity
@Table(name = "hcc_suppression_config", indexes = {
    @Index(name = "idx_suppression_rule", columnList = "rule_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccSuppressionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private HccSuspectRule rule;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false, length = 10)
    private HccModelType modelType;

    @Column(name = "target_hcc", nullable = false, length = 100)
    private String targetHcc;

    /**
     * JSON array of suppression state strings (e.g., "Fully Validated", "Needs Administrative Attention").
     */
    @Column(name = "suppression_states", columnDefinition = "TEXT")
    private String suppressionStates;

    @Column(name = "resurfacing_enabled")
    @Builder.Default
    private Boolean resurfacingEnabled = true;

    @Column(name = "resurfacing_requires_different_concept")
    @Builder.Default
    private Boolean resurfacingRequiresDifferentConcept = true;
}
