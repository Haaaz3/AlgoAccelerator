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

import type {
  LibraryComponent,
  AtomicComponent,
  CompositeComponent,
  ComponentReference,
  LogicalOperator,
  ComponentComplexity,
  ComplexityLevel,
  ComponentVersionInfo,
  ComponentUsage,
  ComponentMetadata,
  ComponentCategory,
  ApprovalStatus,
} from '../types/componentLibrary';

// ============================================================================
// TYPES
// ============================================================================

export interface CompositionSpec {
  /** Human-readable name for the composite */
  name: string;
  /** Optional description */
  description?: string;
  /** Logical operator (AND/OR) */
  operator: LogicalOperator;
  /** Child components to include */
  children: CompositionChild[];
  /** Category for the new composite */
  category: ComponentCategory;
  /** Tags for search/filtering */
  tags?: string[];
  /** Creator identifier */
  createdBy: string;
}

export interface CompositionChild {
  /** Component ID */
  componentId: string;
  /** Version ID (optional, defaults to current) */
  versionId?: string;
}

export interface CompositionResult {
  /** Whether composition was successful */
  success: boolean;
  /** The created composite component (if successful) */
  composite?: CompositeComponent;
  /** Validation errors (if any) */
  errors: CompositionError[];
  /** Validation warnings */
  warnings: CompositionWarning[];
  /** Preview of the composite's effective logic */
  preview?: CompositionPreview;
}

export interface CompositionError {
  type: 'missing_child' | 'circular_reference' | 'incompatible' | 'invalid_version' | 'empty';
  message: string;
  componentId?: string;
}

export interface CompositionWarning {
  type: 'draft_child' | 'archived_child' | 'high_complexity' | 'redundant';
  message: string;
  componentId?: string;
}

export interface CompositionPreview {
  /** Natural language description of the composite logic */
  naturalLanguage: string;
  /** Expanded tree showing all atomic components */
  expandedTree: ExpandedNode;
  /** Total value set count */
  valueSetCount: number;
  /** Total code count */
  totalCodes: number;
  /** Complexity breakdown */
  complexity: ComponentComplexity;
}

export interface ExpandedNode {
  /** Node type */
  type: 'operator' | 'atomic' | 'composite';
  /** For operators: AND/OR */
  operator?: LogicalOperator;
  /** For components: the component */
  component?: LibraryComponent;
  /** Child nodes (for operators and composites) */
  children?: ExpandedNode[];
  /** Depth in tree (for display) */
  depth: number;
  /** Natural language for this node */
  description: string;
}

export interface CompositionValidation {
  /** Is the composition valid? */
  isValid: boolean;
  /** All errors */
  errors: CompositionError[];
  /** All warnings */
  warnings: CompositionWarning[];
  /** Resolved children with their versions */
  resolvedChildren: ResolvedChild[];
}

