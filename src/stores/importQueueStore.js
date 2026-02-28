/**
 * Import Queue Store
 *
 * A session-scoped UI model for displaying import progress.
 * This store does NOT control execution flow - it just tracks status
 * for the sidebar indicator, queue panel, and notifications.
 *
 * IMPORTANT: This store is IN-MEMORY ONLY. It resets on page refresh.
 * Imports run client-side and cannot be resumed after refresh.
 *
 * The actual import pipeline (handleFiles, processNext, ingestMeasureFiles,
 * importMeasure) remains unchanged. This store is updated via fire-and-forget
 * calls from those functions.
 */

import { create } from 'zustand';

// 30 minutes in milliseconds - items older than this are considered stale
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

export const useImportQueueStore = create((set, get) => ({
  // Queue state - purely for UI display
  // Each item: { id, filename, cmsId, measureName, status, progress, phase, phaseMessage, error, addedAt }
  queue: [],

  // Get active count (items not yet complete, errored, or cancelled)
  getActiveCount: () => {
    const state = get();
    const now = Date.now();
    return state.queue.filter(
      (item) =>
        (item.status === 'processing' || item.status === 'queued') &&
        (now - item.addedAt) < STALE_THRESHOLD_MS
    ).length;
  },

  // Get the currently processing item
  getCurrentItem: () => {
    const state = get();
    return state.queue.find((item) => item.status === 'processing') || null;
  },

  // Get queued (not yet started) items
  getQueuedItems: () => {
    const state = get();
    return state.queue.filter((item) => item.status === 'queued');
  },

  // Get active items only (for fallback display) - excludes stale items
  getActiveItems: () => {
    const state = get();
    const now = Date.now();
    return state.queue.filter(
      (item) =>
        (item.status === 'processing' || item.status === 'queued') &&
        (now - item.addedAt) < STALE_THRESHOLD_MS
    );
  },

  // ===== Status reporting methods (called by the import pipeline) =====

  /**
   * Report that files have been added to the import queue.
   * Called from handleFiles when files are accepted.
   * Returns the generated queue item ID for later status updates.
   */
  reportQueued: (metadata) => {
    const id = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item = {
      id,
      filename: metadata.filename || 'Unknown file',
      cmsId: metadata.cmsId || null,
      measureName: metadata.measureName || null,
      status: 'queued',
      progress: 0,
      phase: 'queued',
      phaseMessage: 'Queued',
      error: null,
      addedAt: Date.now(),
    };

    set((state) => ({
      queue: [...state.queue, item],
    }));

    return id;
  },

  /**
   * Report that an item has started processing.
   * Called from processNext when it begins processing a file group.
   */
  reportProcessing: (itemId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === itemId
          ? { ...item, status: 'processing', progress: 5, phase: 'starting', phaseMessage: 'Starting...' }
          : item
      ),
    }));
  },

  /**
   * Report progress update for an item.
   * Called when progress phases change (extraction, LLM call, linking, etc.)
   */
  reportProgress: (itemId, progress, phase, phaseMessage) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === itemId
          ? { ...item, progress, phase, phaseMessage: phaseMessage || phase }
          : item
      ),
    }));
  },

  /**
   * Report that an import completed successfully.
   * Called after importMeasure succeeds.
   */
  reportComplete: (itemId, metadata) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'complete',
              progress: 100,
              phase: 'complete',
              phaseMessage: 'Complete',
              cmsId: metadata?.cmsId || item.cmsId,
              measureName: metadata?.measureName || item.measureName,
            }
          : item
      ),
    }));
  },

  /**
   * Report that an import failed.
   * Called when ingestMeasureFiles or importMeasure fails.
   */
  reportError: (itemId, errorMessage) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'error',
              phase: 'error',
              phaseMessage: 'Error',
              error: errorMessage || 'Unknown error',
            }
          : item
      ),
    }));
  },

  /**
   * Report that an import was cancelled.
   * Called when user cancels an active or queued import.
   */
  reportCancelled: (itemId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'cancelled',
              phase: 'cancelled',
              phaseMessage: 'Cancelled',
            }
          : item
      ),
    }));
  },

  /**
   * Clear completed, errored, and cancelled items from the queue.
   */
  clearCompleted: () => {
    set((state) => ({
      queue: state.queue.filter(
        (item) => item.status === 'processing' || item.status === 'queued'
      ),
    }));
  },

  /**
   * Remove a queued item (cancel before processing).
   */
  removeFromQueue: (itemId) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== itemId),
    }));
  },

  /**
   * Reset the entire store. Called on app initialization to ensure clean slate.
   */
  reset: () => {
    set({ queue: [] });
  },
}));
