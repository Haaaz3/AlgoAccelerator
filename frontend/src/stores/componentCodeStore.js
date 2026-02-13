/**
 * Component Code Store
 *
 * Zustand store for managing:
 * - Code override states per component
 * - Format selection preferences
 * - Edit notes across all components
 * - Persistence to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Creates a compound store key that includes the measure ID.
 */
export function getStoreKey(measureId, elementId) {
  return `${measureId}::${elementId}`;
}

/**
 * Extracts the elementId from a compound store key.
 */
export function getElementIdFromStoreKey(storeKey) {
  const parts = storeKey.split('::');
  return parts.length > 1 ? parts[1] : storeKey;
}

/**
 * Creates a default code state for a component.
 */
function createDefaultComponentCodeState(componentId) {
  return {
    componentId,
    selectedFormat: 'cql',
    overrides: {},
  };
}

/**
 * Creates a code edit note.
 */
function createCodeEditNote(content, format, author, changeType, previousCode) {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    content,
    format,
    author,
    changeType: changeType || 'manual_edit',
    previousCode,
  };
}

/**
 * Creates a code override.
 */
function createCodeOverride(format, code, originalCode, note) {
  return {
    format,
    code,
    originalCode,
    isLocked: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: note ? [note] : [],
  };
}

/**
 * Gets all notes for a component from its overrides.
 */
