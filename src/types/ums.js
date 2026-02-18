/**
 * Universal Measure Spec (UMS) Schema
 *
 * A canonical, machine-readable representation of clinical quality measure logic.
 * ALIGNED WITH FHIR R4 Measure Resource and CQL Standards.
 *
 * Key alignments:
 * - Population types use FHIR measure-population CodeSystem
 * - Value sets reference VSAC OIDs with FHIR canonical URLs
 * - Criteria can be expressed as CQL or structured logic
 * - Code systems use standard FHIR URIs
 *
 * References:
 * - FHIR Measure: https://hl7.org/fhir/R4/measure.html
 * - CQL: https://cql.hl7.org/
 * - QI-Core: https://hl7.org/fhir/us/qicore/
 */

             
              
                        
             
                  
         
         
             
                     
                     
                      
                        

// Re-export FHIR types for convenience
             
              
                        
             
                  
         
         
             
                     
  

// ============================================================================
// Core Types
// ============================================================================

                                                        
                                                                                 
                                                        
                                                                                     

/** FHIR-aligned population types (using kebab-case as per FHIR spec) */
                            
                        
                 
                           
                           
               
                         
                                                           
                        
                           
                           
                          

                                                   
                                                                                                         

/** Standard code systems with FHIR URIs */
                        
                                                       
             
              
                                            
                                                    
                                                                              
                                      
                                                                 
                                                 
                   // http://hl7.org/fhir/sid/ndc

// ============================================================================
// Value Sets & Codes (FHIR-aligned)
// ============================================================================

                                
               
                  
                     
                                               
                     
                                   
                   
 

                                    
                    
             
                                                                    
               
                                                                                                                   
               
               
                   
                                                            
                         
                                                     
                          
                              
                  
                                                                             
                     
                                           
                     
                                             
                   
 

// ============================================================================
// Timing Requirements (CQL-aligned)
// ============================================================================

/**
 * Timing requirement aligned with CQL temporal operators
 *
 * CQL examples:
 * - "during Measurement Period"
 * - "3 months or less before start of Measurement Period"
 * - "starts during Measurement Period"
 */
                                    
                                   
                      
                              
                                                                                                                   
                                       
                                                                                                 
                                         
            
                  
                                                
                                                                 
    
                              
                                                  
                         
 

/** @deprecated Use TimingRequirement instead */
                                     
                             
                                                                                                
            
                  
                                                
                                  
    
                              
 

                            
                                                   
               
                     
 

// ============================================================================
// Structured Timing Constraint (for timing editor)
// ============================================================================

                            
            
                   
                    
            
                   
                 
               

                                                         

                          
                        
                            
                              
                      
                    
          
          
                     
                   
                    
                     

// ============================================================================
// Timing Window Types (for window-based timing like "From IPSD through 231 days after IPSD")
// ============================================================================

                                                           

                                 
                       
                             
                                
                                             
 

                               
                        
                      
 

                                       
                         
                                
                     
                            
                            
 

export function getEffectiveWindow(override                             )                      {
  if (!override) return null;
  return override.modified ?? override.original;
}

export function isWindowModified(override                             )          {
  if (!override) return false;
  return override.modified !== null;
}

export const TIMING_WINDOW_ANCHORS                 = [
  'Measurement Period Start',
  'Measurement Period End',
  'IPSD',
  'IPED',
  'Encounter Start',
  'Encounter End',
  'Diagnosis Date',
  'Procedure Date',
  'Discharge Date',
];

/**
 * A structured timing constraint for code generation.
 * This is the canonical representation used by all code generators.
 */
;                                  
                                                    
                  
                          
                           
                                                                             
                       
                                            
                        
                                       
                       
 

/**
 * Tracks the original parsed timing alongside any user modification.
 * Used for persisting and displaying timing overrides.
 */
;                                
                                                                               
                             
                                                                  
                                    
                                                            
                            
                                                          
                            
 

export const TIMING_OPERATORS                   = [
  'during',
  'before end of',
  'after start of',
  'within',
  'starts during',
  'ends during',
  'overlaps',
];

export const TIME_UNITS             = ['day(s)', 'month(s)', 'year(s)'];

export const TIMING_ANCHORS                 = [
  'Measurement Period',
  'Measurement Period End',
  'Measurement Period Start',
  'Encounter Period',
  'Diagnosis Date',
  'IPSD',
  'IPED',
  'Encounter Start',
  'Encounter End',
  'Procedure Date',
  'Discharge Date',
];

/**
 * Returns the effective timing constraint, preferring user overrides.
 */
export function getEffectiveTiming(override                       )                          {
  if (!override) return null;
  return override.modified ?? override.original;
}

/**
 * Returns true if the timing has been modified from the original.
 */
