/**
 * Component Library Store
 *
 * Zustand store for managing the reusable component library.
 * Fetches data from API, keeps UI state in memory.
 */

import { create } from 'zustand';
import * as componentApi from '../api/components.js';

export const useComponentLibraryStore = create((set, get) => ({
  // Data (fetched from API)
  components: [],
  initialized: false,
  isLoading: false,
  error: null,

  // UI State
  selectedComponentId: null,
  filters: {
    category: null,
    status: null,
    search: '',
    showArchived: false,
  },
  editingComponentId: null,
  importMatcherState: null,

  // Merge mode state
  mergeMode: false,
  selectedForMerge: new Set(),

  // Fetch all components from API
  fetchComponents: async () => {
    set({ isLoading: true, error: null });
    try {
      const components = await componentApi.getComponents();
      set({ components, initialized: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch components:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch a single component with full details
  fetchComponent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const component = await componentApi.getComponent(id);
      // Update the component in the local list
      set((state) => ({
        components: state.components.map((c) => (c.id === id ? component : c)),
        isLoading: false,
      }));
      return component;
    } catch (error) {
      console.error('Failed to fetch component:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Create a new atomic component
  createAtomicComponent: async (componentData) => {
    set({ isLoading: true, error: null });
    try {
      const component = await componentApi.createAtomicComponent(componentData);
      set((state) => ({
        components: [...state.components, component],
        selectedComponentId: component.id,
        isLoading: false,
      }));
      return component;
    } catch (error) {
      console.error('Failed to create component:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Create a new composite component
  createCompositeComponent: async (componentData) => {
    set({ isLoading: true, error: null });
    try {
      const component = await componentApi.createCompositeComponent(componentData);
      set((state) => ({
        components: [...state.components, component],
        selectedComponentId: component.id,
        isLoading: false,
      }));
      return component;
    } catch (error) {
      console.error('Failed to create composite component:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Update a component
  updateComponent: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const component = await componentApi.updateComponent(id, updates);
      set((state) => ({
        components: state.components.map((c) => (c.id === id ? component : c)),
        isLoading: false,
      }));
      return component;
    } catch (error) {
      console.error('Failed to update component:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Delete a component
  deleteComponent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await componentApi.deleteComponent(id);
      set((state) => ({
        components: state.components.filter((c) => c.id !== id),
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        isLoading: false,
      }));
      return true;
    } catch (error) {
      console.error('Failed to delete component:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Approve a component
  approveComponent: async (id, approvedBy) => {
    try {
      const component = await componentApi.approveComponent(id, approvedBy);
      set((state) => ({
        components: state.components.map((c) => (c.id === id ? component : c)),
      }));
      return component;
    } catch (error) {
      console.error('Failed to approve component:', error);
      return null;
    }
  },

  // Find matching components
  findMatches: async (description) => {
    try {
      return await componentApi.findMatches(description);
    } catch (error) {
      console.error('Failed to find matches:', error);
      return [];
    }
  },

  // UI Actions
  setSelectedComponent: (id) => set({ selectedComponentId: id }),

  setFilters: (updates) => set((state) => ({
    filters: { ...state.filters, ...updates },
  })),

  setEditingComponent: (id) => set({ editingComponentId: id }),

  setImportMatcherState: (importMatcherState) => set({ importMatcherState }),

  // Merge mode actions
  setMergeMode: (enabled) => {
    set({ mergeMode: enabled });
    if (!enabled) {
      set({ selectedForMerge: new Set() });
    }
  },

  toggleMergeSelection: (componentId) => {
    const current = get().selectedForMerge;
    const newSet = new Set(current);
    if (newSet.has(componentId)) {
      newSet.delete(componentId);
    } else {
      newSet.add(componentId);
    }
    set({ selectedForMerge: newSet });
  },

  clearMergeSelection: () => set({ selectedForMerge: new Set() }),

  // Initialize from API (call on mount)
  initialize: async () => {
    if (get().initialized) return;
    await get().fetchComponents();
  },

  // Computed / Selectors
  getComponent: (id) => {
    return get().components.find((c) => c.id === id) || null;
  },

  getFilteredComponents: () => {
    const { components, filters } = get();
    let filtered = [...components];

    if (filters.category) {
      filtered = filtered.filter((c) => c.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }

    if (!filters.showArchived) {
      filtered = filtered.filter((c) => c.status !== 'archived');
    }

    return filtered;
  },

  getComponentsByCategory: (category) => {
    return get().components.filter((c) => c.category === category);
  },

  getComponentsByStatus: (status) => {
    return get().components.filter((c) => c.status === status);
  },

  getCategoryCounts: () => {
    const counts = {};
    get().components.forEach((c) => {
      const cat = c.category || 'uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  },
}));