function getAllNotesForComponent(overrides) {
  const notes = [];
  Object.values(overrides).forEach((override) => {
    if (override?.notes) {
      notes.push(...override.notes);
    }
  });
  return notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export const useComponentCodeStore = create(
  persist(
    (set, get) => ({
      codeStates: {},
      defaultFormat: 'cql',
      inspectingComponentId: null,

      // Pure getter - no side effects, returns undefined if not found
      getCodeState: (componentId) => {
        return get().codeStates[componentId];
      },

      // Get or create - has side effects, use for initialization
      getOrCreateCodeState: (componentId) => {
        const existing = get().codeStates[componentId];
        if (existing) return existing;

        // Create default state with global default format
        const newState = createDefaultComponentCodeState(componentId);
        newState.selectedFormat = get().defaultFormat;

        set((prev) => ({
          codeStates: {
            ...prev.codeStates,
            [componentId]: newState,
          },
        }));

        return newState;
      },

      setSelectedFormat: (componentId, format) => {
        set((prev) => {
          const currentState = prev.codeStates[componentId] ||
            createDefaultComponentCodeState(componentId);

          return {
            codeStates: {
              ...prev.codeStates,
              [componentId]: {
                ...currentState,
                selectedFormat: format,
              },
            },
          };
        });
      },

      setDefaultFormat: (format) => {
        set({ defaultFormat: format });
      },

      saveCodeOverride: (componentId, format, code, noteContent, originalCode, changeType) => {
        set((prev) => {
          const currentState = prev.codeStates[componentId] ||
            createDefaultComponentCodeState(componentId);

          const existingOverride = currentState.overrides[format];

          const note = createCodeEditNote(
            noteContent,
            format,
            'User',
            changeType,
            existingOverride?.code || originalCode
          );

          const newOverride = existingOverride
            ? {
                ...existingOverride,
                code,
                updatedAt: new Date().toISOString(),
                notes: [...existingOverride.notes, note],
              }
            : createCodeOverride(format, code, originalCode, note);

          return {
            codeStates: {
              ...prev.codeStates,
              [componentId]: {
                ...currentState,
                overrides: {
                  ...currentState.overrides,
                  [format]: newOverride,
                },
              },
            },
          };
        });
      },

      addNoteToOverride: (componentId, format, noteContent, changeType) => {
        set((prev) => {
          const currentState = prev.codeStates[componentId];
          if (!currentState) return prev;

          const existingOverride = currentState.overrides[format];
          if (!existingOverride) return prev;

          const note = createCodeEditNote(
            noteContent,
            format,
            'User',
            changeType,
            existingOverride.code
          );

          return {
            codeStates: {
              ...prev.codeStates,
              [componentId]: {
                ...currentState,
                overrides: {
                  ...currentState.overrides,
                  [format]: {
                    ...existingOverride,
                    notes: [...existingOverride.notes, note],
                    updatedAt: new Date().toISOString(),
                  },
                },
              },
            },
          };
        });
      },

      revertToGenerated: (componentId, format) => {
        set((prev) => {
          const currentState = prev.codeStates[componentId];
          if (!currentState) return prev;

          const { [format]: _, ...remainingOverrides } = currentState.overrides;

          return {
            codeStates: {
              ...prev.codeStates,
              [componentId]: {
                ...currentState,
                overrides: remainingOverrides,
              },
            },
          };
        });
      },

      revertAllOverrides: (componentId) => {
        set((prev) => {
          const currentState = prev.codeStates[componentId];
          if (!currentState) return prev;

          return {
            codeStates: {
              ...prev.codeStates,
              [componentId]: {
                ...currentState,
                overrides: {},
              },
            },
          };
        });
      },

      setInspectingComponent: (componentId) => {
        set({ inspectingComponentId: componentId });
      },

      getAllNotes: (componentId) => {
        const state = get().codeStates[componentId];
        if (!state) return [];
        return getAllNotesForComponent(state.overrides);
      },

      getComponentsWithOverrides: () => {
        const { codeStates } = get();
        return Object.entries(codeStates)
          .filter(([, state]) =>
            Object.values(state.overrides).some(o => o?.isLocked)
          )
          .map(([id]) => id);
      },

      getAllNotesGlobal: () => {
        const { codeStates } = get();
        return Object.entries(codeStates)
          .map(([componentId, state]) => ({
            componentId,
            notes: getAllNotesForComponent(state.overrides),
          }))
          .filter(({ notes }) => notes.length > 0);
      },

      clearAllCodeStates: () => {
        set({ codeStates: {} });
      },

      importCodeStates: (states) => {
        set((prev) => ({
          codeStates: {
            ...prev.codeStates,
            ...states,
          },
        }));
      },

      bulkSetFormat: (componentIds, format) => {
        set((prev) => {
          const updates = {};

          for (const id of componentIds) {
            const currentState = prev.codeStates[id] ||
              createDefaultComponentCodeState(id);
            updates[id] = {
              ...currentState,
              selectedFormat: format,
            };
          }

          return {
            codeStates: {
              ...prev.codeStates,
              ...updates,
            },
          };
        });
      },
    }),
    {
      name: 'ums-component-code-storage',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          console.log('[Store Migration] Clearing old positional override keys (v1 -> v2)');
          return {
            ...persistedState,
            codeStates: {},
          };
        }
        return persistedState;
      },
    }
  )
);

/**
 * Hook to get code state for a specific component (may be undefined)
 */
export function useComponentCodeState(componentId) {
  return useComponentCodeStore((state) => state.codeStates[componentId]);
}

/**
 * Hook to get all notes for a component
 */
export function useComponentNotes(componentId) {
  return useComponentCodeStore((state) => state.getAllNotes(componentId));
}

/**
 * Hook to check if a component has overrides
 */
export function useHasCodeOverride(componentId, format) {
  return useComponentCodeStore((state) => {
    const codeState = state.codeStates[componentId];
    if (!codeState) return false;

    if (format) {
      return !!codeState.overrides[format]?.isLocked;
    }

    return Object.values(codeState.overrides).some(o => o?.isLocked);
  });
}

/**
 * Hook to get the default format
 */
export function useDefaultCodeFormat() {
  return useComponentCodeStore((state) => state.defaultFormat);
}

/**
 * Hook to get components with overrides count
 */
export function useOverrideCount() {
  return useComponentCodeStore((state) =>
    state.getComponentsWithOverrides().length
  );
}
