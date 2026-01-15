import { FileText, CheckCircle, Code, Library, Sparkles, Database, Settings, X, ChevronRight } from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore';

export function Sidebar() {
  const { activeTab, setActiveTab, activeMeasureId, setActiveMeasure, measures } = useMeasureStore();
  const activeMeasure = measures.find(m => m.id === activeMeasureId);

  // Count total unique value sets across all measures
  const allValueSets = measures.flatMap(m => m.valueSets);
  const uniqueValueSetCount = new Set(allValueSets.map(vs => vs.oid || vs.id)).size;

  // Main navigation - always accessible
  const mainNavItems = [
    { id: 'library' as const, icon: Library, label: 'Measure Library' },
    { id: 'valuesets' as const, icon: Database, label: 'Value Set Library', badge: uniqueValueSetCount > 0 ? uniqueValueSetCount : undefined },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  // Measure-specific navigation - shown when a measure is selected
  const measureNavItems = [
    { id: 'editor' as const, icon: FileText, label: 'UMS Editor' },
    { id: 'validation' as const, icon: CheckCircle, label: 'Test Validation' },
    { id: 'codegen' as const, icon: Code, label: 'Code Generation' },
  ];

  const handleCloseMeasure = () => {
    setActiveMeasure(null);
    setActiveTab('library');
  };

  return (
    <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[var(--text)]">Measure</h1>
            <h1 className="font-bold text-cyan-400 -mt-1">Accelerator</h1>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="p-3 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg-tertiary)] rounded">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Measure Context */}
      {activeMeasure && (
        <div className="flex-1 flex flex-col border-t border-[var(--border)]">
          {/* Measure Header */}
          <div className="p-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-medium mb-1">
                    Active Measure
                  </div>
                  <div className="text-sm font-medium text-[var(--text)] truncate">
                    {activeMeasure.metadata.measureId}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                    {activeMeasure.metadata.title}
                  </div>
                </div>
                <button
                  onClick={handleCloseMeasure}
                  className="p-1 text-[var(--text-dim)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Close measure"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Measure Navigation */}
          <nav className="px-3 pb-3 space-y-1">
            {measureNavItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                    }
                  `}
                >
                  <ChevronRight className="w-3 h-3 text-[var(--text-dim)]" />
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* No Measure Selected Hint */}
      {!activeMeasure && measures.length > 0 && (
        <div className="flex-1 flex flex-col justify-center px-3">
          <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-[var(--text-dim)]" />
            <p className="text-xs text-[var(--text-muted)]">
              Select a measure from the library to edit, validate, or generate code
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-dim)] text-center">
          {measures.length} measure{measures.length !== 1 ? 's' : ''} in library
        </div>
      </div>
    </aside>
  );
}
