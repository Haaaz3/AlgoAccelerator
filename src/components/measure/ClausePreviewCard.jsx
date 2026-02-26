/**
 * Clause Preview Card Component (P2 3.B)
 *
 * Visual preview of logic clause structure for measure populations.
 * Displays:
 *   1. Nested boolean logic as an expandable tree
 *   2. Value set details for each criterion
 *   3. Timing and negation indicators
 *   4. Code counts and OID validation status
 *   5. Natural language summary
 *
 * Used in:
 *   - Measure editor population review
 *   - Component library detail view
 *   - Import preview/comparison
 */

import React, { useState, useMemo } from 'react';
// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isLogicalClause(node                             )                        {
  return 'operator' in node && ('children' in node || 'elements' in node);
}

function _isDataElement(node                             )                      {
  return 'type' in node && !('operator' in node);
}

function getNodeType(node                             )           {
  return isLogicalClause(node) ? 'operator' : 'element';
}

function getNodeChildren(node               )                                  {
  // LogicalClause may have 'children' array containing mixed types
  if ('children' in node && Array.isArray(node.children)) {
    return node.children;
  }
  return [];
}

/**
 * Generate a natural language summary of a clause.
 */
function generateNaturalLanguage(clause               , depth         = 0)         {
  const children = getNodeChildren(clause);
  if (children.length === 0) return '';

  const connector = clause.operator === 'AND' ? ' AND ' : ' OR ';
  const childDescriptions = children.map(child => {
    if (isLogicalClause(child)) {
      const nested = generateNaturalLanguage(child, depth + 1);
      return depth > 0 ? `(${nested})` : nested;
    } else {
      return describeElement(child               );
    }
  });

  return childDescriptions.filter(Boolean).join(connector);
}

/**
 * Describe a data element in natural language.
 */
function describeElement(element             )         {
  const negation = element.negation ? 'NOT ' : '';
  const name = element.valueSet?.name || element.description || 'Unknown';
  const timing = element.timingRequirements?.[0]?.description || '';

  if (timing) {
    return `${negation}${name} (${timing})`;
  }
  return `${negation}${name}`;
}

/**
 * Count total elements in a clause tree.
 */
function countElements(clause               )         {
  const children = getNodeChildren(clause);
  let count = 0;

  for (const child of children) {
    if (isLogicalClause(child)) {
      count += countElements(child);
    } else {
      count += 1;
    }
  }

  return count;
}

/**
 * Count total codes across all elements.
 */
function countTotalCodes(clause               )         {
  const children = getNodeChildren(clause);
  let count = 0;

  for (const child of children) {
    if (isLogicalClause(child)) {
      count += countTotalCodes(child);
    } else {
      const element = child               ;
      count += element.valueSet?.totalCodeCount || element.valueSet?.codes?.length || 0;
    }
  }

  return count;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Operator badge (AND/OR)
 */
const OperatorBadge                                                     = ({ operator, className = '' }) => {
  const bgColor = operator === 'AND'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${className}`}>
      {operator}
    </span>
  );
};

/**
 * Value set info badge
 */
const ValueSetBadge            
               
               
                     
                    
   = ({ name, oid, codeCount, isValid = true }) => {
  const borderColor = isValid
    ? 'border-gray-200 dark:border-gray-700'
    : 'border-amber-300 dark:border-amber-600';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 border rounded-md text-xs ${borderColor}`}>
      <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
      {oid && (
        <span className="text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={oid}>
          ({oid.split('.').slice(-2).join('.')})
        </span>
      )}
      {codeCount !== undefined && (
        <span className="text-gray-400 dark:text-gray-500">
          [{codeCount} codes]
        </span>
      )}
      {!isValid && (
        <span className="text-amber-600 dark:text-amber-400" title="OID needs verification">
          !
        </span>
      )}
    </div>
  );
};

/**
 * Timing indicator
 */
const TimingIndicator                               = ({ timing }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
    {timing}
  </span>
);

/**
 * Negation indicator
 */
const NegationIndicator           = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">
    NOT
  </span>
);

// ============================================================================
// CLAUSE NODE COMPONENT
// ============================================================================

