import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Check,
  ChevronDown,
  Link,
  Sparkles,
  Plus,
  Building2,
  Stethoscope,
  Scissors,
  Pill,
  FlaskConical,
  ClipboardList,
  User,
  Syringe,
  AlertTriangle,
  GitBranch,
  MessageSquare,
  Target,
  Cpu,
  Activity,
  Heart,
  Code,
  Layers,
} from 'lucide-react';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore';

// ============================================================================
// Icons mapping
// ============================================================================
const ICONS = {
  encounter: Building2,
  diagnosis: Stethoscope,
  procedure: Scissors,
  medication: Pill,
  lab: FlaskConical,
  assessment: ClipboardList,
  demographic: User,
  immunization: Syringe,
  allergy: AlertTriangle,
  intervention: GitBranch,
  communication: MessageSquare,
  caregoal: Target,
  device: Cpu,
  symptom: Activity,
  familyhistory: Heart,
  custom: Code,
};

const CAT_COLORS = {
  encounter: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  diagnosis: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
  procedure: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  medication: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  lab: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
  assessment: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  demographic: { bg: 'rgba(100, 116, 139, 0.15)', text: '#64748b' },
  immunization: { bg: 'rgba(20, 184, 166, 0.15)', text: '#14b8a6' },
  allergy: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  intervention: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  communication: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  device: { bg: 'rgba(120, 113, 108, 0.15)', text: '#78716c' },
  custom: { bg: 'rgba(120, 113, 108, 0.1)', text: '#78716c' },
};

const CONFIDENCE_COLORS = {
  high: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  low: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
};

