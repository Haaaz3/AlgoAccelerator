package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccSuspectRule;
import com.algoaccel.hcc.model.enums.HccRuleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HccSuspectRuleRepository extends JpaRepository<HccSuspectRule, Long> {

    List<HccSuspectRule> findByStatus(HccRuleStatus status);

    List<HccSuspectRule> findByHccCategory(String hccCategory);
}
