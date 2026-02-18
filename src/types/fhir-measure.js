/**
 * FHIR R4 Measure Resource Types
 *
 * Based on: https://hl7.org/fhir/R4/measure.html
 * QI-Core: https://hl7.org/fhir/us/qicore/
 * CQL: https://cql.hl7.org/
 *
 * This file defines types that align with FHIR standards for
 * clinical quality measures, enabling interoperability with
 * EHR systems, measure repositories, and CQL engines.
 */

// ============================================================================
// FHIR Core Types
// ============================================================================

                             
                  
                
                                                            
 

                         
                 
               
                   
                   
 

                                  
                   
                
 

                         
                             
                             
 

                            
                     
                
                   
 

// ============================================================================
// FHIR Measure Population Codes (from measure-population CodeSystem)
// ============================================================================

                                   
                        
               
                         
                 
                           
                           
                        
                                  
                          

// Standard FHIR population codes
export const POPULATION_CODES                                        = {
  'initial-population': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'initial-population',
    display: 'Initial Population'
  },
  'numerator': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'numerator',
    display: 'Numerator'
  },
  'numerator-exclusion': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'numerator-exclusion',
    display: 'Numerator Exclusion'
  },
  'denominator': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'denominator',
    display: 'Denominator'
  },
  'denominator-exclusion': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'denominator-exclusion',
    display: 'Denominator Exclusion'
  },
  'denominator-exception': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'denominator-exception',
    display: 'Denominator Exception'
  },
  'measure-population': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'measure-population',
    display: 'Measure Population'
  },
  'measure-population-exclusion': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'measure-population-exclusion',
    display: 'Measure Population Exclusion'
  },
  'measure-observation': {
    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
    code: 'measure-observation',
    display: 'Measure Observation'
  }
};

// ============================================================================
// CQL Expression Types
// ============================================================================

;                            
                                                                            
                                                                                          
                                                             
                     
                                                                         
                     
 

// ============================================================================
// FHIR Measure Resource Components
// ============================================================================

/** A single population within a measure group */
;                                   
                                              
              
                                                                 
                        
                                   
                       
                                                  
                       
 

/** Stratifier for breaking down measure results */
;                                   
              
                         
                       
                        
                     
                          
                         
                         
     
 

/** A group of populations within a measure (most measures have one group) */
;                              
              
                         
                       
                                  
                                   
 

/** Supplemental data element */
;                                         
              
                         
                            
                       
                       
 

// ============================================================================
// QI-Core Data Element Types (for structured criteria)
// ============================================================================

;                               
             
               
               
               
                 
                       
                              
                        
                         
                  
                      
                    
              
                        
                  
                   
                   
           

/** Mapping from our internal types to QI-Core resource types */
export const DATA_ELEMENT_TO_QICORE                                     = {
  'diagnosis': 'Condition',
  'encounter': 'Encounter',
  'procedure': 'Procedure',
  'observation': 'Observation',
  'medication': 'MedicationRequest',
  'demographic': 'Patient',
  'assessment': 'Observation',
  'immunization': 'Immunization',
  'lab': 'Observation',
  'device': 'DeviceRequest',
  'communication': 'Communication',
};

// ============================================================================
// Standard Code Systems
// ============================================================================

export const CODE_SYSTEMS = {
  // Terminology
  SNOMED: 'http://snomed.info/sct',
  ICD10CM: 'http://hl7.org/fhir/sid/icd-10-cm',
  ICD10PCS: 'http://www.cms.gov/Medicare/Coding/ICD10',
  CPT: 'http://www.ama-assn.org/go/cpt',
  HCPCS: 'https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets',
  LOINC: 'http://loinc.org',
  RXNORM: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  CVX: 'http://hl7.org/fhir/sid/cvx',
  NDC: 'http://hl7.org/fhir/sid/ndc',

  // Value Set OID prefix
  VSAC: 'http://cts.nlm.nih.gov/fhir/ValueSet/',

  // Measure-specific
  MEASURE_POPULATION: 'http://terminology.hl7.org/CodeSystem/measure-population',
  MEASURE_TYPE: 'http://terminology.hl7.org/CodeSystem/measure-type',
  MEASURE_SCORING: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
  MEASURE_IMPROVEMENT_NOTATION: 'http://terminology.hl7.org/CodeSystem/measure-improvement-notation',
}         ;

