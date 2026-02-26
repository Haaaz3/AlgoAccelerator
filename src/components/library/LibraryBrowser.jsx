import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Layers,
  Package,
  GitBranch,
  Tag,
  CheckCircle,
  Check,
  Clock,
  FileEdit,
  Archive,
  ChevronDown,
  X,
  ArrowUp,
  ArrowDown,
  Building2,
  GitMerge,
  AlertTriangle,
  Download,
  Loader2,
} from 'lucide-react';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore';
import { useMeasureStore } from '../../stores/measureStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getComplexityColor, getComplexityDots } from '../../services/complexityCalculator';
import { fetchMultipleValueSets } from '../../services/vsacService';
import { ComponentDetail } from './ComponentDetail';
import ComponentEditor from './ComponentEditor';
import CreateComponentWizard from './CreateComponentWizard';
import MergeComponentsWizard from './MergeComponentsWizard';
import { ErrorBoundary } from '../shared/ErrorBoundary';

const STATUS_OPTIONS                                             = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
];

const COMPLEXITY_OPTIONS                                              = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SORT_OPTIONS                                               = [
  { value: 'name', label: 'Name' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'usage', label: 'Usage Count' },
  { value: 'status', label: 'Status' },
  { value: 'date', label: 'Date Added' },
];

const PROGRAM_OPTIONS                                             = [
  { value: 'MIPS_CQM', label: 'MIPS CQM' },
  { value: 'eCQM', label: 'eCQM' },
  { value: 'HEDIS', label: 'HEDIS' },
  { value: 'QOF', label: 'QOF' },
  { value: 'Registry', label: 'Registry' },
  { value: 'Custom', label: 'Custom' },
];

function getStatusBadge(status                ) {
  switch (status) {
    case 'approved':
      return {
        color: 'bg-[var(--success-light)] text-[var(--success)]',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Approved',
      };
    case 'pending_review':
      return {
        color: 'bg-[var(--warning-light)] text-[var(--warning)]',
        icon: <Clock className="w-3 h-3" />,
        label: 'Pending',
      };
    case 'draft':
      return {
        color: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
        icon: <FileEdit className="w-3 h-3" />,
        label: 'Draft',
      };
    case 'archived':
      return {
        color: 'bg-[var(--bg-tertiary)] text-[var(--text-dim)]',
        icon: <Archive className="w-3 h-3" />,
        label: 'Archived',
      };
    default:
      return {
        color: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
        icon: null,
        label: status,
      };
  }
}

