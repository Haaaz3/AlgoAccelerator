package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccLabResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HccLabResultRepository extends JpaRepository<HccLabResult, Long> {

    List<HccLabResult> findByPatientIdAndConceptAliasAndResultDateBetween(
            String patientId, String conceptAlias, LocalDate startDate, LocalDate endDate);
}
