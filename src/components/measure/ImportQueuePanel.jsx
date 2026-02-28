/**
 * ImportQueuePanel Component
 *
 * Displays import queue status using a DUAL-SOURCE approach:
 * 1. Real pipeline state passed as props from MeasureLibrary (most accurate)
 * 2. importQueueStore state (persists across navigation)
 *
 * Render if EITHER source indicates active imports.
 * Prefer prop values when available; fall back to store values when
 * props indicate idle (user navigated away and back during imports).
 *
 * Props (from MeasureLibrary's real pipeline state):
 * - isProcessing: boolean - whether the pipeline is actively processing
 * - batchQueue: File[][] - array of file groups waiting to be processed
 * - progress: { stage, message, progress, details } | null - current progress
 * - batchIndex: number - current item being processed (1-based)
 * - batchTotal: number - total items queued in this session
 * - onRemoveFromQueue: (index) => void - callback to remove item from queue
 */

import { CheckCircle, X, Brain, Zap, FileText, Loader2 } from 'lucide-react';
import { useImportQueueStore } from '../../stores/importQueueStore';

export function ImportQueuePanel({
  isProcessing = false,
  batchQueue = [],
  progress = null,
  batchIndex = 0,
  batchTotal = 0,
  onRemoveFromQueue = () => {},
}) {
  // Read from store as fallback source
  const storeState = useImportQueueStore((state) => ({
    storeActiveCount: state.getActiveCount(),
    storeBatchIndex: state.batchIndex,
    storeBatchTotal: state.batchTotal,
    storeProgress: state.currentProgress,
    storeQueuedItems: state.getQueuedItems(),
    storeCurrentItem: state.getCurrentItem(),
  }));

  // Determine if imports are active from EITHER source
  const propsIndicateActive = isProcessing || (batchQueue && batchQueue.length > 0);
  const storeIndicatesActive = storeState.storeActiveCount > 0;
  const hasActiveImports = propsIndicateActive || storeIndicatesActive;

  // Use prop values when available (more accurate), fall back to store
  const effectiveBatchIndex = propsIndicateActive ? batchIndex : storeState.storeBatchIndex;
  const effectiveBatchTotal = propsIndicateActive ? batchTotal : storeState.storeBatchTotal;
  const effectiveProgress = propsIndicateActive ? progress : storeState.storeProgress;
  const effectiveIsProcessing = propsIndicateActive ? isProcessing : storeIndicatesActive;

  // For queued items display: use props if available, else show store count
  const queuedFromProps = batchQueue && batchQueue.length > 0;
  const queuedCount = queuedFromProps ? batchQueue.length : storeState.storeQueuedItems.length;

  // Don't render if nothing is active and no completion to show
  if (!hasActiveImports && !effectiveProgress) {
    return null;
  }

  // Show completion state briefly when done
  if (!hasActiveImports && effectiveProgress?.stage === 'complete') {
    return (
      <div className="border-2 border-[var(--success)]/50 rounded-xl mb-6 bg-[var(--success-light)] overflow-hidden">
        <div className="p-6 text-center">
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-[var(--success)]" />
            <p className="text-[var(--success)] font-medium">{effectiveProgress.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Nothing to show if not active
  if (!hasActiveImports) {
    return null;
  }

  return (
    <div className="border-2 border-[var(--primary)]/50 rounded-xl mb-6 bg-[var(--bg-tertiary)] overflow-hidden">
      {/* Header with counter */}
      {effectiveBatchTotal > 0 && (
        <div className="px-4 py-2 bg-[var(--primary)]/10 border-b border-[var(--primary)]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
            <span className="text-sm font-medium text-[var(--primary)]">
              Processing {effectiveBatchIndex} of {effectiveBatchTotal}
            </span>
          </div>
          <span className="text-xs text-[var(--text-dim)]">
            {queuedCount} queued
          </span>
        </div>
      )}

      {/* Main progress area */}
      <div className="p-6 text-center">
        {effectiveProgress?.stage === 'complete' ? (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-[var(--success)]" />
            <p className="text-[var(--success)] font-medium">{effectiveProgress.message}</p>
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
                {effectiveProgress?.message || 'Processing...'}
              </p>
              <div className="w-64 mx-auto h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${effectiveProgress?.progress || 0}%` }}
                />
              </div>
              {effectiveProgress?.details && (
                <p className="text-xs text-[var(--text-dim)] mt-2">{effectiveProgress.details}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Queued items list - only show if we have prop data (can't cancel store items) */}
      {queuedFromProps && batchQueue.length > 0 && (
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

      {/* Show store-based queued items when props not available */}
      {!queuedFromProps && storeState.storeQueuedItems.length > 0 && (
        <div className="border-t border-[var(--border)]">
          {storeState.storeQueuedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] last:border-b-0 bg-[var(--bg-elevated)]/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[var(--text-dim)]" />
                <span className="text-sm text-[var(--text)]">
                  Queued: {item.filename}
                </span>
              </div>
              <span className="text-xs text-[var(--text-dim)]">
                {item.phaseMessage}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