const ClauseNode                            = ({
  node,
  depth,
  library,
  isLast: _isLast,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const nodeType = getNodeType(node);

  // Connector line styles
  const connectorStyles = {
    borderLeft: depth > 0 ? '1px dashed #94a3b8' : 'none',
    marginLeft: depth > 0 ? '8px' : '0',
    paddingLeft: depth > 0 ? '12px' : '0',
  };

  if (nodeType === 'element') {
    const element = node               ;
    const linkedComponent = library && element.libraryComponentId
      ? library[element.libraryComponentId]
      : undefined;

    const hasNegation = element.negation ||
      element.description?.toLowerCase().includes('absence of') ||
      element.description?.toLowerCase().includes('without');

    const timing = element.timingRequirements?.[0]?.description;
    const codeCount = element.valueSet?.totalCodeCount || element.valueSet?.codes?.length;

    return (
      <div style={connectorStyles} className="py-1">
        <div
          className={`flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors ${
            onClick ? 'hover:shadow-sm' : ''
          }`}
          onClick={() => onClick?.(element)}
        >
          {hasNegation && <NegationIndicator />}

          <ValueSetBadge
            name={element.valueSet?.name || element.description || 'Unknown'}
            oid={element.valueSet?.oid}
            codeCount={codeCount}
            isValid={element.valueSet?.oid !== 'N/A'}
          />

          {timing && <TimingIndicator timing={timing} />}

          {linkedComponent && (
            <span className="text-xs text-green-600 dark:text-green-400" title="Linked to library component">
              [Library]
            </span>
          )}
        </div>
      </div>
    );
  }

  // Operator node
  const clause = node                 ;
  const children = getNodeChildren(clause);
  const childCount = children.length;

  return (
    <div style={connectorStyles} className="py-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
          <OperatorBadge operator={clause.operator} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({childCount} {childCount === 1 ? 'item' : 'items'})
          </span>
        </button>

        {clause.description && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {clause.description}
          </span>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div className="ml-2 mt-1">
          {children.map((child, index) => (
            <ClauseNode
              key={`${depth}-${index}`}
              node={child}
              depth={depth + 1}
              library={library}
              isLast={index === children.length - 1}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ClausePreviewCard                                   = ({
  clause,
  library,
  defaultExpanded = true,
  showSummary = true,
  showCodeCounts = true,
  onCriterionClick,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compute statistics
  const stats = useMemo(() => ({
    elementCount: countElements(clause),
    codeCount: countTotalCodes(clause),
    naturalLanguage: generateNaturalLanguage(clause),
  }), [clause]);

  const children = getNodeChildren(clause);

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
          <OperatorBadge operator={clause.operator} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {clause.description || 'Logic Tree'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{stats.elementCount} criteria</span>
          {showCodeCounts && <span>{stats.codeCount} codes</span>}
        </div>
      </div>

      {/* Natural language summary */}
      {showSummary && isExpanded && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            <span className="font-medium text-gray-700 dark:text-gray-300">Summary: </span>
            {stats.naturalLanguage || 'No criteria defined'}
          </p>
        </div>
      )}

      {/* Tree view */}
      {isExpanded && (
        <div className="p-3">
          {children.length > 0 ? (
            children.map((child, index) => (
              <ClauseNode
                key={`root-${index}`}
                node={child}
                depth={0}
                library={library}
                isLast={index === children.length - 1}
                onClick={onCriterionClick}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No criteria defined
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPACT PREVIEW (for lists/grids)
// ============================================================================

export const CompactClausePreview                                      = ({
  clause,
  maxItems = 3,
  className = '',
}) => {
  const children = getNodeChildren(clause);
  const displayChildren = children.slice(0, maxItems);
  const remaining = children.length - maxItems;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      <OperatorBadge operator={clause.operator} className="mr-1" />

      {displayChildren.map((child, index) => {
        if (isLogicalClause(child)) {
          return (
            <span
              key={index}
              className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400"
            >
              {child.operator}(...)
            </span>
          );
        }

        const element = child               ;
        const name = element.valueSet?.name || element.description || 'Unknown';
        const truncatedName = name.length > 20 ? name.substring(0, 20) + '...' : name;

        return (
          <span
            key={index}
            className="text-xs px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded truncate max-w-[120px]"
            title={name}
          >
            {element.negation && <span className="text-red-600 dark:text-red-400 mr-0.5">!</span>}
            {truncatedName}
          </span>
        );
      })}

      {remaining > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          +{remaining} more
        </span>
      )}
    </div>
  );
};

// ============================================================================
// DIFF VIEW (for comparing clauses)
// ============================================================================

export const ClauseDiffView                                = ({
  original,
  updated,
  className = '',
}) => {
  const _originalSummary = generateNaturalLanguage(original);
  const _updatedSummary = generateNaturalLanguage(updated);

  const originalCount = countElements(original);
  const updatedCount = countElements(updated);
  const countDiff = updatedCount - originalCount;

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Original ({originalCount} criteria)
        </h4>
        <ClausePreviewCard
          clause={original}
          showSummary={false}
          showCodeCounts={false}
          defaultExpanded={false}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Updated ({updatedCount} criteria)
          {countDiff !== 0 && (
            <span className={countDiff > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
              {countDiff > 0 ? `+${countDiff}` : countDiff}
            </span>
          )}
        </h4>
        <ClausePreviewCard
          clause={updated}
          showSummary={false}
          showCodeCounts={false}
          defaultExpanded={false}
        />
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ClausePreviewCard;