export function isTimingModified(override                       )          {
  if (!override) return false;
  return override.modified !== null;
}

/**
 * Converts a TimingRequirement to a TimingConstraint for the timing editor.
 */
export function timingRequirementToConstraint(
  tr                   ,
  concept        
)                   {
  let operator                 = 'during';
  let value                = null;
  let unit                  = null;
  let anchor               = 'Measurement Period';

  // Map operator
  if (tr.operator === 'during' || tr.operator === 'includes') {
    operator = 'during';
  } else if (tr.operator === 'starts') {
    operator = 'starts during';
  } else if (tr.operator === 'ends') {
    operator = 'ends during';
  } else if (tr.operator === 'overlaps') {
    operator = 'overlaps';
  } else if (tr.operator === 'before') {
    operator = 'before end of';
  } else if (tr.operator === 'after') {
    operator = 'after start of';
  }

  // Map window if present
  if (tr.window) {
    value = tr.window.value;
    if (tr.window.unit === 'days') unit = 'day(s)';
    else if (tr.window.unit === 'months') unit = 'month(s)';
    else if (tr.window.unit === 'years') unit = 'year(s)';

    if (tr.window.direction === 'within' || tr.window.direction === 'before') {
      operator = 'within';
    } else if (tr.window.direction === 'after') {
      operator = 'after start of';
    }
  }

  // Map anchor
  if (tr.relativeTo === 'Measurement Period' || tr.relativeTo === 'measurement_period') {
    anchor = 'Measurement Period';
  } else if (tr.relativeTo === 'encounter') {
    anchor = 'Encounter Period';
  } else if (tr.relativeTo === 'diagnosis onset') {
    anchor = 'Diagnosis Date';
  }

  return { concept, operator, value, unit, anchor };
}

/**
 * Converts a TimingConstraint back to a TimingRequirement.
 */
export function constraintToTimingRequirement(
  tc                  ,
  confidence                  = 'high'
)                    {
  let description = '';
  let operator                                = 'during';
  let relativeTo         = 'Measurement Period';
  let window                                         ;

  // Build description
  if (tc.value && tc.unit) {
    description = `${tc.operator} ${tc.value} ${tc.unit} of ${tc.anchor}`;
  } else {
    description = `${tc.operator} ${tc.anchor}`;
  }

  // Map operator
  if (tc.operator === 'during' || tc.operator === 'starts during' || tc.operator === 'ends during') {
    operator = tc.operator === 'during' ? 'during' : tc.operator === 'starts during' ? 'starts' : 'ends';
  } else if (tc.operator === 'overlaps') {
    operator = 'overlaps';
  } else if (tc.operator === 'before end of') {
    operator = 'before';
  } else if (tc.operator === 'after start of') {
    operator = 'after';
  } else if (tc.operator === 'within') {
    operator = 'during'; // "within" maps to during with a window
  }

  // Map anchor to relativeTo
  if (tc.anchor === 'Measurement Period' || tc.anchor === 'Measurement Period End' || tc.anchor === 'Measurement Period Start') {
    relativeTo = 'Measurement Period';
  } else if (tc.anchor === 'Encounter Period') {
    relativeTo = 'encounter';
  } else if (tc.anchor === 'Diagnosis Date') {
    relativeTo = 'diagnosis onset';
  }

  // Map window
  if (tc.value && tc.unit) {
    let windowUnit                                        = 'days';
    if (tc.unit === 'day(s)') windowUnit = 'days';
    else if (tc.unit === 'month(s)') windowUnit = 'months';
    else if (tc.unit === 'year(s)') windowUnit = 'years';

    let direction                                = 'within';
    if (tc.operator === 'within' || tc.operator === 'before end of') {
      direction = 'within';
    } else if (tc.operator === 'after start of') {
      direction = 'after';
    }

    window = { value: tc.value, unit: windowUnit, direction };
  }

  return { description, operator, relativeTo, window, confidence };
}

// ============================================================================
// Data Elements (QI-Core aligned)
// ============================================================================

/**
 * Data element types aligned with QI-Core resource types
 *
 * Mapping:
 * - diagnosis -> Condition
 * - encounter -> Encounter
 * - procedure -> Procedure
 * - observation -> Observation (labs, vitals, assessments)
 * - medication -> MedicationRequest/MedicationAdministration
 * - demographic -> Patient
 * - immunization -> Immunization
 */
;                            
                                        
                                        
                                        
                                          
                                                
                                      
                                                       
                                           
                                            
                                            
                                                 
                    // QI-Core Goal

/** FHIR Encounter.status values relevant to eCQM logic */
export const ENCOUNTER_STATUS_OPTIONS = ['finished', 'in-progress', 'cancelled', 'entered-in-error'];

