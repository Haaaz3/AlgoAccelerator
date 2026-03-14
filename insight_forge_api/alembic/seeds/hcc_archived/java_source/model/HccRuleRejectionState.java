package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.HccModelType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Tracks per-patient rejection state for resurfacing logic.
 * When a clinician rejects a suspect condition, this record prevents the same
 * medication concept from re-triggering the suspect until a different concept appears.
 */
@Entity
@Table(name = "hcc_rule_rejection_state", indexes = {
    @Index(name = "idx_rejection_patient", columnList = "patient_id"),
    @Index(name = "idx_rejection_rule", columnList = "rule_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccRuleRejectionState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false, length = 100)
    private String patientId;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false, length = 10)
    private HccModelType modelType;

    @Column(name = "rejected_at", nullable = false)
    private LocalDate rejectedAt;

    /**
     * The concept that triggered the suspect before rejection.
     * Used to determine if a new, different concept should resurface the suspect.
     */
    @Column(name = "last_triggering_concept_alias")
    private String lastTriggeringConceptAlias;
}