// ============================================================================
// Chip Select Components
// ============================================================================
function ChipSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const selected = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(selected ? null : o)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
            style={{
              border: selected ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              backgroundColor: selected ? 'var(--accent-muted)' : 'var(--bg-primary)',
              color: selected ? 'var(--accent)' : 'var(--text)',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function MultiChipSelect({ options, value, onChange }) {
  const arr = value || [];
  const toggle = (v) => onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const selected = arr.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
            style={{
              border: selected ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              backgroundColor: selected ? 'var(--accent-muted)' : 'var(--bg-primary)',
              color: selected ? 'var(--accent)' : 'var(--text)',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export default function AddComponentModal({
  onClose,
  onAdd,
  onCreateNew,
  targetMeasure = 'Unknown Measure',
  targetSection = 'Unknown Section',
}) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState([]);
  const [filterConfidence, setFilterConfidence] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [added, setAdded] = useState(false);

  const { components } = useComponentLibraryStore();

  // Get all categories from components
  const allCategories = useMemo(() => {
    const cats = [...new Set(components.map(c => c.category || c.type || 'custom'))];
    return cats.filter(Boolean).sort();
  }, [components]);

  // Filter and sort components
  const filtered = useMemo(() => {
    let items = [...components].filter(c => c.versionInfo?.status !== 'archived');

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(s) ||
        (c.tags || []).some(tag => tag.toLowerCase().includes(s)) ||
        (c.description || '').toLowerCase().includes(s) ||
        (c.category || '').toLowerCase().includes(s)
      );
    }

    if (filterCat.length > 0) {
      items = items.filter(c => filterCat.includes(c.category || c.type));
    }

    if (filterConfidence) {
      items = items.filter(c => c.complexity?.level === filterConfidence);
    }

    items.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name);
      if (sortBy === 'codes') return (b.valueSet?.codes?.length || 0) - (a.valueSet?.codes?.length || 0);
      if (sortBy === 'used') return (b.usage?.usageCount || 0) - (a.usage?.usageCount || 0);
      return 0;
    });

    return items;
  }, [components, search, filterCat, filterConfidence, sortBy]);

  // Group by category
  const grouped = useMemo(() => {
    if (sortBy !== 'category') return null;
    const map = {};
    filtered.forEach(c => {
      const cat = c.category || c.type || 'custom';
      (map[cat] = map[cat] || []).push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, sortBy]);

  const selectedComp = selected ? components.find(c => c.id === selected) : null;

  const handleAdd = useCallback(() => {
    if (selectedComp && onAdd) {
      onAdd(selectedComp);
      setAdded(true);
    }
  }, [selectedComp, onAdd]);

  const handleAddAnother = useCallback(() => {
    setAdded(false);
    setSelected(null);
  }, []);

  // ============================================================================
  // Success State
  // ============================================================================
  if (added && selectedComp) {
    const cat = selectedComp.category || selectedComp.type || 'custom';
    const cc = CAT_COLORS[cat] || CAT_COLORS.custom;
    const IconComponent = ICONS[cat] || Code;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div
          className="w-[480px] rounded-xl shadow-2xl border text-center p-10"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
          >
            <Check size={24} className="text-green-600" />
          </div>
          <div className="text-lg font-bold mb-1.5" style={{ color: 'var(--text)' }}>
            Component Added
          </div>
          <div className="text-sm mb-5" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong>{selectedComp.name}</strong> has been linked to<br />
            <span style={{ color: 'var(--accent)' }}>{targetSection}</span> in {targetMeasure}
          </div>

          <div
            className="p-3 rounded-lg border text-left mb-5"
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cc.bg }}
              >
                <IconComponent size={14} style={{ color: cc.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {selectedComp.name}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {selectedComp.valueSet?.codes?.length || 0} codes · {cat} · Used in {(selectedComp.usage?.usageCount || 0) + 1} measures
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link size={12} className="text-green-600" />
                <span className="text-[10px] font-semibold text-green-600">Linked</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleAddAnother}
              className="px-5 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Add Another
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Component Tile
  // ============================================================================
  const Tile = ({ comp }) => {
    const isSel = selected === comp.id;
    const cat = comp.category || comp.type || 'custom';
    const cc = CAT_COLORS[cat] || CAT_COLORS.custom;
    const IconComponent = ICONS[cat] || Code;
    const cxLevel = comp.complexity?.level || 'medium';
    const cxDots = cxLevel === 'low' ? 1 : cxLevel === 'medium' ? 2 : 3;
    const cxColor = cxLevel === 'low' ? '#059669' : cxLevel === 'medium' ? '#d97706' : '#dc2626';
    const conf = CONFIDENCE_COLORS[cxLevel] || CONFIDENCE_COLORS.medium;

    return (
      <div
        onClick={() => setSelected(isSel ? null : comp.id)}
        className="cursor-pointer mb-1.5"
      >
        <div
          className="p-3 rounded-lg transition-all"
          style={{
            border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
            backgroundColor: isSel ? 'var(--accent-muted)' : 'var(--bg-primary)',
          }}
        >
          {/* Row 1: Icon + Name + category badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cc.bg }}
              >
                <IconComponent size={12} style={{ color: cc.text }} />
              </div>
              <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                {comp.name}
              </div>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded capitalize flex-shrink-0"
              style={{ backgroundColor: cc.bg, color: cc.text }}
            >
              {cat}
            </span>
          </div>

          {/* Row 2: Description */}
          <div
            className="text-xs mb-2 ml-8"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}
          >
            {comp.description || 'No description provided'}
          </div>

          {/* Row 3: Meta row */}
          <div className="flex items-center justify-between ml-8">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {comp.valueSet?.codes?.length || 0} codes
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>·</span>
              <span className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: i < cxDots ? cxColor : 'var(--border)' }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold capitalize" style={{ color: cxColor }}>
                  {cxLevel}
                </span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>·</span>
              <span className="flex items-center gap-1">
                <Link size={10} style={{ color: 'var(--text-secondary)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Used in {comp.usage?.usageCount || 0} measures
                </span>
              </span>
            </div>
            {comp.versionInfo?.status && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{
                  ...(comp.versionInfo.status === 'approved'
                    ? { color: '#166534', backgroundColor: 'rgba(34, 197, 94, 0.15)' }
                    : { color: '#92400e', backgroundColor: 'rgba(245, 158, 11, 0.15)' }
                  )
                }}
              >
                {comp.versionInfo.status === 'approved' ? 'Approved' : 'In Review'}
              </span>
            )}
          </div>

          {/* Detail expansion when selected */}
          {isSel && (
            <div
              className="mt-2.5 ml-8 p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--accent)' }}
            >
              <div className="flex gap-3 mb-2">
                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Type
                  </div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                    {comp.type === 'composite' ? 'Composite' : 'Single'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Complexity
                  </div>
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded capitalize"
                    style={{ backgroundColor: conf.bg, color: conf.text }}
                  >
                    {cxLevel}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Status
                  </div>
                  <div className="text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>
                    {comp.versionInfo?.status || 'draft'}
                  </div>
                </div>
              </div>
              {comp.tags && comp.tags.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Tags
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {comp.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="w-[600px] max-h-[90vh] rounded-xl shadow-2xl border flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-muted)', border: '1px solid var(--accent)' }}
              >
                <Layers size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
                  Add Component
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Browse the library to find an existing component
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Target context banner */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg mt-2 mb-3"
            style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border, var(--border))' }}
          >
            <Plus size={12} style={{ color: 'var(--info-text)' }} />
            <span className="text-[11px]" style={{ color: 'var(--info-text)' }}>
              Adding to <strong>{targetSection}</strong> in <strong>{targetMeasure}</strong>
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <div className="absolute left-2.5 top-2.5">
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <input
              type="text"
              className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Search components by name, tag, category, or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filters + Sort */}
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
              style={{
                border: (filterCat.length || filterConfidence) ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: (filterCat.length || filterConfidence) ? 'var(--accent-muted)' : 'var(--bg-primary)',
                color: (filterCat.length || filterConfidence) ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              Filters {(filterCat.length + (filterConfidence ? 1 : 0)) > 0 && `(${filterCat.length + (filterConfidence ? 1 : 0)})`}
              <ChevronDown size={12} />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Sort:</span>
              {['name', 'category', 'codes', 'used'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className="px-2 py-1 rounded text-[10px] font-semibold capitalize"
                  style={{
                    backgroundColor: sortBy === s ? 'var(--accent)' : 'transparent',
                    color: sortBy === s ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {s === 'used' ? 'Most Used' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div
              className="p-3 rounded-lg border mb-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <MultiChipSelect options={allCategories} value={filterCat} onChange={setFilterCat} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Complexity</label>
                <ChipSelect options={['low', 'medium', 'high']} value={filterConfidence} onChange={setFilterConfidence} />
              </div>
              {(filterCat.length > 0 || filterConfidence) && (
                <button
                  type="button"
                  onClick={() => { setFilterCat([]); setFilterConfidence(null); }}
                  className="mt-2 text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Count */}
          <div
            className="text-[11px] pb-1.5 mb-1 border-b"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          >
            {filtered.length} component{filtered.length !== 1 && 's'} available
            {selected && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · 1 selected</span>}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {sortBy === 'category' && grouped ? (
            grouped.map(([cat, items]) => (
              <div key={cat} className="mb-2.5">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 capitalize"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {cat} ({items.length})
                </div>
                {items.map(c => <Tile key={c.id} comp={c} />)}
              </div>
            ))
          ) : (
            filtered.map(c => <Tile key={c.id} comp={c} />)
          )}
          {filtered.length === 0 && (
            <div className="py-8 text-center">
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                No components match your search.
              </div>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    border: '1px solid var(--accent)',
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent)',
                  }}
                >
                  <Plus size={12} />
                  Create a new component
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            {onCreateNew ? (
              <button
                type="button"
                onClick={onCreateNew}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  <Sparkles size={10} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <span>Don't see what you need?</span>
                <span
                  className="font-semibold underline underline-offset-2"
                  style={{ color: 'var(--accent)' }}
                >
                  Create a new component
                </span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selected}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: selected ? 'var(--accent)' : 'var(--border)',
                  color: selected ? 'white' : 'var(--text-secondary)',
                  cursor: selected ? 'pointer' : 'not-allowed',
                  boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                Add to Measure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