export interface ResolvedChild {
  /** The child reference */
  reference: ComponentReference;
  /** The resolved component */
  component: LibraryComponent;
  /** Child's status */
  status: ApprovalStatus;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a composition specification.
 * Checks for missing children, circular references, and compatibility.
 */
export function validateComposition(
  spec: CompositionSpec,
  library: Record<string, LibraryComponent>,
  existingCompositeId?: string
): CompositionValidation {
  const errors: CompositionError[] = [];
  const warnings: CompositionWarning[] = [];
  const resolvedChildren: ResolvedChild[] = [];

  // Check for empty composition
  if (!spec.children || spec.children.length === 0) {
    errors.push({
      type: 'empty',
      message: 'Composite must have at least one child component',
    });
    return { isValid: false, errors, warnings, resolvedChildren };
  }

  // Resolve and validate each child
  const childIds = new Set<string>();

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
  childId: string,
  compositeId: string,
  library: Record<string, LibraryComponent>,
  visited: Set<string> = new Set()
): boolean {
  if (childId === compositeId) return true;
  if (visited.has(childId)) return false;
  visited.add(childId);

  const child = library[childId];
  if (!child || child.type !== 'composite') return false;

  for (const grandchild of (child as CompositeComponent).children) {
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
  spec: CompositionSpec,
  children: LibraryComponent[]
): ComponentComplexity {
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

  let level: ComplexityLevel;
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
  spec: CompositionSpec,
  library: Record<string, LibraryComponent>
): CompositionResult {
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
  const children: ComponentReference[] = validation.resolvedChildren.map(rc => rc.reference);

  // Calculate complexity
  const complexity = calculateCompositeComplexity(
    spec,
    validation.resolvedChildren.map(rc => rc.component)
  );

  // Create version info
  const versionInfo: ComponentVersionInfo = {
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
  const usage: ComponentUsage = {
    measureIds: [],
    usageCount: 0,
  };

  // Create metadata
  const metadata: ComponentMetadata = {
    createdAt: now,
    createdBy: spec.createdBy,
    updatedAt: now,
    updatedBy: spec.createdBy,
    category: spec.category,
    tags: spec.tags || [],
    source: { origin: 'custom' },
  };

  // Create the composite
  const composite: CompositeComponent = {
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
  compositeId: string,
  spec: Partial<CompositionSpec>,
  library: Record<string, LibraryComponent>,
  updatedBy: string
): CompositionResult {
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

  const existingComposite = existing as CompositeComponent;

  // Merge spec with existing
  const mergedSpec: CompositionSpec = {
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
  const children: ComponentReference[] = validation.resolvedChildren.map(rc => rc.reference);

  // Recalculate complexity
  const complexity = calculateCompositeComplexity(
    mergedSpec,
    validation.resolvedChildren.map(rc => rc.component)
  );

  // Update version info
  const newVersion = incrementVersion(existingComposite.versionInfo.versionId);
  const versionInfo: ComponentVersionInfo = {
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
  const updated: CompositeComponent = {
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
function incrementVersion(version: string): string {
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
  composite: CompositeComponent,
  library: Record<string, LibraryComponent>
): CompositionPreview {
  // Expand the tree
  const expandedTree = expandComposite(composite, library, 0);

  // Count value sets and codes
  let valueSetCount = 0;
  let totalCodes = 0;
  const countedOids = new Set<string>();

  function countValueSets(node: ExpandedNode): void {
    if (node.component?.type === 'atomic') {
      const atomic = node.component as AtomicComponent;
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
  composite: CompositeComponent,
  library: Record<string, LibraryComponent>,
  depth: number
): ExpandedNode {
  const children: ExpandedNode[] = [];

  for (const childRef of composite.children) {
    const child = library[childRef.componentId];
    if (!child) continue;

    if (child.type === 'atomic') {
      children.push({
        type: 'atomic',
        component: child,
        depth: depth + 1,
        description: formatAtomicDescription(child as AtomicComponent),
      });
    } else {
      children.push(expandComposite(child as CompositeComponent, library, depth + 1));
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
function formatAtomicDescription(atomic: AtomicComponent): string {
  const negation = atomic.negation ? 'NOT ' : '';
  const timing = atomic.timing.displayExpression || `${atomic.timing.operator} ${atomic.timing.reference}`;
  return `${negation}${atomic.valueSet.name} (${timing})`;
}

/**
 * Generate natural language description of an expanded tree.
 */
function generateNaturalLanguage(node: ExpandedNode): string {
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
  composite: CompositeComponent,
  library: Record<string, LibraryComponent>
): AtomicComponent[] {
  const atomics: AtomicComponent[] = [];
  const visited = new Set<string>();

  function collect(comp: LibraryComponent): void {
    if (visited.has(comp.id)) return;
    visited.add(comp.id);

    if (comp.type === 'atomic') {
      atomics.push(comp as AtomicComponent);
    } else {
      const composite = comp as CompositeComponent;
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
  composite: CompositeComponent,
  componentId: string,
  library: Record<string, LibraryComponent>
): boolean {
  for (const childRef of composite.children) {
    if (childRef.componentId === componentId) return true;

    const child = library[childRef.componentId];
    if (child?.type === 'composite') {
      if (containsComponent(child as CompositeComponent, componentId, library)) {
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
  composite: CompositeComponent,
  library: Record<string, LibraryComponent>
): number {
  let maxChildDepth = 0;

  for (const childRef of composite.children) {
    const child = library[childRef.componentId];
    if (child?.type === 'composite') {
      const childDepth = getCompositeDepth(child as CompositeComponent, library);
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
  currentChildren: string[],
  library: Record<string, LibraryComponent>,
  limit: number = 10
): Array<{ component: LibraryComponent; reason: string; score: number }> {
  const suggestions: Array<{ component: LibraryComponent; reason: string; score: number }> = [];
  const currentSet = new Set(currentChildren);

  // Get current child components
  const currentComponents = currentChildren
    .map(id => library[id])
    .filter((c): c is LibraryComponent => c !== undefined);

  // Find commonly co-occurring components
  const coOccurrenceScores = new Map<string, number>();

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
