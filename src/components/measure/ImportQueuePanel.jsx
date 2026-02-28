/**
 * ImportQueuePanel Component
 *
 * Displays import queue status by reading from the importQueueStore.
 * This is a pure observer - it reads from the store which is updated
 * via fire-and-forget calls from the real import pipeline.
 *
 * Shows:
 * - Progress counter ("Processing 1 of N")
 * - Current processing phase
 * - Progress bar for current measure
 * - List of queued items with cancel buttons
 * - Completion/error states
 */

import { CheckCircle, X, Loader2, AlertCircle, RotateCcw, Brain, Zap } from 'lucide-react';
import { useImportQueueStore } from '../../stores/importQueueStore';

export function ImportQueuePanel() {
  const queue = useImportQueueStore((state) => state.queue);
  const getActiveCount = useImportQueueStore((state) => state.getActiveCount);
  const getCurrentItem = useImportQueueStore((state) => state.getCurrentItem);
  const getQueuedItems = useImportQueueStore((state) => state.getQueuedItems);
  const getStats = useImportQueueStore((state) => state.getStats);
  const removeFromQueue = useImportQueueStore((state) => state.removeFromQueue);
  const clearCompleted = useImportQueueStore((state) => state.clearCompleted);

  const activeCount = getActiveCount();
  const currentItem = getCurrentItem();
  const queuedItems = getQueuedItems();
  const stats = getStats();

  // Don't render if queue is empty
  if (queue.length === 0) {
    return null;
  }

  // Check if all items are complete
  const allComplete = stats.total > 0 && stats.completed + stats.errored === stats.total;
  const hasErrors = stats.errored > 0;

  return (
    <div className="border-2 border-[var(--primary)]/50 rounded-xl mb-6 bg-[var(--bg-tertiary)] overflow-hidden">
      {/* Main progress area */}
      <div className="p-6 text-center">
        {allComplete ? (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-[var(--success)]" />
            <p className="text-[var(--success)] font-medium">
              {stats.completed} measure{stats.completed !== 1 ? 's' : ''} imported successfully
              {hasErrors && (
                <span className="text-[var(--danger)] ml-2">
                  ({stats.errored} failed)
                </span>
              )}
            </p>
            <button
              onClick={clearCompleted}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Clear
            </button>
          </div>
        ) : currentItem ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="relative">
                <Brain className="w-10 h-10 text-[var(--accent)]" />
                <Zap className="w-4 h-4 text-[var(--warning)] absolute -right-1 -bottom-1 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-[var(--text)] font-medium mb-1">
                {stats.total > 1 && `[${stats.completed + 1}/${stats.total}] `}
                {currentItem.phaseMessage || 'Processing...'}
              </p>
              {currentItem.filename && (
                <p className="text-sm text-[var(--text-muted)] mb-2">
                  {currentItem.filename}
                </p>
              )}
              <div className="w-64 mx-auto h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${currentItem.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 mx-auto text-[var(--accent)] animate-spin" />
            <p className="text-[var(--text-muted)]">Waiting to process...</p>
          </div>
        )}
      </div>

      {/* Queued items list */}
      {queuedItems.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <div className="px-4 py-2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)]">
            Queued ({queuedItems.length})
          </div>
          {queuedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--bg-elevated)]/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--text-dim)]" />
                <span className="text-sm text-[var(--text)]">
                  {item.filename}
                </span>
              </div>
              <button
                onClick={() => removeFromQueue(item.id)}
                className="p-1 text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded transition-colors"
                title="Remove from queue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error items */}
      {stats.errored > 0 && (
        <div className="border-t border-[var(--border)]">
          <div className="px-4 py-2 text-xs text-[var(--danger)] bg-[var(--danger-light)]">
            Failed ({stats.errored})
          </div>
          {queue
            .filter((item) => item.status === 'error')
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--danger-light)]/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-[var(--text)] truncate block">
                      {item.filename}
                    </span>
                    <span className="text-xs text-[var(--danger)] truncate block">
                      {item.error}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Completed items (brief display before clear) */}
      {stats.completed > 0 && !allComplete && (
        <div className="border-t border-[var(--border)]">
          <div className="px-4 py-2 text-xs text-[var(--success)] bg-[var(--success-light)]">
            Completed ({stats.completed})
          </div>
          {queue
            .filter((item) => item.status === 'complete')
            .slice(-3) // Show only last 3 completed
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--success-light)]/30"
              >
                <CheckCircle className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
                <span className="text-sm text-[var(--text)]">
                  {item.cmsId || item.filename} — {item.measureName || 'Imported'}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
