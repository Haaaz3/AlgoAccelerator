package com.algoaccel.hcc.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Lab result record for HCC synthetic patient data.
 */
@Entity
@Table(name = "hcc_lab_result", indexes = {
    @Index(name = "idx_lab_patient", columnList = "patient_id"),
    @Index(name = "idx_lab_concept", columnList = "concept_alias")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccLabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false, length = 100)
    private String patientId;

    @Column(name = "concept_alias", nullable = false)
    private String conceptAlias;

    @Column(name = "result_date", nullable = false)
    private LocalDate resultDate;

    /**
     * Qualitative result: POSITIVE, NEGATIVE, etc.
     */
    @Column(name = "qualitative_result", length = 50)
    private String qualitativeResult;

    /**
     * Quantitative result for numeric lab values.
     */
    @Column(name = "quantitative_result", precision = 10, scale = 2)
    private BigDecimal quantitativeResult;
}