// ============================================================================
// FHIR Measure Resource (R4)
// ============================================================================

;                                                                      
;                                                                          

;                                                                                                        
;                                                                                                        
;                                                         

/**
 * FHIR R4 Measure Resource
 *
 * This is the core structure for representing clinical quality measures
 * in a standards-compliant way.
 */
;                             
                          

             
              
               
                            
                   
                
                 

           
                            
                         
                
                     

                
                       
                   
                 
                     

                     
                           

                   
                            
                                    

                     
                    
                                           
                                                            

                     
                            
                                
                           
                                        

                                          
                     
                                           

                                                  
                     
                           
                                                                                                                                       
                     
                 
                      
     

                    
                         
                                               

                    
                          
                           

             
                    

                                           
                     
                
                         
                       
                           
                          
                         
     
 

// ============================================================================
// CQL Library Types
// ============================================================================

/**
 * Represents a CQL library that contains measure logic
 */
;                            
                                                                      
               
                        
                  
                                                
                 
                                    
                                     
     
                                                    
                   
                 
                     
                  
     
                               
                    
                 
                                       
     
                          
                
                 
               
                   
                     
     
                                 
                      
                 
               
     
                               
                     
                 
                 
                     
     
                                                  
                                                     
                                             
                      
                 
                     
                                       
                       
                        
     
                             
                    
                 
                                                      
                       
                       
     
 

// ============================================================================
// Value Set Types (FHIR R4)
// ============================================================================

;                              
                           
              
               
                            
                   
                
                 
                            
                         
                
                     
                       

                                        
             
                       
                    
                      
                       
                       
                     
                         
                             
                            
                       
                        
           
         
                      
                         
                                                                                                         
                      
         
                          
       
                     
                      
                                        
       
    

                                                
               
                        
                      
                   
                    
                      
                      
                         
                         
                       
                    
                       
       
    
 

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert internal population type to FHIR population type
 */
export function toFHIRPopulationType(type        )                        {
  const mapping                                        = {
    'initial_population': 'initial-population',
    'denominator': 'denominator',
    'denominator_exclusion': 'denominator-exclusion',
    'denominator_exception': 'denominator-exception',
    'numerator': 'numerator',
    'numerator_exclusion': 'numerator-exclusion',
  };
  return mapping[type] || 'initial-population';
}

/**
 * Convert FHIR population type to internal type
 */
export function fromFHIRPopulationType(type                       )         {
  const mapping                                        = {
    'initial-population': 'initial_population',
    'denominator': 'denominator',
    'denominator-exclusion': 'denominator_exclusion',
    'denominator-exception': 'denominator_exception',
    'numerator': 'numerator',
    'numerator-exclusion': 'numerator_exclusion',
    'measure-population': 'measure_population',
    'measure-population-exclusion': 'measure_population_exclusion',
    'measure-observation': 'measure_observation',
  };
  return mapping[type] || 'initial_population';
}

/**
 * Get the CodeableConcept for a population type
 */
export function getPopulationCode(type                       )                  {
  return {
    coding: [POPULATION_CODES[type]],
    text: POPULATION_CODES[type].display
  };
}

/**
 * Create a CQL expression reference
 */
export function cqlExpression(definitionName        , libraryName         )             {
  return {
    language: 'text/cql-identifier',
    expression: definitionName,
    reference: libraryName ? `Library/${libraryName}` : undefined
  };
}

/**
 * Get the standard code system URL for a code system abbreviation
 */
export function getCodeSystemUrl(system        )         {
  const systemMap                         = {
    'ICD10': CODE_SYSTEMS.ICD10CM,
    'ICD10CM': CODE_SYSTEMS.ICD10CM,
    'ICD10PCS': CODE_SYSTEMS.ICD10PCS,
    'SNOMED': CODE_SYSTEMS.SNOMED,
    'CPT': CODE_SYSTEMS.CPT,
    'HCPCS': CODE_SYSTEMS.HCPCS,
    'LOINC': CODE_SYSTEMS.LOINC,
    'RxNorm': CODE_SYSTEMS.RXNORM,
    'RXNORM': CODE_SYSTEMS.RXNORM,
    'CVX': CODE_SYSTEMS.CVX,
    'NDC': CODE_SYSTEMS.NDC,
  };
  return systemMap[system] || system;
}
