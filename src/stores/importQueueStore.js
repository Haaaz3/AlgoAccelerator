/**
 * Import Queue Store
 *
 * Manages the background import queue for measures.
 * Tracks queued items, processing state, progress, and completion.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { importMeasures } from '../api/measures';
import { useNotificationStore } from './notificationStore';
import { useMeasureStore } from './measureStore';

// Processing phases with descriptions
const PROCESSING_PHASES = {
  queued: 'Queued',
  extracting_text: 'Extracting text from document...',
  analyzing_structure: 'Analyzing measure structure...',
  extracting_populations: 'Extracting populations and criteria...',
  resolving_value_sets: 'Resolving value sets...',
  finalizing: 'Finalizing import...',
  complete: 'Complete',
  error: 'Error',
};

export const useImportQueueStore = create(
  persist(
    (set, get) => ({
      // Queue state
      queue: [], // Array of { id, filename, cmsId, measureName, status, progress, phase, error, addedAt }
      isProcessing: false,
      currentItemId: null,

      // Get total count (processing + queued)
      getTotalCount: () => {
        const state = get();
        return state.queue.length;
      },

      // Get active count (items not yet complete or errored)
      getActiveCount: () => {
        const state = get();
        return state.queue.filter(
          (item) => item.status !== 'complete' && item.status !== 'error'
        ).length;
      },

      // Get current position in queue (1-indexed)
      getCurrentPosition: () => {
        const state = get();
        const activeItems = state.queue.filter(
          (item) => item.status !== 'complete' && item.status !== 'error'
        );
        const processingIndex = activeItems.findIndex(
          (item) => item.status === 'processing'
        );
        return processingIndex >= 0 ? processingIndex + 1 : 0;
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

      // Add items to the queue
      addToQueue: (items) => {
        const newItems = items.map((item) => ({
          id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filename: item.filename || 'Unknown file',
          cmsId: item.cmsId || null,
          measureName: item.measureName || null,
          measureData: item.measureData, // The actual data to import
          status: 'queued',
          progress: 0,
          phase: 'queued',
          phaseMessage: PROCESSING_PHASES.queued,
          error: null,
          addedAt: Date.now(),
        }));

        set((state) => ({
          queue: [...state.queue, ...newItems],
        }));

        // Start processing if not already
        get().processNext();
      },

      // Remove an item from the queue (cancel)
      removeFromQueue: (itemId) => {
        set((state) => {
          const item = state.queue.find((i) => i.id === itemId);
          // Only allow removing queued items, not processing ones
          if (item && item.status === 'queued') {
            return {
              queue: state.queue.filter((i) => i.id !== itemId),
            };
          }
          return state;
        });
      },

      // Update progress for current item
      updateProgress: (itemId, progress, phase, phaseMessage) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  progress,
                  phase,
                  phaseMessage: phaseMessage || PROCESSING_PHASES[phase] || phase,
                }
              : item
          ),
        }));
      },

      // Mark item as complete
      completeItem: (itemId, result) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'complete',
                  progress: 100,
                  phase: 'complete',
                  phaseMessage: PROCESSING_PHASES.complete,
                  result,
                }
              : item
          ),
          isProcessing: false,
          currentItemId: null,
        }));

        // Process next item
        get().processNext();
      },

      // Mark item as errored
      errorItem: (itemId, error) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error',
                  phase: 'error',
                  phaseMessage: PROCESSING_PHASES.error,
                  error: error?.message || error || 'Unknown error',
                }
              : item
          ),
          isProcessing: false,
          currentItemId: null,
        }));

        // Show error toast
        const item = get().queue.find((i) => i.id === itemId);
        if (item) {
          useNotificationStore.getState().addNotification({
            type: 'error',
            title: 'Import Failed',
            message: `${item.cmsId || item.filename} — ${error?.message || error || 'Unknown error'}`,
            measureId: null,
            cmsId: item.cmsId,
            measureName: item.measureName,
          });
        }

        // Process next item
        get().processNext();
      },

      // Process the next item in queue
      processNext: async () => {
        const state = get();

        // Already processing something
        if (state.isProcessing) return;

        // Find next queued item
        const nextItem = state.queue.find((item) => item.status === 'queued');
        if (!nextItem) return;

        // Mark as processing
        set({
          isProcessing: true,
          currentItemId: nextItem.id,
          queue: state.queue.map((item) =>
            item.id === nextItem.id
              ? { ...item, status: 'processing', progress: 0 }
              : item
          ),
        });

        try {
          const { updateProgress, completeItem, errorItem } = get();

          // Simulate progress phases
          updateProgress(nextItem.id, 10, 'extracting_text');
          await new Promise((r) => setTimeout(r, 300));

          updateProgress(nextItem.id, 30, 'analyzing_structure');
          await new Promise((r) => setTimeout(r, 300));

          updateProgress(nextItem.id, 50, 'extracting_populations');

          // Import the measure using the existing store method
          // This handles both backend import and localStorage persistence
          const measureStore = useMeasureStore.getState();
          const result = await measureStore.importMeasure(nextItem.measureData);

          updateProgress(nextItem.id, 80, 'resolving_value_sets');
          await new Promise((r) => setTimeout(r, 200));

          updateProgress(nextItem.id, 95, 'finalizing');
          await new Promise((r) => setTimeout(r, 200));

          // Complete successfully
          completeItem(nextItem.id, result);

          // Show success toast
          const cmsId = nextItem.measureData?.metadata?.measureId || nextItem.cmsId;
          const title = nextItem.measureData?.metadata?.title || nextItem.measureName;

          useNotificationStore.getState().addNotification({
            type: 'success',
            title: 'Import Complete',
            message: `${cmsId || 'Measure'} — ${title || 'Ready for review'}`,
            measureId: nextItem.measureData?.id,
            cmsId: cmsId,
            measureName: title,
          });
        } catch (error) {
          console.error('Import error:', error);
          get().errorItem(nextItem.id, error);
        }
      },

      // Retry a failed import
      retryItem: (itemId) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'queued',
                  progress: 0,
                  phase: 'queued',
                  phaseMessage: PROCESSING_PHASES.queued,
                  error: null,
                }
              : item
          ),
        }));

        get().processNext();
      },

      // Clear completed and errored items
      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter(
            (item) => item.status !== 'complete' && item.status !== 'error'
          ),
        }));
      },

      // Check if all imports are complete
      isAllComplete: () => {
        const state = get();
        return (
          state.queue.length > 0 &&
          state.queue.every(
            (item) => item.status === 'complete' || item.status === 'error'
          )
        );
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
    }),
    {
      name: 'import-queue-storage',
      // Only persist queue items that are still processing or queued
      partialize: (state) => ({
        queue: state.queue.filter(
          (item) => item.status === 'queued' || item.status === 'processing'
        ),
      }),
      // On rehydrate, reset any 'processing' items back to 'queued' so they resume after page reload
      onRehydrate: () => (state) => {
        if (state && state.queue) {
          // Reset processing items to queued
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
          // Reset processing state
          state.isProcessing = false;
          state.currentItemId = null;

          // Resume processing after a short delay to let the app initialize
          if (state.queue.some((item) => item.status === 'queued')) {
            setTimeout(() => {
              useImportQueueStore.getState().processNext();
            }, 500);
          }
        }
      },
    }
  )
);
