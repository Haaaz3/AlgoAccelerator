package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccMedicationOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HccMedicationOrderRepository extends JpaRepository<HccMedicationOrder, Long> {

    List<HccMedicationOrder> findByPatientIdAndConceptAliasInAndStartDateBetween(
            String patientId, List<String> conceptAliases, LocalDate startDate, LocalDate endDate);
}
