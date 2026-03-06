package com.algoaccel.hcc.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Feature flags for the HCC module.
 * Allows toggling the entire module or individual features via environment variables.
 */
@Data
@ConfigurationProperties(prefix = "hcc")
public class HccFeatureFlags {

    /**
     * Master toggle for the entire HCC module.
     * When false, no HCC beans load and no HCC routes register.
     */
    private boolean enabled = true;

    /**
     * Sub-feature toggles.
     */
    private Features features = new Features();

    @Data
    public static class Features {
        private FeatureToggle ckdRules = new FeatureToggle();
        private FeatureToggle resurfacing = new FeatureToggle();
    }

    @Data
    public static class FeatureToggle {
        private boolean enabled = true;
    }

    public boolean isCkdRulesEnabled() {
        return features.getCkdRules().isEnabled();
    }

    public boolean isResurfacingEnabled() {
        return features.getResurfacing().isEnabled();
    }
}
