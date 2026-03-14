package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.HccModelType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Diagnosis/condition record for HCC synthetic patient data.
 * Used for suppression checks - if patient has a validated HCC, suppress suspect output.
 */
@Entity
@Table(name = "hcc_diagnosis", indexes = {
    @Index(name = "idx_diag_patient", columnList = "patient_id"),
    @Index(name = "idx_diag_hcc", columnList = "hcc_category"),
    @Index(name = "idx_diag_model", columnList = "model_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccDiagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false, length = 100)
    private String patientId;

    @Column(name = "icd_code", nullable = false, length = 20)
    private String icdCode;

    @Column(name = "hcc_category", length = 50)
    private String hccCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false, length = 10)
    private HccModelType modelType;

    /**
     * Suppression status: "Fully Validated", "Needs Administrative Attention",
     * "Needs Clinical and Administrative Attention", etc.
     */
    @Column(name = "suppression_status", length = 50)
    private String suppressionStatus;
}
