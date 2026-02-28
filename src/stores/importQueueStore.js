/**
 * Import Queue Store
 *
 * A READ-ONLY UI model for displaying import progress.
 * This store does NOT control execution flow - it just tracks status
 * for the sidebar indicator, queue panel, and notifications.
 *
 * The actual import pipeline (handleFiles, processNext, ingestMeasureFiles,
 * importMeasure) remains unchanged. This store is updated via fire-and-forget
 * calls from those functions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useImportQueueStore = create(
  persist(
    (set, get) => ({
      // Queue state - purely for UI display
      queue: [], // Array of { id, filename, cmsId, measureName, status, progress, phase, error, addedAt }

      // Batch counter state - for "Processing X of Y" display
      batchIndex: 0,  // Current item being processed (1-based)
      batchTotal: 0,  // Total items queued in this session

      // Current progress state - for display when navigating back
      currentProgress: null, // { stage, message, progress, details }

      // Get active count (items not yet complete or errored)
      getActiveCount: () => {
        const state = get();
        return state.queue.filter(
          (item) => item.status !== 'complete' && item.status !== 'error'
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

      // Get completion stats
      getStats: () => {
        const state = get();
        return {
          total: state.queue.length,
          completed: state.queue.filter((i) => i.status === 'complete').length,
          errored: state.queue.filter((i) => i.status === 'error').length,
          queued: state.queue.filter((i) => i.status === 'queued').length,
          processing: state.queue.filter((i) => i.status === 'processing').length,
        };
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
          batchTotal: state.batchTotal + 1,
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
          batchIndex: state.batchIndex + 1,
          currentProgress: { stage: 'starting', message: 'Starting...', progress: 5, details: null },
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
          currentProgress: { stage: phase, message: phaseMessage || phase, progress, details: null },
        }));
      },

      /**
       * Report that an import completed successfully.
       * Called after importMeasure succeeds.
       */
      reportComplete: (itemId, metadata) => {
        set((state) => {
          const updatedQueue = state.queue.map((item) =>
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
          );
          // Check if all items are complete or errored
          const stillActive = updatedQueue.some(
            (item) => item.status === 'queued' || item.status === 'processing'
          );
          return {
            queue: updatedQueue,
            currentProgress: { stage: 'complete', message: 'Complete', progress: 100, details: null },
            // Reset counters when all done
            ...(stillActive ? {} : { batchIndex: 0, batchTotal: 0 }),
          };
        });
      },

      /**
       * Report that an import failed.
       * Called when ingestMeasureFiles or importMeasure fails.
       */
      reportError: (itemId, errorMessage) => {
        set((state) => {
          const updatedQueue = state.queue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error',
                  phase: 'error',
                  phaseMessage: 'Error',
                  error: errorMessage || 'Unknown error',
                }
              : item
          );
          // Check if all items are complete or errored
          const stillActive = updatedQueue.some(
            (item) => item.status === 'queued' || item.status === 'processing'
          );
          return {
            queue: updatedQueue,
            // Reset counters when all done
            ...(stillActive ? {} : { batchIndex: 0, batchTotal: 0, currentProgress: null }),
          };
        });
      },

      /**
       * Clear completed and errored items from the queue.
       */
      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter(
            (item) => item.status !== 'complete' && item.status !== 'error'
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
    }),
    {
      name: 'import-queue-storage',
      // Persist queue items that are still processing or queued, plus counters
      partialize: (state) => ({
        queue: state.queue.filter(
          (item) => item.status === 'queued' || item.status === 'processing'
        ),
        batchIndex: state.batchIndex,
        batchTotal: state.batchTotal,
        currentProgress: state.currentProgress,
      }),
      // On rehydrate, reset any 'processing' items back to 'queued'
      onRehydrate: () => (state) => {
        if (state) {
          if (state.queue) {
            state.queue = state.queue.map((item) =>
              item.status === 'processing'
                ? {
                    ...item,
                    status: 'queued',
                    progress: 0,
                    phase: 'queued',
                    phaseMessage: 'Queued',
                  }
                : item
            );
          }
          // Reset progress since processing was interrupted
          state.currentProgress = null;
        }
      },
    }
  )
);
