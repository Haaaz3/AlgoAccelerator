package com.algoaccel.hcc.service;

import com.algoaccel.hcc.model.HccRuleRejectionState;
import com.algoaccel.hcc.model.enums.HccModelType;
import com.algoaccel.hcc.port.PatientDataPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RejectionResurfacingServiceTest {

    @Mock
    private PatientDataPort patientDataPort;

    private RejectionResurfacingService service;

    private static final String PATIENT_ID = "PAT001";
    private static final Long RULE_ID = 1L;
    private static final String MODEL_TYPE = "CMS";

    @BeforeEach
    void setUp() {
        service = new RejectionResurfacingService(patientDataPort);
    }

    /**
     * Scenario (a): No prior rejection exists → surface
     */
    @Test
    void shouldSurface_whenNoPriorRejectionExists() {
        // Given: No rejection state exists for this patient/rule/model
        when(patientDataPort.getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE))
                .thenReturn(Optional.empty());

        List<String> currentConcepts = Arrays.asList("BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED");

        // When
        boolean result = service.shouldSurface(PATIENT_ID, RULE_ID, MODEL_TYPE, currentConcepts);

        // Then: Should surface because there's no prior rejection
        assertTrue(result);
        verify(patientDataPort).getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE);
    }

    /**
     * Scenario (b): Rejection exists, same concept alias present → stay suppressed
     *
     * HIV spec scenario 1: Same medication refill after rejection → stays suppressed
     */
    @Test
    void shouldStaySuppressed_whenRejectionExistsAndSameConceptPresent() {
        // Given: A rejection exists with last triggering concept = BICTEGRAVIR combo med
        HccRuleRejectionState rejectionState = HccRuleRejectionState.builder()
                .id(1L)
                .patientId(PATIENT_ID)
                .ruleId(RULE_ID)
                .modelType(HccModelType.CMS)
                .rejectedAt(LocalDate.now().minusMonths(1))
                .lastTriggeringConceptAlias("BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED")
                .build();

        when(patientDataPort.getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE))
                .thenReturn(Optional.of(rejectionState));

        // Current concept is the same as the last triggering concept (refill of same med)
        List<String> currentConcepts = Arrays.asList("BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED");

        // When
        boolean result = service.shouldSurface(PATIENT_ID, RULE_ID, MODEL_TYPE, currentConcepts);

        // Then: Should NOT surface because same concept triggered again (refill)
        assertFalse(result);
        verify(patientDataPort).getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE);
    }

    /**
     * Scenario (c): Rejection exists, different concept alias present → resurface
     *
     * HIV spec scenario 2: Different medication after rejection → resurfaces
     */
    @Test
    void shouldResurface_whenRejectionExistsAndDifferentConceptPresent() {
        // Given: A rejection exists with last triggering concept = Lamivudine (component med)
        HccRuleRejectionState rejectionState = HccRuleRejectionState.builder()
                .id(1L)
                .patientId(PATIENT_ID)
                .ruleId(RULE_ID)
                .modelType(HccModelType.CMS)
                .rejectedAt(LocalDate.now().minusMonths(1))
                .lastTriggeringConceptAlias("LAMIVUDINE_MED")
                .build();

        when(patientDataPort.getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE))
                .thenReturn(Optional.of(rejectionState));

        // Current concept is DIFFERENT (patient now on combination ART therapy)
        List<String> currentConcepts = Arrays.asList("BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED");

        // When
        boolean result = service.shouldSurface(PATIENT_ID, RULE_ID, MODEL_TYPE, currentConcepts);

        // Then: Should resurface because a DIFFERENT concept is now present
        assertTrue(result);
        verify(patientDataPort).getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE);
    }

    @Test
    void shouldStaySuppressed_whenRejectionExistsAndNoCurrentConcepts() {
        // Given: A rejection exists
        HccRuleRejectionState rejectionState = HccRuleRejectionState.builder()
                .id(1L)
                .patientId(PATIENT_ID)
                .ruleId(RULE_ID)
                .modelType(HccModelType.CMS)
                .rejectedAt(LocalDate.now().minusMonths(1))
                .lastTriggeringConceptAlias("BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_MED")
                .build();

        when(patientDataPort.getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE))
                .thenReturn(Optional.of(rejectionState));

        // No current concepts
        List<String> currentConcepts = Collections.emptyList();

        // When
        boolean result = service.shouldSurface(PATIENT_ID, RULE_ID, MODEL_TYPE, currentConcepts);

        // Then: Should NOT surface because no new evidence
        assertFalse(result);
    }

    @Test
    void shouldResurface_whenOneOfMultipleConceptsIsDifferent() {
        // Given: A rejection exists with last triggering concept = Lamivudine
        HccRuleRejectionState rejectionState = HccRuleRejectionState.builder()
                .id(1L)
                .patientId(PATIENT_ID)
                .ruleId(RULE_ID)
                .modelType(HccModelType.CMS)
                .rejectedAt(LocalDate.now().minusMonths(1))
                .lastTriggeringConceptAlias("LAMIVUDINE_MED")
                .build();

        when(patientDataPort.getRejectionState(PATIENT_ID, RULE_ID, MODEL_TYPE))
                .thenReturn(Optional.of(rejectionState));

        // Multiple current concepts - one is the same, one is different
        List<String> currentConcepts = Arrays.asList(
                "LAMIVUDINE_MED",  // same as last triggering
                "TENOFOVIR_MED"    // different - should trigger resurfacing
        );

        // When
        boolean result = service.shouldSurface(PATIENT_ID, RULE_ID, MODEL_TYPE, currentConcepts);

        // Then: Should resurface because at least one DIFFERENT concept is present
        assertTrue(result);
    }
}
