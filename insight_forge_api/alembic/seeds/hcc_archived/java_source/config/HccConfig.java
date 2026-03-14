package com.algoaccel.hcc.config;

import com.algoaccel.hcc.adapter.H2PatientDataAdapter;
import com.algoaccel.hcc.port.PatientDataPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Spring configuration for HCC module.
 * Wires the H2 adapter as the primary PatientDataPort implementation.
 * The Oracle adapter will be a second implementation that can be swapped via profile.
 *
 * The entire HCC module can be disabled by setting hcc.enabled=false.
 */
@Configuration
@EnableConfigurationProperties(HccFeatureFlags.class)
@ConditionalOnProperty(name = "hcc.enabled", havingValue = "true", matchIfMissing = true)
public class HccConfig {

    @Bean
    @Primary
    public PatientDataPort patientDataPort(H2PatientDataAdapter h2Adapter) {
        return h2Adapter;
    }
}
