/**
 * ImportQueuePanel Component
 *
 * Displays import queue status using a DUAL-SOURCE approach:
 * 1. Props from MeasureLibrary (accurate real-time data when on page)
 * 2. importQueueStore (survives navigation)
 *
 * Prefers props when available; falls back to store when props are empty
 * (user navigated away and back while imports were running).
 *
 * Props (from MeasureLibrary's real pipeline state):
 * - isProcessing: boolean - whether the pipeline is actively processing
 * - batchQueue: File[][] - array of file groups waiting to be processed
 * - progress: { stage, message, progress, details } | null - current progress
 * - batchIndex: number - current item being processed (1-based)
 * - batchTotal: number - total items in this batch
 * - onRemoveFromQueue: (index) => void - callback to remove item from queue
 * - onCancelActive: () => void - callback to cancel the active import
 * - onCancelAll: () => void - callback to cancel all imports
 */

import { CheckCircle, X, Brain, Zap, FileText, Loader2, XCircle } from 'lucide-react';
import { useImportQueueStore } from '../../stores/importQueueStore';

// 30 minutes in milliseconds - items older than this are considered stale
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

export function ImportQueuePanel({
  isProcessing = false,
  batchQueue = [],
  progress = null,
  batchIndex = 0,
  batchTotal = 0,
  onRemoveFromQueue = () => {},
  onCancelActive = null,
  onCancelAll = null,
}) {
  // Read store queue array directly (not via getter methods to avoid re-render loops)
  const storeQueue = useImportQueueStore((state) => state.queue);

  // Filter store items: only active statuses AND not stale (< 30 min old)
  const now = Date.now();
  const activeStoreItems = storeQueue.filter(
    (item) =>
      (item.status === 'processing' || item.status === 'queued') &&
      item.addedAt &&
      (now - item.addedAt) < STALE_THRESHOLD_MS
  );

  // Compute store-derived values from filtered items
  const storeHasActive = activeStoreItems.length > 0;
  const storeProcessingItem = activeStoreItems.find((item) => item.status === 'processing');
  const storeQueuedCount = activeStoreItems.filter((item) => item.status === 'queued').length;
  const storeCompletedCount = storeQueue.filter((item) => item.status === 'complete').length;

  // Prefer props (accurate) but fall back to store (survives navigation)
  const propsHaveData = isProcessing || (batchQueue && batchQueue.length > 0);
  const effectiveIsProcessing = propsHaveData ? isProcessing : storeHasActive;
  const effectiveQueueCount = propsHaveData ? (batchQueue?.length || 0) : storeQueuedCount;
  const effectiveTotal = propsHaveData ? batchTotal : activeStoreItems.length;
  const effectiveIndex = propsHaveData ? batchIndex : (storeCompletedCount + (storeProcessingItem ? 1 : 0));
  const effectiveProgress = propsHaveData ? progress : (storeProcessingItem ? {
    stage: storeProcessingItem.phase,
    message: storeProcessingItem.phaseMessage,
    progress: storeProcessingItem.progress,
  } : null);

  // Calculate display values
  const totalItems = effectiveTotal || (effectiveIsProcessing ? 1 : 0) + effectiveQueueCount;
  const currentItem = effectiveIndex || (effectiveIsProcessing ? 1 : 0);

  // Don't render if nothing is active from either source
  if (!effectiveIsProcessing && effectiveQueueCount === 0 && !effectiveProgress) {
    return null;
  }

  // Show completion state briefly when done
  if (!effectiveIsProcessing && effectiveQueueCount === 0 && effectiveProgress?.stage === 'complete') {
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

  // Nothing to show
  if (!effectiveIsProcessing && effectiveQueueCount === 0) {
    return null;
  }

  const showCancelAll = onCancelAll && (effectiveIsProcessing || effectiveQueueCount > 0);

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
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-dim)]">
              {effectiveQueueCount} queued
            </span>
            {showCancelAll && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelAll();
                }}
                className="text-xs text-[var(--danger)] hover:underline"
              >
                Cancel All
              </button>
            )}
          </div>
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
                {effectiveProgress?.message || 'Import in progress...'}
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
              {/* Cancel active import button */}
              {onCancelActive && propsHaveData && effectiveIsProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelActive();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--danger)] bg-[var(--danger-light)] hover:bg-[var(--danger)]/20 rounded-md transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Import
                </button>
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

      {/* Show store-based items when props not available (navigated away and back) */}
      {!propsHaveData && activeStoreItems.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-elevated)]/30">
          <p className="text-xs text-[var(--text-dim)] text-center">
            Import running in background. Return to continue monitoring.
          </p>
        </div>
      )}
    </div>
  );
}
