package com.algoaccel.hcc.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Client-specific overrides of a canonical HCC rule.
 * Allows clients to customize lookback periods, disable branches, or override thresholds.
 */
@Entity
@Table(name = "hcc_client_config", indexes = {
    @Index(name = "idx_client_rule", columnList = "rule_id"),
    @Index(name = "idx_client_id", columnList = "client_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccClientConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private HccSuspectRule rule;

    @Column(name = "client_id", nullable = false, length = 100)
    private String clientId;

    /**
     * Override for lookback years. Null means use the rule default.
     */
    @Column(name = "lookback_years_override")
    private Integer lookbackYearsOverride;

    /**
     * JSON array of branchIds that the client has disabled.
     */
    @Column(name = "disabled_branch_ids", columnDefinition = "TEXT")
    private String disabledBranchIds;

    /**
     * JSON map of conceptAlias to override threshold values.
     */
    @Column(name = "threshold_overrides_json", columnDefinition = "TEXT")
    private String thresholdOverridesJson;

    /**
     * Client-level model enablement overrides. Null means inherit from rule.
     */
    @Column(name = "cms_enabled")
    private Boolean cmsEnabled;

    @Column(name = "hhs_enabled")
    private Boolean hhsEnabled;

    @Column(name = "esrd_enabled")
    private Boolean esrdEnabled;
}
