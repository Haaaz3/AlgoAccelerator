/**
 * Import/Export API client.
 */

import { get, post } from './client';

// Request/Response types

;                               
                                       
                                         
                                               
                                       
                   
                      
 

;                              
                             
                           
                                   
                   
                  
 

;                            
                                      
                                        
                  
                     
 

// API functions

/**
 * Import data from Zustand export format.
 */
export async function importData(data               )                        {
  return post              ('/import', data);
}

/**
 * Export all data to Zustand format.
 */
export async function exportData()                      {
  return get            ('/import/export');
}
