package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.HccRuleStatus;
import com.algoaccel.model.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * HCC Suspecting Rule entity.
 * Represents a rule for identifying patients who likely have an uncodified chronic condition.
 */
@Entity
@Table(name = "hcc_suspect_rule", indexes = {
    @Index(name = "idx_hcc_rule_status", columnList = "status"),
    @Index(name = "idx_hcc_rule_category", columnList = "hcc_category")
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class HccSuspectRule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "hcc_category", nullable = false, length = 50)
    private String hccCategory;

    @Column(name = "condition_name", nullable = false)
    private String conditionName;

    @Column(name = "cms_enabled")
    @Builder.Default
    private Boolean cmsEnabled = true;

    @Column(name = "hhs_enabled")
    @Builder.Default
    private Boolean hhsEnabled = true;

    @Column(name = "esrd_enabled")
    @Builder.Default
    private Boolean esrdEnabled = true;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private HccRuleStatus status = HccRuleStatus.DRAFT;

    @Column(name = "model_year", length = 20)
    private String modelYear;

    @Column(name = "lookback_years")
    @Builder.Default
    private Integer lookbackYears = 2;

    @Version
    @Builder.Default
    private Integer version = 1;

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<StratificationTier> tiers = new ArrayList<>();

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<HccSuppressionConfig> suppressionConfigs = new ArrayList<>();

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<HccClientConfig> clientConfigs = new ArrayList<>();

    public void addTier(StratificationTier tier) {
        tiers.add(tier);
        tier.setRule(this);
    }

    public void removeTier(StratificationTier tier) {
        tiers.remove(tier);
        tier.setRule(null);
    }

    public void addSuppressionConfig(HccSuppressionConfig config) {
        suppressionConfigs.add(config);
        config.setRule(this);
    }

    public void addClientConfig(HccClientConfig config) {
        clientConfigs.add(config);
        config.setRule(this);
    }
}
