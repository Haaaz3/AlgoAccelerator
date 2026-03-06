package com.algoaccel.hcc.model.enums;

/**
 * Medication combination type - affects weighting in stratification.
 * Combination drugs carry more weight than component drugs.
 */
public enum CombinationType {
    COMBINATION,  // Full combination drug (e.g., Bictegravir-Emtricitabine-Tenofovir)
    COMPONENT     // Single component drug (e.g., Emtricitabine alone)
}
