/**
 * Component Composer Service (P2 2.B)
 *
 * Tools for composing library components into new composite components.
 * Provides:
 *   1. Composite creation from atomic components
 *   2. Nested composite support
 *   3. Automatic complexity calculation
 *   4. Validation rules
 *   5. Preview and diff utilities
 *
 * Key design: Composites reference specific versions of children,
 * ensuring stability even when child components are updated.
 */

             
                   
                  
                     
                     
                  
                      
                  
                       
                 
                    
                    
                 
                                   

// ============================================================================
// TYPES
// ============================================================================

                                  
                                              
               
                             
                       
                                  
                            
                                    
                               
                                       
                              
                                  
                  
                           
                    
 

                                   
                     
                      
                                                   
                     
 

                                    
                                           
                   
                                                        
                                 
                                   
                             
                            
                                 
                                                   
                               
 

                                   
                                                                                              
                  
                       
 

                                     
                                                                           
                  
                       
 

                                     
                                                            
                          
                                                    
                             
                              
                        
                         
                     
                             
                                  
 

                               
                  
                                            
                              
                             
                                      
                               
                                                   
                            
                                    
                
                                       
                      
 

                                        
                                  
                   
                   
                             
                     
                                 
                                              
                                    
 

                                
                            
                                
                               
                              
                       
                         
 

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a composition specification.
 * Checks for missing children, circular references, and compatibility.
 */
