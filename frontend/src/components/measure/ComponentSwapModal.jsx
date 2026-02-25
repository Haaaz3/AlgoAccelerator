import { useState, useEffect } from 'react';
import { X, Search, ArrowLeftRight, CheckCircle, Loader } from 'lucide-react';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore.js';

// ============================================================================
// Component Swap Modal
// ============================================================================

export function ComponentSwapModal({ currentComponent, onSwap, onClose }) {
  const {
    components,
    isLoading,
    initialize,
    getFilteredComponents,
    getCategoryCounts,
    setFilters,
    filters,
  } = useComponentLibraryStore();

  const [selectedComponent, setSelectedComponent] = useState(null);
  const [localSearch, setLocalSearch] = useState('');

  // Initialize component library on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Update store filters when local search changes
  useEffect(() => {
    setFilters({ search: localSearch });
  }, [localSearch, setFilters]);

  const filteredComponents = getFilteredComponents();
  const categoryCounts = getCategoryCounts();
  const categories = Object.keys(categoryCounts);

  const handleConfirmSwap = () => {
    if (!selectedComponent) return;
    onSwap(selectedComponent);
  };

  // Filter by same category as current component by default, but allow switching
  const [categoryFilter, setCategoryFilter] = useState(null);

  const displayComponents = categoryFilter
    ? filteredComponents.filter(c => c.category === categoryFilter)
    : filteredComponents;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[var(--accent)]" />
              Swap Component
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Select a component from the library to replace the current one
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Component Info */}
        <div className="px-6 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Currently selected:</p>
          <div className="flex items-center gap-3">
            <span className={`
              px-2 py-0.5 text-[10px] font-medium rounded uppercase
              ${currentComponent.type === 'procedure' ? 'bg-purple-100 text-purple-700' :
                currentComponent.type === 'diagnosis' ? 'bg-red-100 text-red-700' :
                currentComponent.type === 'encounter' ? 'bg-[var(--success-light)] text-[var(--success)]' :
                currentComponent.type === 'observation' ? 'bg-cyan-100 text-cyan-700' :
                currentComponent.type === 'medication' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'}
            `}>
              {currentComponent.type}
            </span>
            <span className="text-sm text-[var(--text)] font-medium">
              {currentComponent.description}
            </span>
            {currentComponent.valueSet && (
              <span className="text-xs text-[var(--text-dim)]">
                ({currentComponent.valueSet.name})
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-[var(--border)] overflow-auto">
            <div className="p-3">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                Categories
              </p>
              <button
                onClick={() => setCategoryFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${
                  !categoryFilter ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                All ({components.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm capitalize ${
                    categoryFilter === cat ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}
                >
                  {cat} ({categoryCounts[cat]})
                </button>
              ))}
            </div>
          </div>

          {/* Component List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search components by name or description..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Component Grid */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : displayComponents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--text-muted)]">No components found</p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">Try adjusting your search or category filter</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {displayComponents.map((component) => (
                    <button
                      key={component.id}
                      onClick={() => setSelectedComponent(component)}
                      className={`p-3 text-left border rounded-lg transition-all ${
                        selectedComponent?.id === component.id
                          ? 'border-[var(--accent)] bg-[var(--accent-light)] ring-2 ring-[var(--accent)]/20'
                          : 'border-[var(--border)] hover:border-[var(--text-dim)] bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`
                              px-1.5 py-0.5 text-[10px] font-medium rounded uppercase
                              ${component.category === 'procedure' ? 'bg-purple-100 text-purple-700' :
                                component.category === 'diagnosis' ? 'bg-red-100 text-red-700' :
                                component.category === 'encounter' ? 'bg-[var(--success-light)] text-[var(--success)]' :
                                component.category === 'observation' ? 'bg-cyan-100 text-cyan-700' :
                                component.category === 'medication' ? 'bg-orange-100 text-orange-700' :
                                component.category === 'demographic' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'}
                            `}>
                              {component.category || component.type}
                            </span>
                            <h3 className="font-medium text-sm text-[var(--text)] truncate">
                              {component.name}
                            </h3>
                          </div>
                          {component.description && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                              {component.description}
                            </p>
                          )}
                          {component.valueSet && (
                            <p className="text-[10px] text-[var(--text-dim)] mt-1">
                              Value Set: {component.valueSet.name}
                              {component.valueSet.codes?.length ? ` (${component.valueSet.codes.length} codes)` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                            component.status === 'approved'
                              ? 'bg-[var(--success-light)] text-[var(--success)]'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {component.status}
                          </span>
                          {selectedComponent?.id === component.id && (
                            <CheckCircle className="w-4 h-4 text-[var(--accent)]" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg-tertiary)]">
          <div className="text-sm text-[var(--text-muted)]">
            {selectedComponent ? (
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Will replace with: <span className="font-medium text-[var(--text)]">{selectedComponent.name}</span>
              </span>
            ) : (
              'Select a component to swap'
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSwap}
              disabled={!selectedComponent}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                selectedComponent
                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-dim)] cursor-not-allowed'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap Component
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComponentSwapModal;
