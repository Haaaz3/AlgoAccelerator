/**
 * Component Library CRUD Service
 *
 * Handles creation, updating, versioning, deletion, and querying
 * of library components (atomic and composite).
 */

             
                  
                     
                   
              
            
                      
                       
                 
                    
                    
                   
                     
                        
                   
                   
                  
                      
                                   
import { calculateAtomicComplexity, calculateCompositeComplexity } from './complexityCalculator';
import { validateOID,                          } from './oidValidator';
import { deriveDueDateDays } from '../components/shared/TimingSection';

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

function generateId(prefix        )              {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// ============================================================================
// OID Validation Helper
// ============================================================================

/**
 * Convert OIDValidationResult to OIDValidationStatus for component storage
 */
export function buildOIDValidationStatus(oid        , name         )                      {
  if (!oid || oid === 'N/A') {
    return {
      status: 'unknown',
      warnings: ['No OID provided'],
      inCatalog: false,
      validatedAt: new Date().toISOString(),
    };
  }

  const result = validateOID(oid, name);

  // Determine status
  let status                               ;
  if (!result.valid) {
    status = 'invalid';
  } else if (result.catalogMatch) {
    status = 'valid';
  } else {
    status = 'unknown'; // Valid format but not in catalog
  }

  return {
    status,
    errors: result.errors.length > 0 ? result.errors.map(e => e.message) : undefined,
    warnings: result.warnings.length > 0 ? result.warnings.map(w => w.message) : undefined,
    inCatalog: !!result.catalogMatch,
    catalogName: result.catalogMatch?.name,
    validatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Creation
// ============================================================================

;                                        
              
                  
               
                                                 
 

;                                    
               
                       
                                                                
                                   
                                                    
                                                 
                           
                    
                              
                  
                     
 

export function createAtomicComponent(params                    )                  {
  const now = new Date().toISOString();
  const id = generateId('atomic');

  // Combine all value sets if additional ones provided
  const allValueSets = params.additionalValueSets
    ? [params.valueSet, ...params.additionalValueSets]
    : undefined;

  // Validate OID for primary value set
  const oidValidation = buildOIDValidationStatus(params.valueSet.oid, params.valueSet.name);

  const base                                      = {
    type: 'atomic',
    id,
    name: params.name,
    description: params.description,
    valueSet: params.valueSet,
    valueSets: allValueSets,
    timing: params.timing,
    negation: params.negation,
    oidValidation,
    dueDateDays: params.dueDateDays ?? deriveDueDateDays(params.timing, params.category, params.negation),
    dueDateDaysOverridden: params.dueDateDaysOverridden ?? false,
    ageEvaluatedAt: params.ageEvaluatedAt, // For age components: end-of-mp, start-of-mp, as-of-today, qualifying-encounter
    versionInfo: createInitialVersionInfo(params.createdBy || 'user', now),
    usage: createInitialUsage(),
    metadata: createInitialMetadata(params.category, params.tags || [], params.createdBy || 'user', now),
  };

  const complexity = calculateAtomicComplexity(base);

  return { ...base, complexity };
}

;                                       
               
                       
                            
                                 
                              
                  
                     
                                                        
 

export function createCompositeComponent(params                       )                     {
  const now = new Date().toISOString();
  const id = generateId('composite');

  const base                                         = {
    type: 'composite',
    id,
    name: params.name,
    description: params.description,
    operator: params.operator,
    children: params.children,
    dueDateDays: params.dueDateDays ?? 365, // Composites default to annual
    dueDateDaysOverridden: params.dueDateDaysOverridden ?? false,
    versionInfo: createInitialVersionInfo(params.createdBy || 'user', now),
    usage: createInitialUsage(),
    metadata: createInitialMetadata(params.category, params.tags || [], params.createdBy || 'user', now),
  };

  const complexity = calculateCompositeComplexity(base, params.resolveChild);

  return { ...base, complexity };
}

// ============================================================================
// Versioning
// ============================================================================

export function createNewVersion(
  component                  ,
  changes                  ,
  updatedBy        ,
)                   {
  const now = new Date().toISOString();
  const currentVersion = parseFloat(component.versionInfo.versionId);
  const newVersionId = (currentVersion + 0.1).toFixed(1);

  const newVersionInfo                       = {
    versionId: newVersionId,
    versionHistory: [
      ...component.versionInfo.versionHistory,
      {
        versionId: newVersionId,
        status: 'draft',
        createdAt: now,
        createdBy: updatedBy,
        changeDescription: changes.changeDescription,
      },
    ],
    status: 'draft',
  };

  const updatedMetadata                    = {
    ...component.metadata,
    updatedAt: now,
    updatedBy,
  };

  if (component.type === 'atomic') {
    return {
      ...component,
      name: changes.name ?? component.name,
      timing: changes.timing ?? component.timing,
      negation: changes.negation ?? component.negation,
      versionInfo: newVersionInfo,
      metadata: updatedMetadata,
    };
  } else {
    return {
      ...component,
      name: changes.name ?? component.name,
      operator: changes.operator ?? component.operator,
      children: changes.children ?? component.children,
      versionInfo: newVersionInfo,
      metadata: updatedMetadata,
    };
  }
}

export function archiveVersion(
  component                  ,
  supersededBy           ,
)                   {
  const now = new Date().toISOString();
  return {
    ...component,
    versionInfo: {
      ...component.versionInfo,
      status: 'archived',
      versionHistory: component.versionInfo.versionHistory.map((entry) =>
        entry.versionId === component.versionInfo.versionId
          ? { ...entry, status: 'archived'         , supersededBy }
          : entry
      ),
    },
    metadata: {
      ...component.metadata,
      updatedAt: now,
    },
  };
}

export function approveComponent(
  component                  ,
  approvedBy        ,
)                   {
  const now = new Date().toISOString();
  return {
    ...component,
    versionInfo: {
      ...component.versionInfo,
      status: 'approved',
      approvedBy,
      approvedAt: now,
      versionHistory: component.versionInfo.versionHistory.map((entry) =>
        entry.versionId === component.versionInfo.versionId
          ? { ...entry, status: 'approved'          }
          : entry
      ),
    },
    metadata: {
      ...component.metadata,
      updatedAt: now,
      updatedBy: approvedBy,
    },
  };
}

// ============================================================================
// Usage Tracking
// ============================================================================

export function addUsageReference(
  component                  ,
  measureId        ,
)                   {
  if (component.usage.measureIds.includes(measureId)) return component;
  return {
    ...component,
    usage: {
      ...component.usage,
      measureIds: [...component.usage.measureIds, measureId],
      usageCount: component.usage.usageCount + 1,
      lastUsedAt: new Date().toISOString(),
    },
  };
}

export function removeUsageReference(
  component                  ,
  measureId        ,
)                   {
  return {
    ...component,
    usage: {
      ...component.usage,
      measureIds: component.usage.measureIds.filter((id) => id !== measureId),
      usageCount: Math.max(0, component.usage.usageCount - 1),
    },
  };
}

// ============================================================================
// Queries
// ============================================================================

export function searchComponents(
  components                    ,
  filters                       ,
  measureLookup                                                          ,
)                     {
  let result = [...components];

  // Category filter
  if (filters.category) {
    result = result.filter((c) => c.metadata.category === filters.category);
  }

  // Status filter (multiselect)
  if (filters.statuses && filters.statuses.length > 0) {
    result = result.filter((c) => filters.statuses .includes(c.versionInfo.status));
  } else if (filters.status) {
    // Legacy single-select fallback
    result = result.filter((c) => c.versionInfo.status === filters.status);
  }

  // Complexity filter (multiselect)
  if (filters.complexities && filters.complexities.length > 0) {
    result = result.filter((c) => filters.complexities .includes(c.complexity.level));
  } else if (filters.complexity) {
    // Legacy single-select fallback
    result = result.filter((c) => c.complexity.level === filters.complexity);
  }

  // Archived filter
  if (!filters.showArchived) {
    result = result.filter((c) => c.versionInfo.status !== 'archived');
  }

  // Program filter (filter by measures' programs)
  if (filters.programs && filters.programs.length > 0 && measureLookup) {
    result = result.filter((c) => {
      const componentPrograms = c.usage.measureIds
        .map(id => measureLookup(id)?.program)
        .filter(Boolean);
      return componentPrograms.some(prog => filters.programs .includes(prog       ));
    });
  }

  // Search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description?.toLowerCase().includes(query) ?? false) ||
        c.metadata.tags.some((t) => t.toLowerCase().includes(query)) ||
        (c.type === 'atomic' && c.valueSet.oid.includes(query)) ||
        (c.type === 'atomic' && c.valueSet.name.toLowerCase().includes(query))
    );
  }

  // Sort: archived always at bottom, then by the selected sort criteria
  const sortBy = filters.sortBy ?? 'name';
  const sortDir = filters.sortDirection ?? 'asc';
  const dirMultiplier = sortDir === 'desc' ? -1 : 1;

  result.sort((a, b) => {
    const aArchived = a.versionInfo.status === 'archived' ? 1 : 0;
    const bArchived = b.versionInfo.status === 'archived' ? 1 : 0;
    if (aArchived !== bArchived) return aArchived - bArchived;

    // Legacy usageSort takes precedence if set (for backwards compatibility)
    if (filters.usageSort) {
      const diff = a.usage.usageCount - b.usage.usageCount;
      return filters.usageSort === 'desc' ? -diff : diff;
    }

    // New sortBy field
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'complexity':
        comparison = a.complexity.score - b.complexity.score;
        break;
      case 'usage':
        comparison = a.usage.usageCount - b.usage.usageCount;
        break;
      case 'status':
        comparison = a.versionInfo.status.localeCompare(b.versionInfo.status);
        break;
      case 'date':
        comparison = new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
        break;
    }
    return comparison * dirMultiplier;
  });

  return result;
}

export function getComponentsByCategory(
  components                    ,
  category                   ,
)                     {
  return components.filter((c) => c.metadata.category === category);
}

export function getApprovedComponents(components                    )                     {
  return components.filter((c) => c.versionInfo.status === 'approved');
}

export function getAffectedMeasures(component                  )                     {
  return component.usage.measureIds.map((measureId) => ({
    measureId,
    measureName: measureId, // In a real app, would look up the measure name
    populationType: 'unknown',
  }));
}

// ============================================================================
// Helpers
// ============================================================================

function createInitialVersionInfo(createdBy        , createdAt        )                       {
  return {
    versionId: '1.0',
    versionHistory: [
      {
        versionId: '1.0',
        status: 'draft',
        createdAt,
        createdBy,
        changeDescription: 'Initial version',
      },
    ],
    status: 'draft',
  };
}

function createInitialUsage()                 {
  return {
    measureIds: [],
    usageCount: 0,
  };
}

function createInitialMetadata(
  category                   ,
  tags          ,
  createdBy        ,
  createdAt        ,
)                    {
  return {
    createdAt,
    createdBy,
    updatedAt: createdAt,
    updatedBy: createdBy,
    category,
    tags,
    source: { origin: 'custom' },
  };
}
