import { FileText, CheckCircle, Code, Library, Sparkles, Database } from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore';

export function Sidebar() {
  const { activeTab, setActiveTab, activeMeasureId, measures } = useMeasureStore();
  const activeMeasure = measures.find(m => m.id === activeMeasureId);

  // Count total unique value sets across all measures
  const allValueSets = measures.flatMap(m => m.valueSets);
  const uniqueValueSetCount = new Set(allValueSets.map(vs => vs.oid || vs.id)).size;

  const navItems = [
    { id: 'library' as const, icon: Library, label: 'Measure Library', always: true },
    { id: 'valuesets' as const, icon: Database, label: 'Value Sets', always: true, badge: uniqueValueSetCount > 0 ? uniqueValueSetCount : undefined },
    { id: 'editor' as const, icon: FileText, label: 'UMS Editor', requiresMeasure: true },
    { id: 'codegen' as const, icon: Code, label: 'Code Generation', requiresMeasure: true },
    { id: 'validation' as const, icon: CheckCircle, label: 'Test Validation', requiresMeasure: true },
  ];

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

      {/* Active measure indicator */}
      {activeMeasure && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Active Measure</div>
          <div className="text-sm font-medium text-[var(--text)] truncate">{activeMeasure.metadata.title}</div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            {activeMeasure.metadata.measureId} • v{activeMeasure.metadata.version}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isDisabled = item.requiresMeasure && !activeMeasureId;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && setActiveTab(item.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : isDisabled
                    ? 'text-[var(--text-dim)] cursor-not-allowed'
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

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-dim)] text-center">
          {measures.length} measure{measures.length !== 1 ? 's' : ''} in library
        </div>
      </div>
    </aside>
  );
}
