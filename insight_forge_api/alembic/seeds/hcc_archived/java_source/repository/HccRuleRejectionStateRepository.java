package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccRuleRejectionState;
import com.algoaccel.hcc.model.enums.HccModelType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HccRuleRejectionStateRepository extends JpaRepository<HccRuleRejectionState, Long> {

    Optional<HccRuleRejectionState> findByPatientIdAndRuleIdAndModelType(
            String patientId, Long ruleId, HccModelType modelType);
}
