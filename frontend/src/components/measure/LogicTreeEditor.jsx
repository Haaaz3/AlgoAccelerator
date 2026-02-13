/**
 * LogicTreeEditor
 *
 * A visual logic tree editor that:
 * - Displays criteria with clear indentation showing nested logic
 * - Allows individual AND/OR operators between each pair of siblings
 * - Auto-nests when operators differ (creates sub-clauses)
 * - Supports drag-and-drop reordering within sections
 * - Shows component code and edit notes inline
 */

import { useState, useCallback, Fragment } from 'react';
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Code2,
  MessageSquare,
  AlertTriangle,
  Link2,
  Unlink,
} from 'lucide-react';

// ============================================================================
// Helper Functions
// ============================================================================

function getAllNotesForComponent(overrides) {
  if (!overrides) return [];
  const notes = [];
  for (const key of Object.keys(overrides)) {
    const override = overrides[key];
    if (override?.note) {
      notes.push({ section: key, note: override.note });
    }
  }
  return notes;
}

/** Strip standalone AND/OR/NOT operators from descriptions */
function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/\n\s*(AND|OR|NOT)\s*\n/gi, ' ')
    .replace(/\n\s*(AND|OR|NOT)\s*$/gi, '')
    .replace(/^\s*(AND|OR|NOT)\s*\n/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ============================================================================
// Operator Badge Component
// ============================================================================

function OperatorBadge({ operator, onChange, disabled = false, size = 'md' }) {
  const handleClick = () => {
    if (disabled) return;
    onChange(operator === 'AND' ? 'OR' : 'AND');
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-3 py-1 text-xs';

  const colorClasses = operator === 'OR'
    ? 'bg-[var(--warning-light)] text-[var(--warning)] hover:opacity-80'
    : 'bg-[var(--success-light)] text-[var(--success)] hover:opacity-80';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${sizeClasses}
        ${colorClasses}
        font-mono font-semibold rounded-md
        transition-all cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      title={`Click to change to ${operator === 'AND' ? 'OR' : 'AND'}`}
    >
      {operator}
    </button>
  );
}

// ============================================================================
// Element Node Component
// ============================================================================

function ElementNode({
  element,
  isSelected,
  onSelect,
  onDelete,
  codeState,
  dragHandleProps,
  isDraggedOver,
  dragOverPosition,
}) {
  const notes = codeState ? getAllNotesForComponent(codeState.overrides) : [];
  const hasOverride = codeState && Object.values(codeState.overrides || {}).some(o => o?.isLocked);
  const hasNotes = notes.length > 0;
  const hasZeroCodes = (element.valueSet?.codes?.length ?? 0) === 0 &&
                       (element.directCodes?.length ?? 0) === 0 &&
                       element.type !== 'demographic';

  return (
    <div
      className={`
        relative group
        ${isDraggedOver && dragOverPosition === 'before' ? 'pt-8' : ''}
        ${isDraggedOver && dragOverPosition === 'after' ? 'pb-8' : ''}
      `}
    >
      {/* Drop indicator - before */}
      {isDraggedOver && dragOverPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--primary)] rounded-full" />
      )}

      {/* Main card */}
      <div
        onClick={onSelect}
        className={`
          relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer
          transition-all
          ${isSelected
            ? 'bg-[var(--accent-light)] border-[var(--accent)]/50'
            : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-dim)]'
          }
        `}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="
            flex-shrink-0 p-1 rounded cursor-grab
            text-[var(--text-dim)] hover:text-[var(--text-muted)]
            hover:bg-[var(--bg-tertiary)]
            active:cursor-grabbing
          "
        >
          <GripVertical size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type badge and description */}
          <div className="flex items-start gap-2">
            <span className={`
              flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded uppercase
              ${element.type === 'procedure' ? 'bg-purple-100 text-purple-700' :
                element.type === 'diagnosis' ? 'bg-red-100 text-red-700' :
                element.type === 'encounter' ? 'bg-[var(--success-light)] text-[var(--success)]' :
                element.type === 'observation' ? 'bg-cyan-100 text-cyan-700' :
                element.type === 'medication' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'}
            `}>
              {element.type}
            </span>

            <p className="text-sm text-[var(--text)] line-clamp-2">
              {cleanDescription(element.description)}
            </p>
          </div>

          {/* Value set info */}
          {element.valueSet && (
            <p className="mt-1 text-xs text-[var(--text-dim)] truncate">
              {element.valueSet.name}
              {element.valueSet.codes?.length ? ` (${element.valueSet.codes.length} codes)` : ''}
            </p>
          )}

          {/* Warnings and badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {hasZeroCodes && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded-full">
                <AlertTriangle size={10} />
                No codes
              </span>
            )}

            {hasOverride && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full">
                <Code2 size={10} />
                Code override
              </span>
            )}

            {hasNotes && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full">
                <MessageSquare size={10} />
                {notes.length}
              </span>
            )}

            {element.libraryComponentId ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--success-light)] text-[var(--success)] text-[10px] rounded-full">
                <Link2 size={10} />
                Linked
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                <Unlink size={10} />
                Local
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            flex-shrink-0 p-1.5 rounded-lg
            text-[var(--text-dim)] hover:text-red-400
            hover:bg-red-500/10
            opacity-0 group-hover:opacity-100 transition-opacity
          "
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Drop indicator - after */}
      {isDraggedOver && dragOverPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--primary)] rounded-full" />
      )}
    </div>
  );
}

