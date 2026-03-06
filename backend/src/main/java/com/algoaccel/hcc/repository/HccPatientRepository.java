package com.algoaccel.hcc.repository;

import com.algoaccel.hcc.model.HccPatient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HccPatientRepository extends JpaRepository<HccPatient, String> {

    @Query("SELECT p.patientId FROM HccPatient p")
    List<String> findAllPatientIds();
}
