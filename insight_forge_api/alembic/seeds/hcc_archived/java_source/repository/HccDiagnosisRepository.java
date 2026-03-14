package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccDiagnosis;
import com.algoaccel.hcc.model.enums.HccModelType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HccDiagnosisRepository extends JpaRepository<HccDiagnosis, Long> {

    List<HccDiagnosis> findByPatientIdAndModelType(String patientId, HccModelType modelType);

    Optional<HccDiagnosis> findByPatientIdAndHccCategoryAndModelType(
            String patientId, String hccCategory, HccModelType modelType);
}
