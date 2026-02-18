/**
 * HDI (HealtheIntent) Data Model Type Definitions
 *
 * These interfaces define the structure for generating production-ready SQL
 * queries that follow the HDI platform patterns with CTEs, ontology joins,
 * and predicate-based filtering.
 */

// ============================================================================
// Core SQL Generation Configuration
// ============================================================================

                                      
                                                     
                       
                                                                                
                             
                                                            
                                       
                                                                   
                     
                                                 
                           
                                                     
                       
                              
                              
    
                                                    
                  
                              
                              
    
 

// ============================================================================
// Ontology / Terminology Models
// ============================================================================

                                    
                                                                                
                      
                                                                                   
                           
                                                                    
                              
 

                                     
                               
                       
                          
                  
                                    
                       
 

// ============================================================================
// Demographics Data Model
// ============================================================================

                                        
                       
                
                       

                        
         
                 
                 
                                                                          
                           
                                                                             
                                  
    

                                                        
            
                       
                       
    

                              
              
                       
                       
    

                               
                                          

                               
               
                           
                      
                         
    

                                   
                   
                       
                       
    

                              
               
                       
                       
    

                         
          
                       
                       
    

                             
              
                       
                       
    
 

// ============================================================================
// Condition Data Model
// ============================================================================

                                     
                    
                
                       

                                                          
           
                         
                          
                                    
    

                                            
                                                  

                                    
            
                       
                       
    

                             
            
                                                    
                                   
                                               
                                 
                                              
                          
                           
                                                                                
                                  
    

                                         
               
                     
                            
    

                                                
                               
 

// ============================================================================
// Result/Observation Data Model
// ============================================================================

                                  
                 
                
                       

                                              
           
                         
                          
                                    
    

                                 
           
                                    
               
                   
                   
                                                                       
      
                                     
                
                         
                         
      
                             
                         
    

                                    
                           

                      
                    

                             
            
                                 
                          
                           
                                            
                                  
    
 

// ============================================================================
// Encounter Data Model
// ============================================================================

                                     
                    
                
                       

                                         
                   
                       
                       
    

                             
            
                                 
                          
                                            
                                  
    

                                  
                          
 

// ============================================================================
// Procedure Data Model
// ============================================================================

                                     
                    
                
                       

                                                            
           
                         
                          
                                    
    

                             
            
                                   
                          
                           
                                            
                                  
    

                                         
               
                     
    
 

// ============================================================================
// Medication Data Model
// ============================================================================

                                      
                     
                
                       

                                                  
           
                         
                          
                                    
    

                          
                                                      

                             
            
                                   
                          
                                            
                                  
    

                                                                    
                                                    
 

// ============================================================================
// Immunization Data Model
// ============================================================================

                                        
                       
                
                       

                                            
           
                         
                          
                                    
    

                             
            
                                        
                          
                           
    
 

// ============================================================================
// Composite Types
// ============================================================================

                                
                         
                      
                   
                      
                      
                       
                          

                                
               
                                                                                                             
                   
 

                            
                             
                             
 

// ============================================================================
// Index Event Timing (e.g., IPSD-relative lookbacks)
// ============================================================================

/**
 * Describes timing relative to an index event (e.g., IPSD).
 * Instead of lookback from current_date(), the predicate joins to an
 * index-event CTE and computes date offsets from that event date.
 */
                                   
                                                                    
                   
                                                         
                     
                                                                
                      
                                                               
                     
 

/**
 * For medication measures that require cumulative days-supply calculation
 * (e.g., AMM acute/continuation phase).
 */
                                             
                                         
                      
                                             
                        
                                
                               
                                                  
                     
                                                
                             
                                           
                    
 

// ============================================================================
// Predicate Combination Logic
// ============================================================================

                                                                                        

                                 
                              
                                                                              
 

// ============================================================================
// SQL Generation Output
// ============================================================================

                                      
                   
              
                   
                     
             
                           
                             
                                                   
                        
    
 

// ============================================================================
// Measure-to-SQL Mapping
// ============================================================================

                                    
                                  
                    

                                         
                              

                                                
                                   

                                                   
                
                                       
                                 
                                          
                                          
                               
                                        
    

                                                                                             
                          
                  
                  
                          
      

                                                                               
                                         

                                                                                        
                           
 

                                      
                                 
                
                                 
              
 

// ============================================================================
// HDI Table Schema References
// ============================================================================

export const HDI_TABLES = {
  // Core person tables
  PERSON: 'ph_d_person',
  PERSON_DEMOGRAPHICS: 'ph_d_person_demographics',
  PERSON_RACE: 'ph_d_person_race',

  // Ontology
  ONTOLOGY: 'ph_d_ontology',

  // Clinical fact tables
  CONDITION: 'ph_f_condition',
  RESULT: 'ph_f_result',
  ENCOUNTER: 'ph_f_encounter',
  ENCOUNTER_TYPE: 'ph_f_encounter_type',
  PROCEDURE: 'ph_f_procedure',
  MEDICATION: 'ph_f_medication',
  IMMUNIZATION: 'ph_f_immunization',

  // Supporting tables
  CLAIM: 'ph_f_claim',
}         ;

export const HDI_COMMON_COLUMNS = {
  /** Standard predicate output columns */
  PREDICATE_OUTPUT: [
    'population_id',
    'empi_id',
    'data_model',
    'identifier',
    'clinical_start_date',
    'clinical_end_date',
    'description'
  ],

  /** Required join columns */
  JOIN_KEYS: ['population_id', 'empi_id'],
}         ;
