package com.algoaccel.hcc.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Synthetic patient for HCC testing.
 */
@Entity
@Table(name = "hcc_patient")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HccPatient {

    @Id
    @Column(name = "patient_id", length = 100)
    private String patientId;

    private Integer age;

    @Column(length = 10)
    private String sex;

    /**
     * Enrollment type: CMS (Medicare), HHS (Commercial), or ESRD
     */
    @Column(name = "enrollment_type", length = 10)
    private String enrollmentType;
}
