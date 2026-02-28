/**
 * ImportQueuePanel Component
 *
 * Displays import queue status by reading DIRECTLY from the real pipeline state
 * passed as props from MeasureLibrary. This ensures the UI always reflects
 * the actual pipeline state, not a secondary observer.
 *
 * Props (from MeasureLibrary's real pipeline state):
 * - isProcessing: boolean - whether the pipeline is actively processing
 * - batchQueue: File[][] - array of file groups waiting to be processed
 * - progress: { stage, message, progress, details } | null - current progress
 * - batchIndex: number - current item being processed (1-based)
 * - batchTotal: number - total items in this batch
 * - onRemoveFromQueue: (index) => void - callback to remove item from queue
 *
 * Shows:
 * - Progress counter ("Processing 1 of N")
 * - Current processing phase
 * - Progress bar for current measure
 * - List of queued items with cancel buttons
 */

import { CheckCircle, X, Brain, Zap, FileText, Loader2 } from 'lucide-react';

export function ImportQueuePanel({
  isProcessing = false,
  batchQueue = [],
  progress = null,
  batchIndex = 0,
  batchTotal = 0,
  onRemoveFromQueue = () => {},
}) {
  // Calculate total: current processing + queued items
  const totalItems = batchTotal || (isProcessing ? 1 : 0) + (batchQueue?.length || 0);
  const currentItem = batchIndex || (isProcessing ? 1 : 0);

  // Don't render if nothing is processing and queue is empty
  if (!isProcessing && (!batchQueue || batchQueue.length === 0) && !progress) {
    return null;
  }

  // Show completion state briefly when done
  if (!isProcessing && (!batchQueue || batchQueue.length === 0) && progress?.stage === 'complete') {
    return (
      <div className="border-2 border-[var(--success)]/50 rounded-xl mb-6 bg-[var(--success-light)] overflow-hidden">
        <div className="p-6 text-center">
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-[var(--success)]" />
            <p className="text-[var(--success)] font-medium">{progress.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Nothing to show
  if (!isProcessing && (!batchQueue || batchQueue.length === 0)) {
    return null;
  }

  return (
    <div className="border-2 border-[var(--primary)]/50 rounded-xl mb-6 bg-[var(--bg-tertiary)] overflow-hidden">
      {/* Header with counter */}
      {totalItems > 0 && (
        <div className="px-4 py-2 bg-[var(--primary)]/10 border-b border-[var(--primary)]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
            <span className="text-sm font-medium text-[var(--primary)]">
              Processing {currentItem} of {totalItems}
            </span>
          </div>
          <span className="text-xs text-[var(--text-dim)]">
            {batchQueue?.length || 0} queued
          </span>
        </div>
      )}

      {/* Main progress area */}
      <div className="p-6 text-center">
        {progress?.stage === 'complete' ? (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-[var(--success)]" />
            <p className="text-[var(--success)] font-medium">{progress.message}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="relative">
                <Brain className="w-10 h-10 text-[var(--accent)]" />
                <Zap className="w-4 h-4 text-[var(--warning)] absolute -right-1 -bottom-1 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-[var(--text)] font-medium mb-2">
                {progress?.message || 'Starting import...'}
              </p>
              <div className="w-64 mx-auto h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${progress?.progress || 0}%` }}
                />
              </div>
              {progress?.details && (
                <p className="text-xs text-[var(--text-dim)] mt-2">{progress.details}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Queued items list */}
      {batchQueue && batchQueue.length > 0 && (
        <div className="border-t border-[var(--border)]">
          {batchQueue.map((files, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--bg-elevated)]/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[var(--text-dim)]" />
                <span className="text-sm text-[var(--text)]">
                  Queued: {files?.map(f => f.name).join(', ') || 'Unknown files'}
                </span>
                <span className="text-xs text-[var(--text-dim)]">
                  ({files?.length || 0} file{(files?.length || 0) !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromQueue(idx);
                }}
                className="p-1 text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded transition-colors"
                title="Remove from queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
