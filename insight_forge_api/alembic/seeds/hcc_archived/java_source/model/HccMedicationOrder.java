package com.algoaccel.hcc.model;

import com.algoaccel.hcc.model.enums.CombinationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Medication order record for HCC synthetic patient data.
 */
@Entity
@Table(name = "hcc_medication_order", indexes = {
    @Index(name = "idx_med_patient", columnList = "patient_id"),
    @Index(name = "idx_med_concept", columnList = "concept_alias")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccMedicationOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false, length = 100)
    private String patientId;

    @Column(name = "concept_alias", nullable = false)
    private String conceptAlias;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /**
     * COMBINATION drugs (e.g., Bictegravir-Emtricitabine-Tenofovir) carry more weight
     * than COMPONENT drugs (e.g., Emtricitabine alone) in stratification.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "combination_type", length = 20)
    private CombinationType combinationType;
}
