import { useEffect } from 'react';
import { Plus, Search, Loader } from 'lucide-react';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore.js';

export function LibraryBrowser() {
  const {
    components,
    isLoading,
    error,
    filters,
    setFilters,
    selectedComponentId,
    setSelectedComponent,
    initialize,
    getFilteredComponents,
    getCategoryCounts,
  } = useComponentLibraryStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filteredComponents = getFilteredComponents();
  const categoryCounts = getCategoryCounts();
  const categories = Object.keys(categoryCounts);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar Filters */}
      <div className="w-64 border-r border-[var(--border)] overflow-auto">
        <div className="p-4">
          <h2 className="font-semibold text-[var(--text)] mb-4">Categories</h2>
          <button
            onClick={() => setFilters({ category: null })}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
              !filters.category ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'hover:bg-[var(--bg-secondary)]'
            }`}
          >
            All ({components.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilters({ category: cat })}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${
                filters.category === cat ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search components..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)]">
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-[var(--danger-light)] border border-[var(--danger-border)] rounded-lg">
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          <div className="grid gap-3">
            {filteredComponents.map((component) => (
              <button
                key={component.id}
                onClick={() => setSelectedComponent(component.id)}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedComponentId === component.id
                    ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--text)]">{component.name}</h3>
                    {component.description && (
                      <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                        {component.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    component.status === 'approved'
                      ? 'bg-[var(--success-light)] text-[var(--success)]'
                      : 'bg-[var(--draft-bg)] text-[var(--draft)]'
                  }`}>
                    {component.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] rounded">
                    {component.category}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {component.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
