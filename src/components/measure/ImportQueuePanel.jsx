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
 * - onRemoveFromQueue: (index) => void - callback to remove item from queue
 *
 * Shows:
 * - Progress counter ("Processing 1 of N")
 * - Current processing phase
 * - Progress bar for current measure
 * - List of queued items with cancel buttons
 */

import { CheckCircle, X, Brain, Zap, FileText } from 'lucide-react';

export function ImportQueuePanel({
  isProcessing,
  batchQueue,
  progress,
  batchIndex,
  batchTotal,
  onRemoveFromQueue,
}) {
  // Don't render if nothing is processing and queue is empty
  if (!isProcessing && batchQueue.length === 0 && !progress) {
    return null;
  }

  // Also hide if progress just completed and queue is empty (let it fade)
  if (!isProcessing && batchQueue.length === 0 && progress?.stage === 'complete') {
    // Show completion briefly
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
  if (!isProcessing && batchQueue.length === 0) {
    return null;
  }

  return (
    <div className="border-2 border-[var(--primary)]/50 rounded-xl mb-6 bg-[var(--bg-tertiary)] overflow-hidden">
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
                {progress?.message || 'Processing...'}
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
      {batchQueue.length > 0 && (
        <div className="border-t border-[var(--border)]">
          {batchQueue.map((files, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--bg-elevated)]/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[var(--text-dim)]" />
                <span className="text-sm text-[var(--text)]">
                  Queued: {files.map(f => f.name).join(', ')}
                </span>
                <span className="text-xs text-[var(--text-dim)]">
                  ({files.length} file{files.length !== 1 ? 's' : ''})
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
