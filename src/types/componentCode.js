/**
 * Component Code Types
 *
 * Types for code viewing, editing, and override tracking with mandatory notes.
 * Supports CQL and Synapse SQL output formats.
 */

// ============================================================================
// Code Output Formats
// ============================================================================

                                                     

export const CODE_OUTPUT_FORMATS                                               = [
  { value: 'cql', label: 'CQL' },
  { value: 'synapse-sql', label: 'Synapse SQL' },
];

/**
 * Get the display label for a code output format
 */
export function getFormatLabel(format                  )         {
  return CODE_OUTPUT_FORMATS.find(f => f.value === format)?.label ?? format;
}

// ============================================================================
// Code Edit Notes (Git-style comments)
// ============================================================================

;                              
             
                                                
                    
                                                                  
                 
                                               
                  
                                                 
                           
                                                      
                                                                 
                                                          
                        
 

// ============================================================================
// Code Override - Per Format
// ============================================================================

;                              
                                                   
                           
                                                              
               
                                                 
                    
                                                    
                    
                                                          
                    
                                                                     
                        
                                                                         
                                
 

// ============================================================================
// Component Code State
// ============================================================================

;                                    
                                                       
                      
                                       
                                                             
                                                     
                                   
                                                
                     
                                             
                      
 

// ============================================================================
// Code Generation Result (per component)
// ============================================================================

;                                     
                         
                      
                                     
               
                                            
                        
                                             
                        
                                              
                     
 

// ============================================================================
// Full Measure Code Result (with component breakdown)
// ============================================================================

;                                   
                          
                           
                                            
                   
                                          
                                    
                                              
                        
                                          
                           
                            
             
                        
                      
                         
    
 

// ============================================================================
// Code Viewer Props
// ============================================================================

;                                          
                                               
                      
                                              
                               
                           
                                
                                     
                                                     
                                               
                                                   
                                           
                                             
                                             
                                  
                                                       
                            
                                       
                              
 

// ============================================================================
// Note Display Props
// ============================================================================

;                                    
                         
                        
                                                     
                    
                                       
                       
 

;                                   
                         
                        
                                            
                     
                                        
                                      
                                       
                                                        
 

// ============================================================================
// Helper Functions
// ============================================================================

export function createCodeEditNote(
  content        ,
  format                  ,
  author         = 'User',
  changeType                             ,
  previousCode         
)               {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    author,
    content,
    format,
    changeType,
    previousCode,
  };
}

export function createCodeOverride(
  format                  ,
  code        ,
  originalGeneratedCode        ,
  note              
)               {
  return {
    format,
    code,
    isLocked: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [note],
    originalGeneratedCode,
  };
}

export function formatNoteTimestamp(isoTimestamp        )         {
  const date = new Date(isoTimestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNoteForCodeComment(note              , format                  )         {
  const timestamp = formatNoteTimestamp(note.timestamp);
  // CQL uses // comments, SQL uses -- comments
  const prefix = format === 'cql' ? '//' : '--';
  const formatLabel = getFormatLabel(format).toUpperCase();
  const changeTypeLabel = note.changeType ? ` [${note.changeType}]` : '';

  return `${prefix} [EDIT NOTE - ${formatLabel}]${changeTypeLabel} (${timestamp}): ${note.content}`;
}

export function getAllNotesForComponent(
  overrides                                                 
)                 {
  const allNotes                 = [];

  for (const override of Object.values(overrides)) {
    if (override?.notes) {
      allNotes.push(...override.notes);
    }
  }

  // Sort by timestamp, newest first
  return allNotes.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ============================================================================
// Default State Factory
// ============================================================================

export function createDefaultComponentCodeState(componentId        )                     {
  return {
    componentId,
    overrides: {},
    selectedFormat: 'cql',
    isEditing: false,
    pendingNote: '',
  };
}