// ============================================================================
// Nested Clause Component
// ============================================================================

function NestedClause({
  clause,
  onChange,
  onElementSelect,
  selectedElementId,
  codeStates,
  depth,
  dragState,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  readOnly,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleOperatorChange = (_index, newOperator) => {
    if (readOnly) return;

    if (newOperator !== clause.operator) {
      // Auto-nest: create a sub-clause containing the current and next element
      const children = [...clause.children];
      const currentChild = children[_index];
      const nextChild = children[_index + 1];

      if (!nextChild) return;

      const newSubClause = {
        id: `clause-${Date.now()}`,
        operator: newOperator,
        description: `${newOperator} Group`,
        children: [currentChild, nextChild],
        confidence: 'high',
        reviewStatus: 'pending',
      };

      children.splice(_index, 2, newSubClause);

      onChange({
        ...clause,
        children,
      });
    }
  };

  const handleChildChange = (index, child) => {
    const newChildren = [...clause.children];
    newChildren[index] = child;
    onChange({ ...clause, children: newChildren });
  };

  const handleDeleteChild = (index) => {
    if (readOnly) return;
    const newChildren = clause.children.filter((_, i) => i !== index);
    onChange({ ...clause, children: newChildren });
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(id);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? 'before' : 'after';
    onDragOver(id, position);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? 'before' : 'after';
    onDrop(targetId, position);
  };

  const indentClass = depth === 0 ? '' : 'ml-6';
  const borderClass = depth > 0 ? 'border-l-2 border-[var(--border)] pl-4' : '';

  return (
    <div className={`${indentClass} ${borderClass}`}>
      {/* Clause header (for nested clauses) */}
      {depth > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          <span className={`
            px-2 py-0.5 text-[10px] font-semibold rounded
            ${clause.operator === 'OR' ? 'bg-[var(--warning-light)] text-[var(--warning)]' : 'bg-[var(--success-light)] text-[var(--success)]'}
          `}>
            {clause.operator} Group
          </span>

          <span className="text-xs text-[var(--text-dim)]">
            {clause.children.length} items
          </span>
        </div>
      )}

      {/* Children */}
      {!isCollapsed && (
        <div className="space-y-1">
          {clause.children.map((child, index) => (
            <Fragment key={child.id}>
              {'operator' in child && 'children' in child ? (
                // Nested clause
                <NestedClause
                  clause={child}
                  onChange={(updated) => handleChildChange(index, updated)}
                  onElementSelect={onElementSelect}
                  selectedElementId={selectedElementId}
                  codeStates={codeStates}
                  depth={depth + 1}
                  dragState={dragState}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  readOnly={readOnly}
                />
              ) : (
                // Data element
                <div
                  draggable={!readOnly}
                  onDragStart={(e) => handleDragStart(e, child.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => handleDragOver(e, child.id)}
                  onDrop={(e) => handleDrop(e, child.id)}
                >
                  <ElementNode
                    element={child}
                    isSelected={selectedElementId === child.id}
                    onSelect={() => onElementSelect?.(child)}
                    onDelete={() => handleDeleteChild(index)}
                    codeState={codeStates?.[child.id]}
                    dragHandleProps={{
                      onMouseDown: (e) => e.stopPropagation(),
                    }}
                    isDraggedOver={dragState.dragOverId === child.id}
                    dragOverPosition={
                      dragState.dragOverId === child.id
                        ? dragState.dragOverPosition
                        : null
                    }
                  />
                </div>
              )}

              {/* Operator badge between siblings */}
              {index < clause.children.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <OperatorBadge
                    operator={clause.operator}
                    onChange={(newOp) => handleOperatorChange(index, newOp)}
                    disabled={readOnly}
                    size="sm"
                  />
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main LogicTreeEditor Component
// ============================================================================

export function LogicTreeEditor({
  clause,
  onClauseChange,
  onElementSelect,
  selectedElementId,
  codeStates,
  readOnly = false,
  className = '',
}) {
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedId: null,
    dragOverId: null,
    dragOverPosition: null,
  });

  const handleDragStart = useCallback((id) => {
    setDragState({
      isDragging: true,
      draggedId: id,
      dragOverId: null,
      dragOverPosition: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedId: null,
      dragOverId: null,
      dragOverPosition: null,
    });
  }, []);

  const handleDragOver = useCallback((id, position) => {
    setDragState(prev => ({
      ...prev,
      dragOverId: id,
      dragOverPosition: position,
    }));
  }, []);

  const handleDrop = useCallback((targetId, position) => {
    if (!dragState.draggedId || dragState.draggedId === targetId) {
      handleDragEnd();
      return;
    }

    // Find and reorder elements
    const reorderChildren = (children) => {
      let draggedElement = null;

      const findAndRemove = (items) => {
        return items.filter((item) => {
          if ('operator' in item && 'children' in item) {
            item.children = findAndRemove(item.children);
            return true;
          }
          if (item.id === dragState.draggedId) {
            draggedElement = item;
            return false;
          }
          return true;
        });
      };

      const newChildren = findAndRemove([...children]);

      if (!draggedElement) return children;

      // Find target and insert
      const insertAt = (items) => {
        const result = [];

        for (const item of items) {
          if ('operator' in item && 'children' in item) {
            result.push({
              ...item,
              children: insertAt(item.children),
            });
          } else {
            if (item.id === targetId) {
              if (position === 'before') {
                result.push(draggedElement);
                result.push(item);
              } else {
                result.push(item);
                result.push(draggedElement);
              }
            } else {
              result.push(item);
            }
          }
        }

        return result;
      };

      return insertAt(newChildren);
    };

    const newChildren = reorderChildren(clause.children);
    onClauseChange({ ...clause, children: newChildren });

    handleDragEnd();
  }, [dragState.draggedId, clause, onClauseChange, handleDragEnd]);

  return (
    <div className={`${className}`}>
      {/* Root clause header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`
          px-2 py-1 text-xs font-semibold rounded
          ${clause.operator === 'OR' ? 'bg-[var(--warning-light)] text-[var(--warning)]' : 'bg-[var(--success-light)] text-[var(--success)]'}
        `}>
          {clause.operator}
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          {clause.operator === 'AND' ? 'All criteria must be met' : 'Any one criterion must be met'}
        </span>
      </div>

      {/* Tree */}
      <NestedClause
        clause={clause}
        onChange={onClauseChange}
        onElementSelect={onElementSelect}
        selectedElementId={selectedElementId}
        codeStates={codeStates}
        depth={0}
        dragState={dragState}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        readOnly={readOnly}
      />

      {/* Add button */}
      {!readOnly && (
        <button
          className="
            mt-3 w-full py-2 border-2 border-dashed border-[var(--border)]
            rounded-lg text-sm text-[var(--text-dim)]
            hover:border-[var(--primary)]/50 hover:text-[var(--primary)]
            flex items-center justify-center gap-2
            transition-colors
          "
        >
          <Plus size={16} />
          Add Component
        </button>
      )}
    </div>
  );
}

export default LogicTreeEditor;