/** FHIR Observation.status values relevant to eCQM logic */
export const OBSERVATION_STATUS_OPTIONS = ['final', 'amended', 'corrected', 'preliminary', 'registered'];

/** FHIR MedicationRequest.intent values relevant to eCQM logic */
export const MEDICATION_INTENT_OPTIONS = ['order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'plan', 'proposal'];

;







                                                                             
                               
                                                                
                                  
                                                  
                                

     
                                                                       
                                                            
     
                
                    
                    
                      
                      
                  
                                                      
    

     
                                                  
                                                               
     
                                  

                                           
                                           
                                                   
                                             

                                                                                 
                                  

                                                                            
                                      

                                                       
                                    
                                                       
                                   

                                                                       
                     
                                                        
                             

                              
                  
                             

                                             
                             
                                             
                         

                                                   
                          
                               
                    
                      
     

                                  
                              

                                                                 
                            
 

// ============================================================================
// Logical Clauses (CQL expression trees)
// ============================================================================

/**
 * Represents an operator override between two sibling children in a clause.
 * Allows different operators between different pairs of siblings.
 */
;                                   
                                 
                    
                                  
                  
                                     
                            
 

;                               
             
                                                                              
                            
                      
                                            
                              
                             
                                    
                      
                            
                             
     
                                              
                                                                 
     
                                           
 

// ============================================================================
// Population Definitions (FHIR Measure.group.population aligned)
// ============================================================================

;                                      
             
                                                                                         
                       
                                   
                      
                                                      
                    
                                 
                          
                                                    
                          
                              
                             
                       
                                           
                         
                                                                        
                             
 

// ============================================================================
// Stratification & Supplemental Data (FHIR-aligned)
// ============================================================================

;                            
             
                                             
                         
                      
                          
                                          
                          
                              
                             
 

;                                  
             
                                                            
                         
               
                      
                                                                
                   
                           
                                                  
                          
 

// ============================================================================
// Attribution (for cross-program support)
// ============================================================================

;                                 
             
                                              
                      
                    
                  
                                      
    
                              
                             
 

// ============================================================================
// Global Constraints (Single Source of Truth)
// ============================================================================

/**
 * Centralized constraints that apply across the entire measure.
 * When modified, these values propagate to all relevant places.
 */
;                                   
                                                      
              
                
                
    
                                    
                                     
                              
                                                                     
                                          
                         
                                          
                          
                 
                        
    
 

// ============================================================================
// Measure Metadata (FHIR Measure resource fields)
// ============================================================================

;                                 
                                            
                    
                             
                
                       
                  
                       
                     
                                  
                  
                     
                                                                         
                          
                           
                    
                      
                           
                     
                                          
                                  
                             
                               
                                                           
                                            
                           
                               
                               
                      
                                   
                             

                         
                           
               
                                     
                            
                          
                               
                                       
                     
                      
                    
 

// ============================================================================
// CQL Library (embedded or referenced)
// ============================================================================

;                                    
                     
               
                        
                  
                                     
                       
                        
                         
                     
              
                            
               
 

// ============================================================================
// Main UMS Document
// ============================================================================

;                                      
                           
             

                                  
                           

                         
                            

                                                               
                                      

                                              
                                 

                                                    
                             

                                                          
                                        

                          
                                

                                                         
                                        

                             
                                  

                    
                        

                                
                                     
                   
                  
                     
                    
                    
    

                
                    
                    
                     
                      
                      

                     
                    
                    

                        
                        
                        
                        

                      
                                    
 

// ============================================================================
// Training Feedback Types
// ============================================================================

;                           
                
                  
                         
                    
                   
                         
                       
                           
                   
                      

;                                   
             
                    
                                 
                      
                        
                     
                      
                     
                           
                   
                      
                        
                    
                            
    
 

;                                  
                     
                    
                       
                           
                                   
            
                                           
                                         
    
 

// ============================================================================
// Parsing & Ingestion Types
// ============================================================================

;                               
                                                                                                                     
                  
                                                                                                
                              
                      
 

;                                 
                   
                             
                            
                    
                      
                          
 

// ============================================================================
// Validation Types
// ============================================================================

;                                
               
                  
                   
                      
                
                  
 

;                                
             
                
                                                  
                      
                                                         
                          
                      
                  
                                         
                              
                                                              
                             
 

;                                        
                    
                       
                    
                
                                                                 
                                                           
                                                          
                                                         
    
                                                                                       
                      
 

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize population type to FHIR kebab-case format
 */
export function normalizePopulationType(type        )                 {
  const mapping                                 = {
    'initial_population': 'initial-population',
    'initial-population': 'initial-population',
    'denominator': 'denominator',
    'denominator_exclusion': 'denominator-exclusion',
    'denominator-exclusion': 'denominator-exclusion',
    'denominator_exception': 'denominator-exception',
    'denominator-exception': 'denominator-exception',
    'numerator': 'numerator',
    'numerator_exclusion': 'numerator-exclusion',
    'numerator-exclusion': 'numerator-exclusion',
  };
  return mapping[type] || type                  ;
}

/**
 * Convert UMS to FHIR Measure resource
 */
export function toFHIRMeasure(ums                      )              {
  return {
    resourceType: 'Measure',
    id: ums.id,
    url: ums.metadata.url,
    identifier: ums.metadata.identifier,
    version: ums.metadata.version,
    name: ums.metadata.measureId,
    title: ums.metadata.title,
    status: ums.status === 'published' ? 'active' : 'draft',
    description: ums.metadata.description,
    rationale: ums.metadata.rationale,
    clinicalRecommendationStatement: ums.metadata.clinicalRecommendation,
    improvementNotation: ums.metadata.improvementNotation ? {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/measure-improvement-notation',
        code: ums.metadata.improvementNotation,
        display: ums.metadata.improvementNotation === 'increase' ? 'Increased score indicates improvement' : 'Decreased score indicates improvement'
      }]
    } : undefined,
    library: ums.metadata.library,
    group: [{
      population: ums.populations.map(pop => ({
        id: pop.id,
        code: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/measure-population',
            code: normalizePopulationType(pop.type).replace('_', '-'),
            display: pop.description
          }]
        },
        description: pop.narrative,
        criteria: pop.expression || {
          language: 'text/cql-identifier',
          expression: pop.cqlDefinitionName || pop.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        }
      })),
      stratifier: ums.stratifiers?.map(s => ({
        id: s.id,
        description: s.description,
        criteria: s.expression || {
          language: 'text/cql-identifier',
          expression: s.description
        }
      }))
    }],
    supplementalData: ums.supplementalData?.map(sd => ({
      id: sd.id,
      description: sd.description,
      criteria: sd.expression || {
        language: 'text/cql-identifier',
        expression: sd.name
      }
    }))
  };
}