export function validateComposition(
  spec                 ,
  library                                  ,
  existingCompositeId         
)                        {
  const errors                     = [];
  const warnings                       = [];
  const resolvedChildren                  = [];

  // Check for empty composition
  if (!spec.children || spec.children.length === 0) {
    errors.push({
      type: 'empty',
      message: 'Composite must have at least one child component',
    });
    return { isValid: false, errors, warnings, resolvedChildren };
  }

  // Resolve and validate each child
  const childIds = new Set        ();

  for (const child of spec.children) {
    const component = library[child.componentId];

    if (!component) {
      errors.push({
        type: 'missing_child',
        message: `Component not found: ${child.componentId}`,
        componentId: child.componentId,
      });
      continue;
    }

    // Check for duplicate children
    if (childIds.has(child.componentId)) {
      warnings.push({
        type: 'redundant',
        message: `Component "${component.name}" is included multiple times`,
        componentId: child.componentId,
      });
    }
    childIds.add(child.componentId);

    // Validate version if specified
    const versionId = child.versionId || component.versionInfo.versionId;
    const versionExists = component.versionInfo.versionHistory.some(v => v.versionId === versionId);

    if (!versionExists) {
      errors.push({
        type: 'invalid_version',
        message: `Version ${versionId} not found for component "${component.name}"`,
        componentId: child.componentId,
      });
      continue;
    }

    // Check for circular references (if this is an update to existing composite)
    if (existingCompositeId && hasCircularReference(child.componentId, existingCompositeId, library)) {
      errors.push({
        type: 'circular_reference',
        message: `Including "${component.name}" would create a circular reference`,
        componentId: child.componentId,
      });
      continue;
    }

    // Warn about draft/archived children
    if (component.versionInfo.status === 'draft' || component.versionInfo.status === 'pending_review') {
      warnings.push({
        type: 'draft_child',
        message: `Component "${component.name}" is not approved (status: ${component.versionInfo.status})`,
        componentId: child.componentId,
      });
    }

    if (component.versionInfo.status === 'archived') {
      warnings.push({
        type: 'archived_child',
        message: `Component "${component.name}" is archived`,
        componentId: child.componentId,
      });
    }

    resolvedChildren.push({
      reference: {
        componentId: child.componentId,
        versionId,
        displayName: component.name,
      },
      component,
      status: component.versionInfo.status,
    });
  }

  // Calculate complexity and warn if too high
  if (errors.length === 0) {
    const complexity = calculateCompositeComplexity(spec, resolvedChildren.map(rc => rc.component));
    if (complexity.level === 'high') {
      warnings.push({
        type: 'high_complexity',
        message: `High complexity score (${complexity.score}). Consider simplifying.`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    resolvedChildren,
  };
}

/**
 * Check if including a component would create a circular reference.
 */
function hasCircularReference(
  childId        ,
  compositeId        ,
  library                                  ,
  visited              = new Set()
)          {
  if (childId === compositeId) return true;
  if (visited.has(childId)) return false;
  visited.add(childId);

  const child = library[childId];
  if (!child || child.type !== 'composite') return false;

  for (const grandchild of (child                      ).children) {
    if (hasCircularReference(grandchild.componentId, compositeId, library, visited)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// COMPLEXITY CALCULATION
// ============================================================================

/**
 * Calculate complexity for a composite component.
 */
export function calculateCompositeComplexity(
  spec                 ,
  children                    
)                      {
  let baseScore = 1;
  let childrenSum = 0;
  let andOperators = 0;
  let maxNestingDepth = 0;

  for (const child of children) {
    childrenSum += child.complexity.score;

    if (child.type === 'composite') {
      // Track nesting depth
      const childDepth = (child.complexity.factors.nestingDepth || 0) + 1;
      maxNestingDepth = Math.max(maxNestingDepth, childDepth);
    }
  }

  // AND operators add complexity (more restrictive)
  if (spec.operator === 'AND') {
    andOperators = children.length - 1;
  }

  const totalScore = baseScore + childrenSum + andOperators + (maxNestingDepth * 0.5);

  let level                 ;
  if (totalScore <= 3) {
    level = 'low';
  } else if (totalScore <= 7) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return {
    level,
    score: totalScore,
    factors: {
      base: baseScore,
      timingClauses: 0,
      negations: 0,
      childrenSum,
      andOperators,
      nestingDepth: maxNestingDepth,
    },
  };
}

// ============================================================================
// COMPOSITION
// ============================================================================

/**
 * Create a composite component from a specification.
 */
export function createComposite(
  spec                 ,
  library                                  
)                    {
  // Validate first
  const validation = validateComposition(spec, library);

  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const now = new Date().toISOString();
  const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Build child references
  const children                       = validation.resolvedChildren.map(rc => rc.reference);

  // Calculate complexity
  const complexity = calculateCompositeComplexity(
    spec,
    validation.resolvedChildren.map(rc => rc.component)
  );

  // Create version info
  const versionInfo                       = {
    versionId: '1.0',
    status: 'draft',
    versionHistory: [{
      versionId: '1.0',
      status: 'draft',
      createdAt: now,
      createdBy: spec.createdBy,
      changeDescription: 'Initial composition',
    }],
  };

  // Create usage info
  const usage                 = {
    measureIds: [],
    usageCount: 0,
  };

  // Create metadata
  const metadata                    = {
    createdAt: now,
    createdBy: spec.createdBy,
    updatedAt: now,
    updatedBy: spec.createdBy,
    category: spec.category,
    tags: spec.tags || [],
    source: { origin: 'custom' },
  };

  // Create the composite
  const composite                     = {
    type: 'composite',
    id,
    name: spec.name,
    description: spec.description,
    operator: spec.operator,
    children,
    complexity,
    versionInfo,
    usage,
    metadata,
  };

  // Generate preview
  const preview = generateCompositionPreview(composite, library);

  return {
    success: true,
    composite,
    errors: [],
    warnings: validation.warnings,
    preview,
  };
}

/**
 * Update an existing composite component.
 */
export function updateComposite(
  compositeId        ,
  spec                          ,
  library                                  ,
  updatedBy        
)                    {
  const existing = library[compositeId];

  if (!existing || existing.type !== 'composite') {
    return {
      success: false,
      errors: [{
        type: 'missing_child',
        message: `Composite not found: ${compositeId}`,
        componentId: compositeId,
      }],
      warnings: [],
    };
  }

  const existingComposite = existing                      ;

  // Merge spec with existing
  const mergedSpec                  = {
    name: spec.name ?? existingComposite.name,
    description: spec.description ?? existingComposite.description,
    operator: spec.operator ?? existingComposite.operator,
    children: spec.children ?? existingComposite.children.map(c => ({
      componentId: c.componentId,
      versionId: c.versionId,
    })),
    category: spec.category ?? existingComposite.metadata.category,
    tags: spec.tags ?? existingComposite.metadata.tags,
    createdBy: updatedBy,
  };

  // Validate
  const validation = validateComposition(mergedSpec, library, compositeId);

  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const now = new Date().toISOString();

  // Build updated child references
  const children                       = validation.resolvedChildren.map(rc => rc.reference);

  // Recalculate complexity
  const complexity = calculateCompositeComplexity(
    mergedSpec,
    validation.resolvedChildren.map(rc => rc.component)
  );

  // Update version info
  const newVersion = incrementVersion(existingComposite.versionInfo.versionId);
  const versionInfo                       = {
    ...existingComposite.versionInfo,
    versionId: newVersion,
    status: 'draft', // Reset to draft on edit
    versionHistory: [
      ...existingComposite.versionInfo.versionHistory,
      {
        versionId: newVersion,
        status: 'draft',
        createdAt: now,
        createdBy: updatedBy,
        changeDescription: 'Updated composition',
      },
    ],
  };

  // Create updated composite
  const updated                     = {
    type: 'composite',
    id: compositeId,
    name: mergedSpec.name,
    description: mergedSpec.description,
    operator: mergedSpec.operator,
    children,
    complexity,
    versionInfo,
    usage: existingComposite.usage,
    metadata: {
      ...existingComposite.metadata,
      updatedAt: now,
      updatedBy,
      tags: mergedSpec.tags || [],
    },
  };

  // Generate preview
  const preview = generateCompositionPreview(updated, library);

  return {
    success: true,
    composite: updated,
    errors: [],
    warnings: validation.warnings,
    preview,
  };
}

/**
 * Increment a version string (e.g., "1.0" -> "1.1", "1.9" -> "2.0")
 */
function incrementVersion(version        )         {
  const [major, minor] = version.split('.').map(Number);
  if (minor >= 9) {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

// ============================================================================
// PREVIEW & EXPANSION
// ============================================================================

/**
 * Generate a preview of a composite's effective logic.
 */
export function generateCompositionPreview(
  composite                    ,
  library                                  
)                     {
  // Expand the tree
  const expandedTree = expandComposite(composite, library, 0);

  // Count value sets and codes
  let valueSetCount = 0;
  let totalCodes = 0;
  const countedOids = new Set        ();

  function countValueSets(node              )       {
    if (node.component?.type === 'atomic') {
      const atomic = node.component                   ;
      if (!countedOids.has(atomic.valueSet.oid)) {
        countedOids.add(atomic.valueSet.oid);
        valueSetCount++;
        totalCodes += atomic.valueSet.codes?.length || 0;
      }
    }
    if (node.children) {
      node.children.forEach(countValueSets);
    }
  }
  countValueSets(expandedTree);

  // Generate natural language
  const naturalLanguage = generateNaturalLanguage(expandedTree);

  return {
    naturalLanguage,
    expandedTree,
    valueSetCount,
    totalCodes,
    complexity: composite.complexity,
  };
}

/**
 * Expand a composite into a tree of atomic components.
 */
export function expandComposite(
  composite                    ,
  library                                  ,
  depth        
)               {
  const children                 = [];

  for (const childRef of composite.children) {
    const child = library[childRef.componentId];
    if (!child) continue;

    if (child.type === 'atomic') {
      children.push({
        type: 'atomic',
        component: child,
        depth: depth + 1,
        description: formatAtomicDescription(child                   ),
      });
    } else {
      children.push(expandComposite(child                      , library, depth + 1));
    }
  }

  return {
    type: 'composite',
    operator: composite.operator,
    component: composite,
    children,
    depth,
    description: composite.name,
  };
}

/**
 * Format an atomic component's description.
 */
function formatAtomicDescription(atomic                 )         {
  const negation = atomic.negation ? 'NOT ' : '';
  const timing = atomic.timing.displayExpression || `${atomic.timing.operator} ${atomic.timing.reference}`;
  return `${negation}${atomic.valueSet.name} (${timing})`;
}

/**
 * Generate natural language description of an expanded tree.
 */
function generateNaturalLanguage(node              )         {
  if (node.type === 'atomic') {
    return node.description;
  }

  if (!node.children || node.children.length === 0) {
    return node.description;
  }

  const connector = node.operator === 'AND' ? ' AND ' : ' OR ';
  const childDescriptions = node.children.map(c => {
    if (c.type === 'atomic') {
      return c.description;
    }
    // Wrap nested logic in parentheses
    return `(${generateNaturalLanguage(c)})`;
  });

  return childDescriptions.join(connector);
}

// ============================================================================
// DECOMPOSITION
// ============================================================================

/**
 * Get all atomic components used by a composite (flattened).
 */
export function getAtomicComponents(
  composite                    ,
  library                                  
)                    {
  const atomics                    = [];
  const visited = new Set        ();

  function collect(comp                  )       {
    if (visited.has(comp.id)) return;
    visited.add(comp.id);

    if (comp.type === 'atomic') {
      atomics.push(comp                   );
    } else {
      const composite = comp                      ;
      for (const childRef of composite.children) {
        const child = library[childRef.componentId];
        if (child) collect(child);
      }
    }
  }

  collect(composite);
  return atomics;
}

/**
 * Check if a composite contains a specific component (directly or nested).
 */
export function containsComponent(
  composite                    ,
  componentId        ,
  library                                  
)          {
  for (const childRef of composite.children) {
    if (childRef.componentId === componentId) return true;

    const child = library[childRef.componentId];
    if (child?.type === 'composite') {
      if (containsComponent(child                      , componentId, library)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the depth of nesting for a composite.
 */
export function getCompositeDepth(
  composite                    ,
  library                                  
)         {
  let maxChildDepth = 0;

  for (const childRef of composite.children) {
    const child = library[childRef.componentId];
    if (child?.type === 'composite') {
      const childDepth = getCompositeDepth(child                      , library);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
  }

  return maxChildDepth + 1;
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

/**
 * Suggest components that could be added to a composite.
 */
export function suggestComponents(
  currentChildren          ,
  library                                  ,
  limit         = 10
)                                                                        {
  const suggestions                                                                        = [];
  const currentSet = new Set(currentChildren);

  // Get current child components
  const currentComponents = currentChildren
    .map(id => library[id])
    .filter((c)                        => c !== undefined);

  // Find commonly co-occurring components
  const coOccurrenceScores = new Map                ();

  for (const current of currentComponents) {
    for (const measureId of current.usage.measureIds) {
      // Find other components used in the same measure
      for (const other of Object.values(library)) {
        if (currentSet.has(other.id)) continue;
        if (other.usage.measureIds.includes(measureId)) {
          coOccurrenceScores.set(other.id, (coOccurrenceScores.get(other.id) || 0) + 1);
        }
      }
    }
  }

  // Score and rank suggestions
  for (const [id, coOccurrence] of coOccurrenceScores) {
    const component = library[id];
    if (!component) continue;

    const score = coOccurrence / currentChildren.length;
    suggestions.push({
      component,
      reason: `Used together in ${coOccurrence} measure(s)`,
      score,
    });
  }

  // Add same-category suggestions if we have few co-occurrence suggestions
  if (suggestions.length < limit && currentComponents.length > 0) {
    const categories = new Set(currentComponents.map(c => c.metadata.category));

    for (const other of Object.values(library)) {
      if (currentSet.has(other.id)) continue;
      if (suggestions.find(s => s.component.id === other.id)) continue;

      if (categories.has(other.metadata.category)) {
        suggestions.push({
          component: other,
          reason: `Same category: ${other.metadata.category}`,
          score: 0.3,
        });
      }
    }
  }

  // Sort by score and limit
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createComposite,
  updateComposite,
  validateComposition,
  calculateCompositeComplexity,
  generateCompositionPreview,
  expandComposite,
  getAtomicComponents,
  containsComponent,
  getCompositeDepth,
  suggestComponents,
};
