/**
 * MeasureCodeEditor
 *
 * An intuitive code editing experience for non-technical users.
 * Features:
 * - Simple click-to-edit flow
 * - Required notes for all changes (audit trail)
 * - Visual diff showing before/after
 * - Edit history with timestamps
 * - One-click revert to generated code
 * - Helpful guidance throughout
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Edit3,
  Save,
  X,
  RotateCcw,
  History,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileCode,
  GitCompare,
  HelpCircle,
  Info,
} from 'lucide-react';
import { diffLines } from 'diff';
import { useMeasureStore } from '../../stores/measureStore';
import { formatNoteTimestamp } from '../../types/componentCode';

// =============================================================================
// Helper Components
// =============================================================================

function EditGuidance({ isFirstEdit }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <HelpCircle size={16} className="text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium text-blue-900 mb-1">
            {isFirstEdit ? 'Making Your First Edit' : 'Editing Generated Code'}
          </h4>
          <p className="text-sm text-blue-700 leading-relaxed">
            {isFirstEdit
              ? "You're about to customize the generated code. Any changes you make will be preserved even when the measure is updated. You'll need to add a note explaining your change for audit purposes."
              : "Your previous edits are preserved. Make additional changes as needed and add a note describing what you changed."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function NoteInputCard({ value, onChange, onSave, onCancel, isSaving }) {
  const isValid = value.trim().length >= 10;
  const charCount = value.trim().length;

  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-[var(--accent)]" />
        <span className="font-medium text-[var(--text)]">Describe Your Changes</span>
        <span className="text-xs text-[var(--danger)]">*Required</span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What did you change and why? (e.g., 'Fixed age filter to include patients up to 75 years')"
        rows={3}
        className={`
          w-full px-4 py-3 text-sm rounded-lg border
          bg-[var(--bg-secondary)] text-[var(--text)]
          placeholder:text-[var(--text-dim)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
          ${charCount > 0 && !isValid ? 'border-amber-400' : 'border-[var(--border)]'}
        `}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-[var(--text-muted)]">
          {charCount > 0 && !isValid ? (
            <span className="text-amber-500">
              {10 - charCount} more characters needed
            </span>
          ) : charCount > 0 ? (
            <span className="text-[var(--success)]">
              <CheckCircle size={12} className="inline mr-1" />
              Good description
            </span>
          ) : (
            'Minimum 10 characters'
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!isValid || isSaving}
            className={`
              flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all
              ${isValid && !isSaving
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-dim)] cursor-not-allowed'
              }
            `}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryEntryDiff({ codeBefore, codeAfter }) {
  const diff = useMemo(() => {
    if (!codeBefore || !codeAfter) return [];
    return diffLines(codeBefore, codeAfter);
  }, [codeBefore, codeAfter]);

  if (!codeBefore || !codeAfter) {
    return (
      <div className="text-xs text-[var(--text-dim)] italic p-2">
        Diff not available for this edit
      </div>
    );
  }

  // Count additions and removals
  const stats = useMemo(() => {
    let added = 0, removed = 0;
    diff.forEach(part => {
      const lines = part.value.split('\n').filter(l => l !== '').length;
      if (part.added) added += lines;
      if (part.removed) removed += lines;
    });
    return { added, removed };
  }, [diff]);

  return (
    <div className="mt-3 border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Diff stats header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
        <GitCompare size={14} className="text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)]">Changes:</span>
        {stats.added > 0 && (
          <span className="text-xs text-green-600 font-medium">+{stats.added} lines</span>
        )}
        {stats.removed > 0 && (
          <span className="text-xs text-red-600 font-medium">-{stats.removed} lines</span>
        )}
      </div>

      {/* Diff content */}
      <div className="max-h-[250px] overflow-auto bg-[var(--bg)] font-mono text-xs">
        {diff.map((part, index) => (
          <div
            key={index}
            className={`
              ${part.added ? 'bg-green-50 border-l-2 border-green-400' : ''}
              ${part.removed ? 'bg-red-50 border-l-2 border-red-400' : ''}
              ${!part.added && !part.removed ? 'border-l-2 border-transparent' : ''}
            `}
          >
            {part.value.split('\n').map((line, lineIndex, lines) => (
              lineIndex === lines.length - 1 && line === '' ? null : (
                <div
                  key={lineIndex}
                  className={`flex px-2 py-0.5 ${
                    part.added ? 'text-green-700' : part.removed ? 'text-red-700 line-through' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <span className="w-6 flex-shrink-0 text-right pr-2 opacity-50 select-none">
                    {part.added ? '+' : part.removed ? '-' : ' '}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{line || ' '}</span>
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditHistoryPanel({ history, isExpanded, onToggle, format }) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  if (!history || history.length === 0) return null;

  const toggleEntry = (entryId) => {
    setExpandedEntryId(prev => prev === entryId ? null : entryId);
  };

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History size={16} className="text-[var(--accent)]" />
          <span className="font-medium text-[var(--text)]">Edit History</span>
          <span className="px-2 py-0.5 bg-[var(--accent-light)] text-[var(--accent)] text-xs rounded-full">
            {history.length} {history.length === 1 ? 'change' : 'changes'}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {history.map((entry, index) => {
            const isEntryExpanded = expandedEntryId === entry.id;
            const hasDiff = entry.codeBefore && entry.codeAfter;

            return (
              <div
                key={entry.id || index}
                className={`rounded-lg overflow-hidden transition-all ${
                  isEntryExpanded
                    ? 'bg-[var(--bg)] border border-[var(--accent)]/30 shadow-sm'
                    : 'bg-[var(--bg-secondary)]'
                }`}
              >
                {/* Entry header - clickable */}
                <button
                  onClick={() => hasDiff && toggleEntry(entry.id)}
                  className={`w-full text-left p-3 ${
                    hasDiff ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : 'cursor-default'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] rounded font-medium uppercase">
                        {format}
                      </span>
                      <Clock size={12} className="text-[var(--text-dim)]" />
                      <span className="text-xs text-[var(--text-dim)]">
                        {formatNoteTimestamp(entry.timestamp)}
                      </span>
                      {entry.author && (
                        <span className="text-xs text-[var(--text-muted)]">
                          by {entry.author}
                        </span>
                      )}
                    </div>

                    {hasDiff && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
                        <GitCompare size={12} />
                        <span>{isEntryExpanded ? 'Hide diff' : 'View diff'}</span>
                        {isEntryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text)]">{entry.content}</p>
                </button>

                {/* Expanded diff view */}
                {isEntryExpanded && hasDiff && (
                  <div className="px-3 pb-3">
                    <HistoryEntryDiff
                      codeBefore={entry.codeBefore}
                      codeAfter={entry.codeAfter}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiffViewer({ originalCode, modifiedCode }) {
  const diff = useMemo(() => {
    return diffLines(originalCode || '', modifiedCode || '');
  }, [originalCode, modifiedCode]);

  return (
    <div className="font-mono text-sm">
      {diff.map((part, index) => (
        <div
          key={index}
          className={`
            ${part.added ? 'bg-green-100 text-green-800' : ''}
            ${part.removed ? 'bg-red-100 text-red-800 line-through' : ''}
            ${!part.added && !part.removed ? 'text-[var(--text-muted)]' : ''}
          `}
        >
          {part.value.split('\n').map((line, lineIndex, lines) => (
            lineIndex === lines.length - 1 && line === '' ? null : (
              <div key={lineIndex} className="flex">
                <span className="w-8 flex-shrink-0 text-right pr-3 opacity-50 select-none border-r border-[var(--border)] mr-3">
                  {part.added ? '+' : part.removed ? '-' : ' '}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">{line || ' '}</span>
              </div>
            )
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MeasureCodeEditor({
  code,
  originalCode,
  format,
  measureId,
  onSave,
  editHistory = [],
  hasOverride = false,
  onRevert,
  className = '',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState('code'); // 'code' | 'diff'
  const textareaRef = useRef(null);

  const isFirstEdit = !hasOverride && editHistory.length === 0;

  // Initialize edited code when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditedCode(code);
      // Focus the textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(0, 0);
      }, 100);
    }
  }, [isEditing, code]);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    setEditedCode(code);
    setNoteContent('');
    setViewMode('code');
  }, [code]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedCode('');
    setNoteContent('');
  }, []);

  const handleSave = useCallback(async () => {
    if (noteContent.trim().length < 10) return;

    setIsSaving(true);
    try {
      await onSave(editedCode, noteContent.trim());
      setIsEditing(false);
      setEditedCode('');
      setNoteContent('');
    } catch (err) {
      console.error('Failed to save code:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedCode, noteContent, onSave]);

  const handleRevert = useCallback(() => {
    if (window.confirm('Are you sure you want to revert to the original generated code? Your custom changes will be lost.')) {
      onRevert?.();
    }
  }, [onRevert]);

  const hasChanges = isEditing && editedCode !== code;

  return (
    <div className={`bg-[var(--bg)] rounded-xl border border-[var(--border)] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <FileCode size={18} className="text-[var(--accent)]" />
          <span className="font-medium text-[var(--text)]">
            {format === 'cql' ? 'CQL Code' : 'Synapse SQL Code'}
          </span>

          {hasOverride && !isEditing && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
              <Edit3 size={12} />
              Custom Override
            </span>
          )}

          {isEditing && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              <Edit3 size={12} />
              Editing...
            </span>
          )}
        </div>

        {/* View Mode Toggle (when viewing, not editing) */}
        {!isEditing && hasOverride && (
          <div className="flex items-center gap-1 bg-[var(--bg)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('code')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${viewMode === 'code'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              <FileCode size={14} />
              Code
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${viewMode === 'diff'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              <GitCompare size={14} />
              Changes
            </button>
          </div>
        )}
      </div>

      {/* Guidance (when editing) */}
      {isEditing && (
        <div className="px-4 pt-4">
          <EditGuidance isFirstEdit={isFirstEdit} />
        </div>
      )}

      {/* Code Content */}
      <div className="relative">
        {isEditing ? (
          <div className="p-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="
                  w-full min-h-[400px] p-4 font-mono text-sm leading-relaxed
                  bg-[var(--bg-secondary)] text-[var(--text)]
                  border border-[var(--border)] rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]
                  resize-y
                "
                spellCheck={false}
              />

              {/* Change indicator */}
              {hasChanges && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </div>
              )}
            </div>

            {/* Note Input */}
            <NoteInputCard
              value={noteContent}
              onChange={setNoteContent}
              onSave={handleSave}
              onCancel={handleCancelEditing}
              isSaving={isSaving}
            />
          </div>
        ) : viewMode === 'diff' && hasOverride ? (
          <div className="p-4 bg-[var(--bg-secondary)] max-h-[500px] overflow-auto">
            <DiffViewer originalCode={originalCode} modifiedCode={code} />
          </div>
        ) : (
          <pre className="p-4 font-mono text-sm leading-relaxed overflow-x-auto bg-[var(--bg-secondary)] max-h-[500px] overflow-y-auto text-[var(--text)]">
            <code>{code}</code>
          </pre>
        )}
      </div>

      {/* Footer Actions */}
      {!isEditing && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasOverride && (
                <button
                  onClick={handleRevert}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--danger)] rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  Revert to Original
                </button>
              )}
            </div>

            <button
              onClick={handleStartEditing}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
            >
              <Edit3 size={16} />
              {hasOverride ? 'Edit Code' : 'Customize Code'}
            </button>
          </div>
        </div>
      )}

      {/* Edit History */}
      {!isEditing && editHistory.length > 0 && (
        <div className="px-4 pb-4">
          <EditHistoryPanel
            history={editHistory}
            isExpanded={showHistory}
            onToggle={() => setShowHistory(!showHistory)}
            format={format}
          />
        </div>
      )}
    </div>
  );
}

export default MeasureCodeEditor;