export function LibraryBrowser() {
  const {
    components,
    selectedComponentId,
    editingComponentId,
    filters,
    setSelectedComponent,
    setEditingComponent,
    setFilters,
    getFilteredComponents,
    initializeWithSampleData,
    rebuildUsageIndex,
    linkMeasureComponents,
    updateComponent,
    selectedCategory,
    setSelectedCategory,
  } = useComponentLibraryStore();
  const { measures, updateMeasure } = useMeasureStore();
  const { vsacApiKey } = useSettingsStore();

  // Bulk VSAC fetch state
  const [bulkFetchLoading, setBulkFetchLoading] = useState(false);
  const [bulkFetchProgress, setBulkFetchProgress] = useState({ current: 0, total: 0, name: '' });
  const [bulkFetchResult, setBulkFetchResult] = useState                                                          (null);

  // Seed sample data on mount if store is empty, then re-link and rebuild usage index
  useEffect(() => {
    if (components.length === 0) {
      initializeWithSampleData();
    }

    // Re-link measures whose data elements are missing libraryComponentIds
    // This covers page refresh where backend doesn't return libraryComponentId
    if (measures.length > 0 && components.length > 0) {
      let anyLinked = false;

      for (const measure of measures) {
        // Check if this measure has any unlinked data elements
        const hasUnlinked = measure.populations.some(pop => {
          if (!pop.criteria) return false;
          const checkNode = (node) => {
            if (node.operator && node.children) {
              return node.children.some(checkNode);
            }
            // Data element without libraryComponentId AND with a value set
            return !node.libraryComponentId && (node.valueSet?.oid || node.valueSet?.name || node.valueSet?.codes?.length > 0);
          };
          return checkNode(pop.criteria);
        });

        if (hasUnlinked) {
          const linkMap = linkMeasureComponents(
            measure.metadata?.measureId || measure.id,
            measure.populations,
          );

          if (Object.keys(linkMap).length > 0) {
            anyLinked = true;
            // Stamp the links onto the measure's populations
            const stampLinks = (node) => {
              if (!node) return node;
              if (node.id && linkMap[node.id] && linkMap[node.id] !== '__ZERO_CODES__') {
                node = { ...node, libraryComponentId: linkMap[node.id] };
              }
              if (node.children) {
                node = { ...node, children: node.children.map(stampLinks) };
              }
              if (node.criteria) {
                node = { ...node, criteria: stampLinks(node.criteria) };
              }
              return node;
            };

            const linkedPopulations = measure.populations.map(pop => ({
              ...pop,
              criteria: pop.criteria ? stampLinks(pop.criteria) : pop.criteria,
            }));

            // Update the measure with linked populations
            updateMeasure(measure.id, { populations: linkedPopulations });
          }
        }
      }

      // Rebuild usage index with potentially updated measures
      if (anyLinked) {
        // Re-fetch measures after linking
        setTimeout(() => {
          const updatedMeasures = useMeasureStore.getState().measures;
          rebuildUsageIndex(updatedMeasures);
        }, 50);
      } else {
        rebuildUsageIndex(measures);
      }
    }
  }, [measures.length, components.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync category selection into filters
  useEffect(() => {
    setFilters({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
    });
  }, [selectedCategory, setFilters]);

  const filteredComponents = useMemo(() => getFilteredComponents(), [getFilteredComponents]);

  const handleSearchChange = (e                                     ) => {
    setFilters({ searchQuery: e.target.value });
  };

  const handleStatusToggle = (status                ) => {
    const current = filters.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ statuses: next.length > 0 ? next : undefined });
  };

  const handleComplexityToggle = (level                 ) => {
    const current = filters.complexities ?? [];
    const next = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    setFilters({ complexities: next.length > 0 ? next : undefined });
  };

  const _handleUsageSortToggle = () => {
    const current = filters.usageSort;
    // Cycle: none → desc → asc → none
    const next = current === undefined ? 'desc' : current === 'desc' ? 'asc' : undefined;
    setFilters({ usageSort: next });
  };

  const handleSortByChange = (sortBy                  ) => {
    setFilters({ sortBy, usageSort: undefined }); // Clear legacy usageSort when using new sort
  };

  const handleSortDirectionToggle = () => {
    const current = filters.sortDirection ?? 'asc';
    setFilters({ sortDirection: current === 'asc' ? 'desc' : 'asc' });
  };

  const handleProgramToggle = (program                ) => {
    const current = filters.programs ?? [];
    const next = current.includes(program)
      ? current.filter((p) => p !== program)
      : [...current, program];
    setFilters({ programs: next.length > 0 ? next : undefined });
  };

  // Compute available programs from actual measures
  const availablePrograms = useMemo(() => {
    const programs = new Set                ();
    measures.forEach((m) => {
      if (m.metadata.program) {
        programs.add(m.metadata.program                  );
      }
    });
    return Array.from(programs).sort();
  }, [measures]);

  // Apply program filter locally since it requires measure lookup
  const programFilteredComponents = useMemo(() => {
    if (!filters.programs || filters.programs.length === 0) {
      return filteredComponents;
    }
    const measureMap = new Map(measures.map(m => [m.id, m]));
    return filteredComponents.filter((c) => {
      const componentPrograms = c.usage.measureIds
        .map(id => measureMap.get(id)?.metadata?.program)
        .filter(Boolean);
      return componentPrograms.some(prog => filters.programs .includes(prog                  ));
    });
  }, [filteredComponents, filters.programs, measures]);

  const handleNewComponent = () => {
    setEditingComponent('new');
  };

  const handleCardClick = (componentId        ) => {
    setSelectedComponent(componentId);
  };

  const handleCloseDetail = () => {
    setSelectedComponent(null);
  };

  const handleCloseEditor = () => {
    setEditingComponent(null);
  };

  // Bulk fetch missing codes from VSAC
  const handleBulkFetchCodes = async () => {
    if (!vsacApiKey) {
      setBulkFetchResult({ success: 0, failed: 0, message: 'Configure your VSAC API key in Settings first.' });
      return;
    }

    // Find all atomic components with OID but no codes, excluding demographics
    const needsFetch = components.filter(c => {
      if (c.type !== 'atomic') return false;
      if (c.metadata?.category === 'demographics') return false;
      if (c.genderValue || c.thresholds?.ageMin != null) return false;
      const oid = c.valueSet?.oid;
      if (!oid || oid === 'N/A' || !/^\d+\.\d+/.test(oid)) return false;
      const codes = c.valueSet?.codes || [];
      return codes.length === 0;
    });

    if (needsFetch.length === 0) {
      setBulkFetchResult({ success: 0, failed: 0, message: 'All components already have codes populated.' });
      return;
    }

    setBulkFetchLoading(true);
    setBulkFetchProgress({ current: 0, total: needsFetch.length, name: '' });
    setBulkFetchResult(null);

    try {
      const valueSets = needsFetch.map(c => ({
        oid: c.valueSet.oid,
        name: c.valueSet.name || c.name,
        componentId: c.id,
      }));

      const results = await fetchMultipleValueSets(
        valueSets,
        vsacApiKey,
        (current, total, name) => setBulkFetchProgress({ current, total, name })
      );

      let successCount = 0;
      let failedCount = 0;

      for (const c of needsFetch) {
        const result = results.get(c.valueSet.oid);
        if (result && result.codes && result.codes.length > 0) {
          // Update the component with fetched codes
          updateComponent(c.id, {
            valueSet: {
              ...c.valueSet,
              codes: result.codes,
            },
          });
          successCount++;
        } else {
          failedCount++;
        }
      }

      setBulkFetchResult({
        success: successCount,
        failed: failedCount,
        message: `Populated codes for ${successCount} components${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });
    } catch (err) {
      setBulkFetchResult({
        success: 0,
        failed: needsFetch.length,
        message: err instanceof Error ? err.message : 'Failed to fetch codes',
      });
    } finally {
      setBulkFetchLoading(false);
    }
  };

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState([]);
  const [showMergeWizard, setShowMergeWizard] = useState(false);

  const handleMergeComponents = () => {
    setMergeMode(true);
    setMergeSelectedIds([]);
  };

  const handleCancelMergeMode = () => {
    setMergeMode(false);
    setMergeSelectedIds([]);
  };

  const handleToggleMergeSelect = (componentId) => {
    setMergeSelectedIds(prev =>
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleProceedToMerge = () => {
    if (mergeSelectedIds.length >= 2) {
      setShowMergeWizard(true);
    }
  };

  const handleCloseMergeWizard = () => {
    setShowMergeWizard(false);
    setMergeMode(false);
    setMergeSelectedIds([]);
  };

  // Resizable panel state
  const [detailPanelWidth, setDetailPanelWidth] = useState(420);
  const isResizing = useRef(false);
  const containerRef = useRef                (null);

  const handleResizeStart = useCallback((e                  ) => {
    isResizing.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e            ) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      setDetailPanelWidth(Math.min(Math.max(newWidth, 300), 600));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--accent)]" />
              Component Library
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Reusable measure logic blocks
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mergeMode ? (
              <button
                onClick={handleCancelMergeMode}
                className="h-10 px-4 bg-[var(--bg-tertiary)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2 border border-[var(--border)]"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={handleBulkFetchCodes}
                  disabled={bulkFetchLoading}
                  className="h-10 px-4 bg-[var(--bg-tertiary)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2 border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!vsacApiKey ? 'Configure VSAC API key in Settings' : 'Fetch codes for all components with OIDs'}
                >
                  {bulkFetchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {bulkFetchLoading
                    ? `Fetching ${bulkFetchProgress.current} of ${bulkFetchProgress.total}...`
                    : 'Fetch All Codes'}
                </button>
                <button
                  onClick={handleMergeComponents}
                  className="h-10 px-4 bg-[var(--bg-tertiary)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2 border border-[var(--border)]"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge
                </button>
                <button
                  onClick={handleNewComponent}
                  className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Component
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Fetch Result Banner */}
      {bulkFetchResult && (
        <div className={`px-6 py-3 flex items-center justify-between ${
          bulkFetchResult.failed > 0 && bulkFetchResult.success === 0
            ? 'bg-red-500/10 border-b border-red-500/20'
            : bulkFetchResult.failed > 0
              ? 'bg-amber-500/10 border-b border-amber-500/20'
              : 'bg-green-500/10 border-b border-green-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {bulkFetchResult.failed > 0 && bulkFetchResult.success === 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : bulkFetchResult.failed > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
            <span className={`text-sm font-medium ${
              bulkFetchResult.failed > 0 && bulkFetchResult.success === 0
                ? 'text-red-400'
                : bulkFetchResult.failed > 0
                  ? 'text-amber-400'
                  : 'text-green-400'
            }`}>
              {bulkFetchResult.message}
            </span>
          </div>
          <button
            onClick={() => setBulkFetchResult(null)}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="flex-shrink-0 px-6 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
              <input
                type="text"
                placeholder="Search components..."
                value={filters.searchQuery ?? ''}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Status Multiselect */}
            <MultiSelectDropdown
              icon={<Filter className="w-3.5 h-3.5" />}
              label="Status"
              options={STATUS_OPTIONS}
              selected={filters.statuses ?? []}
              onToggle={handleStatusToggle}
            />

            {/* Complexity Multiselect */}
            <MultiSelectDropdown
              icon={null}
              label="Complexity"
              options={COMPLEXITY_OPTIONS}
              selected={filters.complexities ?? []}
              onToggle={handleComplexityToggle}
            />

            {/* Program/Catalogue Multiselect */}
            {availablePrograms.length > 0 && (
              <MultiSelectDropdown
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Program"
                options={PROGRAM_OPTIONS.filter(p => availablePrograms.includes(p.value))}
                selected={filters.programs ?? []}
                onToggle={handleProgramToggle}
              />
            )}

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-dim)]">Sort:</span>
              <select
                value={filters.sortBy ?? 'name'}
                onChange={(e) => handleSortByChange(e.target.value                    )}
                className="px-2 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSortDirectionToggle}
                className="p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                title={filters.sortDirection === 'desc' ? 'Descending' : 'Ascending'}
              >
                {filters.sortDirection === 'desc' ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Result Count */}
            <span className="text-xs text-[var(--text-dim)] ml-auto">
              {programFilteredComponents.length} component{programFilteredComponents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Component Grid + Detail Panel */}
          <div ref={containerRef} className="flex-1 flex overflow-hidden">
            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {programFilteredComponents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programFilteredComponents.map((component) => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      isSelected={selectedComponentId === component.id}
                      onClick={() => mergeMode ? handleToggleMergeSelect(component.id) : handleCardClick(component.id)}
                      mergeMode={mergeMode}
                      isMergeSelected={mergeSelectedIds.includes(component.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Package className="w-16 h-16 text-[var(--text-dim)] opacity-30 mb-4" />
                  <p className="text-[var(--text-muted)] font-medium">
                    No components found
                  </p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">
                    {components.length > 0
                      ? 'Try adjusting your search or filters'
                      : 'Create a new component to get started'}
                  </p>
                  {components.length === 0 && (
                    <button
                      onClick={handleNewComponent}
                      className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Component
                    </button>
                  )}
                  {components.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setFilters({ searchQuery: '', statuses: undefined, complexities: undefined, usageSort: undefined, category: undefined, programs: undefined, sortBy: undefined, sortDirection: undefined });
                      }}
                      className="mt-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detail Panel (slide in from right) */}
            {selectedComponentId && (
              <>
                {/* Resize handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className="w-1.5 bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent)] cursor-col-resize transition-colors flex-shrink-0"
                />
                <div style={{ width: detailPanelWidth }} className="flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
                  <ErrorBoundary fallbackName="Component Detail">
                    <ComponentDetail
                      componentId={selectedComponentId}
                      onClose={handleCloseDetail}
                      onEdit={(id) => setEditingComponent(id)}
                    />
                  </ErrorBoundary>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal - use Wizard for new, Editor for existing */}
      {editingComponentId === 'new' && (
        <ErrorBoundary fallbackName="Create Component Wizard">
          <CreateComponentWizard
            onSave={handleCloseEditor}
            onClose={handleCloseEditor}
          />
        </ErrorBoundary>
      )}
      {editingComponentId && editingComponentId !== 'new' && (
        <ErrorBoundary fallbackName="Component Editor">
          <ComponentEditor
            componentId={editingComponentId}
            onSave={handleCloseEditor}
            onClose={handleCloseEditor}
          />
        </ErrorBoundary>
      )}

      {/* Merge Mode Floating Action Bar */}
      {mergeMode && !showMergeWizard && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-[var(--bg-elevated,var(--bg-secondary))] border border-[var(--border)] rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-[var(--text)]">
                {mergeSelectedIds.length === 0
                  ? 'Select components to merge'
                  : `${mergeSelectedIds.length} component${mergeSelectedIds.length !== 1 ? 's' : ''} selected`}
              </span>
            </div>
            {mergeSelectedIds.length > 0 && mergeSelectedIds.length < 2 && (
              <span className="text-xs text-[var(--text-muted)]">Select at least 2</span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelMergeMode}
                className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToMerge}
                disabled={mergeSelectedIds.length < 2}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mergeSelectedIds.length >= 2
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'
                    : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Components Wizard */}
      {showMergeWizard && (
        <ErrorBoundary fallbackName="Merge Components Wizard">
          <MergeComponentsWizard
            preSelectedIds={mergeSelectedIds}
            startAtStep={1}
            onSave={handleCloseMergeWizard}
            onClose={handleCloseMergeWizard}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComponentCard
// ---------------------------------------------------------------------------

function ComponentCard({
  component,
  isSelected,
  onClick,
  mergeMode = false,
  isMergeSelected = false,
}) {
  const statusBadge = getStatusBadge(component.versionInfo.status);
  const complexityColor = getComplexityColor(component.complexity.level);
  const complexityDots = getComplexityDots(component.complexity.level);
  const isComposite = component.type === 'composite';
  const isArchived = component.versionInfo.status === 'archived';

  // When in merge mode, use a flex layout with checkbox in left gutter
  if (mergeMode) {
    return (
      <div
        onClick={onClick}
        className="flex gap-2.5 cursor-pointer"
        style={{ alignItems: 'stretch' }}
      >
        {/* LEFT GUTTER — checkbox only, vertically centered */}
        <div className="flex items-center flex-shrink-0 pt-1">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
              isMergeSelected
                ? 'bg-purple-600 border-2 border-purple-600'
                : 'bg-[var(--bg-primary)] border-2 border-[var(--border)]'
            }`}
          >
            {isMergeSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>

        {/* TILE — full card, no checkbox inside */}
        <div
          className={`flex-1 border rounded-xl p-4 transition-all group ${
            isArchived
              ? 'bg-[var(--bg-secondary)] border-[var(--border)] opacity-50 grayscale'
              : isMergeSelected
                ? 'bg-purple-500/10 border-purple-500'
                : 'bg-[var(--bg-elevated,var(--bg))] border-[var(--border)] hover:border-purple-500/40 hover:shadow-md'
          }`}
        >
          {/* Header: Name + Type Badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-purple-400 transition-colors">
              {component.name}
            </h3>
            {isComposite && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-purple-500/10 text-purple-400">
                <GitBranch className="w-3 h-3" />
                Composite
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 min-h-[2rem]">
            {component.description || 'No description provided'}
          </p>

          {/* Complexity */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text-dim)]">Complexity</span>
            <span className={`text-sm ${complexityColor}`} title={`Score: ${component.complexity.score}`}>
              {complexityDots}
            </span>
            <span className={`text-xs font-medium capitalize ${complexityColor}`}>
              {component.complexity.level}
            </span>
          </div>

          {/* Due Date */}
          {component.dueDateDays != null && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] mb-3">
              <Clock className="w-3 h-3" />
              <span>T-{component.dueDateDays}</span>
              <span className="text-[var(--text-dim)]/60">
                ({component.dueDateDays === 365 ? 'Annual'
                  : component.dueDateDays % 365 === 0 ? `${component.dueDateDays / 365}yr`
                  : `${component.dueDateDays}d`})
              </span>
            </div>
          )}

          {/* Missing codes warning */}
          {component.type === 'atomic' &&
            component.metadata?.category !== 'demographics' &&
            (!component.valueSet?.codes || component.valueSet.codes.length === 0) && (
            <div className="flex items-center gap-1 text-xs text-amber-400 mb-3">
              <AlertTriangle className="w-3 h-3" />
              <span>Missing codes</span>
            </div>
          )}

          {/* Footer: Usage + Status */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-dim)] flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Used in {component.usage.usageCount} measure{component.usage.usageCount !== 1 ? 's' : ''}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge.color}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Normal mode (non-merge)
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer transition-all group relative ${
        isArchived
          ? 'bg-[var(--bg-secondary)] border-[var(--border)] opacity-50 grayscale'
          : isSelected
            ? 'bg-[var(--bg-elevated,var(--bg))] border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
            : 'bg-[var(--bg-elevated,var(--bg))] border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-md'
      }`}
    >
      {/* Header: Name + Type Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
          {component.name}
        </h3>
        {isComposite && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-purple-500/10 text-purple-400">
            <GitBranch className="w-3 h-3" />
            Composite
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 min-h-[2rem]">
        {component.description || 'No description provided'}
      </p>

      {/* Complexity */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--text-dim)]">Complexity</span>
        <span className={`text-sm ${complexityColor}`} title={`Score: ${component.complexity.score}`}>
          {complexityDots}
        </span>
        <span className={`text-xs font-medium capitalize ${complexityColor}`}>
          {component.complexity.level}
        </span>
      </div>

      {/* Due Date */}
      {component.dueDateDays != null && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] mb-3">
          <Clock className="w-3 h-3" />
          <span>T-{component.dueDateDays}</span>
          <span className="text-[var(--text-dim)]/60">
            ({component.dueDateDays === 365 ? 'Annual'
              : component.dueDateDays % 365 === 0 ? `${component.dueDateDays / 365}yr`
              : `${component.dueDateDays}d`})
          </span>
        </div>
      )}

      {/* Missing codes warning */}
      {component.type === 'atomic' &&
        component.metadata?.category !== 'demographics' &&
        (!component.valueSet?.codes || component.valueSet.codes.length === 0) && (
        <div className="flex items-center gap-1 text-xs text-amber-400 mb-3">
          <AlertTriangle className="w-3 h-3" />
          <span>Missing codes</span>
        </div>
      )}

      {/* Footer: Usage + Status */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--text-dim)] flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Used in {component.usage.usageCount} measure{component.usage.usageCount !== 1 ? 's' : ''}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge.color}`}
        >
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiSelectDropdown
// ---------------------------------------------------------------------------

function MultiSelectDropdown                  ({
  icon,
  label,
  options,
  selected,
  onToggle,
}   
                        
                
                                         
                
                               
 ) {
  const [open, setOpen] = useState(false);
  const ref = useRef                (null);

  // Close on outside click
  useEffect(() => {
    const handler = (e            ) => {
      if (ref.current && !ref.current.contains(e.target        )) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasSelection = selected.length > 0;
  const displayLabel =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? label
        : `${selected.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors focus:outline-none ${
          hasSelection
            ? 'bg-[var(--accent-light)] border-[var(--accent)]/40 text-[var(--accent)]'
            : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text)]'
        }`}
      >
        {icon && <span className="text-[var(--text-dim)]">{icon}</span>}
        <span className="whitespace-nowrap">{displayLabel}</span>
        {hasSelection ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:text-[var(--text)]"
            onClick={(e) => {
              e.stopPropagation();
              // Clear all selections
              selected.forEach((s) => onToggle(s));
            }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-elevated,var(--bg))] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[160px]">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                  isSelected
                    ? 'text-[var(--accent)] bg-[var(--accent-light)]'
                    : 'text-[var(--text)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle className="w-3 h-3 text-white" />
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