// ============================================================================
// Logic Tree Helper Functions
// ============================================================================

/**
 * Check if a clause/element node is a DataElement (vs LogicalClause)
 */
export function isDataElement(node                             )                      {
  return 'type' in node && !('children' in node);
}

/**
 * Check if a clause/element node is a LogicalClause
 */
export function isLogicalClause(node                             )                        {
  return 'operator' in node && 'children' in node;
}

/**
 * Get the operator between two sibling indices, respecting per-sibling overrides
 */
export function getOperatorBetween(
  clause               ,
  index1        ,
  index2        
)                  {
  if (clause.siblingConnections) {
    const connection = clause.siblingConnections.find(
      c => (c.fromIndex === index1 && c.toIndex === index2) ||
           (c.fromIndex === index2 && c.toIndex === index1)
    );
    if (connection) {
      return connection.operator;
    }
  }
  return clause.operator;
}

/**
 * Set the operator between two sibling indices (immutable)
 */
export function setOperatorBetween(
  clause               ,
  index1        ,
  index2        ,
  operator                 
)                {
  const connections = clause.siblingConnections || [];

  // Remove existing connection for these indices
  const filtered = connections.filter(
    c => !((c.fromIndex === index1 && c.toIndex === index2) ||
           (c.fromIndex === index2 && c.toIndex === index1))
  );

  // Add new connection if different from default
  if (operator !== clause.operator) {
    filtered.push({
      fromIndex: Math.min(index1, index2),
      toIndex: Math.max(index1, index2),
      operator,
    });
  }

  return {
    ...clause,
    siblingConnections: filtered.length > 0 ? filtered : undefined,
  };
}

/**
 * Walk all DataElements in a clause tree (generator)
 */
export function* walkDataElements(
  clause               
)                                        {
  for (const child of clause.children) {
    if (isDataElement(child)) {
      yield child;
    } else if (isLogicalClause(child)) {
      yield* walkDataElements(child);
    }
  }
}

/**
 * Find a DataElement by ID in a clause tree
 */
export function findDataElementById(
  clause               ,
  id        
)                     {
  for (const element of walkDataElements(clause)) {
    if (element.id === id) {
      return element;
    }
  }
  return null;
}

/**
 * Update a DataElement in a clause tree (immutable)
 */
export function updateDataElementInClause(
  clause               ,
  id        ,
  updates                      
)                {
  return {
    ...clause,
    children: clause.children.map(child => {
      if (isDataElement(child)) {
        if (child.id === id) {
          return { ...child, ...updates };
        }
        return child;
      } else {
        return updateDataElementInClause(child, id, updates);
      }
    }),
  };
}
