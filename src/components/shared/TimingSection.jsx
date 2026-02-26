import { useState, useMemo, useCallback } from 'react';
import { Clock, AlertTriangle, Settings2 } from 'lucide-react';
import { isAgeComponent, isSexGenderComponent } from '../../utils/inferCategory';

// ============================================================================
// Constants
// ============================================================================

const TIMING_PRESETS = [
  { value: 'during-mp', label: 'During Measurement Period', description: 'Event occurs within the measurement period' },
  { value: 'lookback-end', label: 'Lookback from MP End', description: 'Event occurred within X time before end of MP' },
  { value: 'lookback-start', label: 'Lookback from MP Start', description: 'Event occurred within X time before start of MP' },
  { value: 'anytime', label: 'Anytime (no time constraint)', description: 'Event can occur at any documented time' },
  { value: 'advanced', label: 'Advanced', description: 'Custom timing expression' },
];

const TIMING_UNITS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
  { value: 'days', label: 'Days' },
];

// For advanced mode - operators aligned with CQL
const ADVANCED_OPERATORS = [
  { value: 'during', label: 'During' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'within', label: 'Within' },
  { value: 'starts before', label: 'Starts Before' },
  { value: 'starts after', label: 'Starts After' },
  { value: 'ends before', label: 'Ends Before' },
  { value: 'ends after', label: 'Ends After' },
  { value: 'overlaps', label: 'Overlaps' },
];

const ADVANCED_ANCHORS = [
  'Measurement Period',
  'Measurement Period End',
  'Measurement Period Start',
  'Encounter Period',
  'Diagnosis Date',
  'IPSD',
  'IPED',
];

const ADVANCED_POSITIONS = [
  { value: '', label: 'None' },
  { value: 'before start of', label: 'Before Start Of' },
  { value: 'before end of', label: 'Before End Of' },
  { value: 'after start of', label: 'After Start Of' },
  { value: 'after end of', label: 'After End Of' },
];

// Age-specific reference options (ageEvaluatedAt values)
const AGE_REFERENCE_OPTIONS = [
  { value: 'end-of-mp', label: 'End of Measurement Period', timing: { operator: 'as of', reference: 'Measurement Period End', displayExpression: 'as of end of Measurement Period' } },
  { value: 'start-of-mp', label: 'Start of Measurement Period', timing: { operator: 'as of', reference: 'Measurement Period Start', displayExpression: 'as of start of Measurement Period' } },
  { value: 'as-of-today', label: 'As of Today', timing: { operator: 'as of', reference: 'Today', displayExpression: 'as of today' } },
  { value: 'qualifying-encounter', label: 'As of Qualifying Encounter Date', timing: { operator: 'as of', reference: 'Qualifying Encounter', displayExpression: 'as of qualifying encounter date' } },
];

/**
 * Detect component type using proper field detection from inferCategory.js
 * @param {object} componentData - Object with genderValue, resourceType, thresholds, name, description
 * @returns {'sex' | 'age' | 'standard'}
 */
function detectComponentType(componentData) {
  if (!componentData) return 'standard';

  // Use the proper detection functions from inferCategory
  if (isSexGenderComponent(componentData)) return 'sex';
  if (isAgeComponent(componentData)) return 'age';

  return 'standard';
}

/**
 * Detect age reference from existing timing or ageEvaluatedAt field
 */
function detectAgeReference(timing, ageEvaluatedAt) {
  // If ageEvaluatedAt is explicitly set, use it
  if (ageEvaluatedAt) return ageEvaluatedAt;

  // Otherwise try to infer from timing
  if (!timing?.reference) return 'end-of-mp';
  const ref = timing.reference.toLowerCase();
  if (ref.includes('end')) return 'end-of-mp';
  if (ref.includes('start')) return 'start-of-mp';
  if (ref.includes('today')) return 'as-of-today';
  if (ref.includes('encounter') || ref.includes('qualifying')) return 'qualifying-encounter';
  return 'end-of-mp';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Derive T-Days from a timing object.
 * @param {object|null} timing - The timing configuration
 * @param {string} [componentCategory] - Category to check for non-recurring types
 * @param {boolean} [negation] - Whether this is a negation/exclusion component
 * @returns {number|null} - days, or null for non-recurring
 */
export function deriveDueDateDays(timing, componentCategory, negation) {
  // Negation components are one-time (e.g., hysterectomy)
  if (negation === true) {
    return null;
  }

  // Non-recurring categories
  if (componentCategory && ['demographics'].includes(componentCategory)) {
    return null;
  }

  if (!timing) return 365; // default annual

  const { operator, quantity, unit, reference } = timing;

  // Anytime / ever documented = not recurring
  if (reference === 'Any') return null;

  // Has a lookback quantity — convert to days
  if (quantity && unit) {
    switch (unit) {
      case 'years':
        return quantity * 365;
      case 'months':
        return quantity * 30;
      case 'days':
        return quantity;
      default:
        return 365;
    }
  }

  // "During MP" with no quantity — default annual
  if (operator === 'during') return 365;

  return 365; // safe default
}

/**
 * Detect which preset matches existing timing data.
 * @param {object|null} timing - Existing timing object
 * @returns {string} - Preset key
 */
function detectPreset(timing) {
  if (!timing) return 'during-mp';
  const { operator, quantity, position, reference } = timing;

  // During MP: operator is 'during', no quantity, reference is MP
  if (operator === 'during' && !quantity && (!reference || reference === 'Measurement Period')) {
    return 'during-mp';
  }

  // Lookback from MP End: operator is 'within', has quantity, position is 'before end of'
  if (operator === 'within' && quantity && position === 'before end of') {
    return 'lookback-end';
  }

  // Lookback from MP Start: operator is 'within', has quantity, position is 'before start of'
  if (operator === 'within' && quantity && position === 'before start of') {
    return 'lookback-start';
  }

  // Anytime: reference is 'Any' or similar
  if (reference === 'Any' || (!quantity && !position && !reference)) {
    return 'anytime';
  }

  // Doesn't match a preset — show advanced
  return 'advanced';
}

/**
 * Build a display expression from timing object.
 * @param {object} timing - Timing object
 * @returns {string} - Human-readable expression
 */
function buildDisplayExpression(timing) {
  if (!timing) return 'during Measurement Period';

  const parts = [timing.operator];
  if (timing.quantity) {
    parts.push(String(timing.quantity), timing.unit);
  }
  if (timing.position) {
    parts.push(timing.position);
  }
  parts.push(timing.reference || 'Measurement Period');
  return parts.join(' ');
}

/**
 * Format T-Days as human readable
 * @param {number|null} days
 * @returns {string}
 */
function formatDueDateDays(days) {
  if (days == null) return 'N/A';
  if (days === 365) return 'Annual';
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0 && days < 365) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TimingSection - Shared timing editor component
 *
 * @param {object} props
 * @param {object} props.timing - Current timing object { operator, quantity, unit, position, reference, displayExpression }
 * @param {function} props.onChange - Called with updated timing object on any change
 * @param {number|null} props.dueDateDays - Current T-Days value
 * @param {function} props.onDueDateChange - Called with new T-Days number
 * @param {boolean} props.dueDateOverridden - Whether user has manually set T-Days
 * @param {string} [props.mpStart] - Measurement period start (ISO date), optional for resolved preview
 * @param {string} [props.mpEnd] - Measurement period end (ISO date), optional for resolved preview
 * @param {boolean} [props.compact] - If true, use condensed layout (for UMS editor inline)
 * @param {boolean} [props.showDueDate] - If true, show due date section (default true)
 * @param {string} [props.componentCategory] - Component category for derivation logic
 * @param {boolean} [props.negation] - Whether this is a negation/exclusion component (returns null for due date)
 * @param {object} [props.componentData] - Component data for type detection { genderValue, resourceType, thresholds, name, description }
 * @param {string} [props.ageEvaluatedAt] - For age components: when to evaluate age (end-of-mp, start-of-mp, as-of-today, qualifying-encounter)
 * @param {function} [props.onAgeEvaluatedAtChange] - Callback when ageEvaluatedAt changes (for persistence)
 */
export function TimingSection({
  timing,
  onChange,
  dueDateDays,
  onDueDateChange,
  dueDateOverridden = false,
  mpStart,
  mpEnd,
  compact = false,
  showDueDate = true,
  componentCategory,
  negation = false,
  componentData = null,
  ageEvaluatedAt: ageEvaluatedAtProp,
  onAgeEvaluatedAtChange,
}) {
  // Detect special component types using proper field detection
  const componentType = detectComponentType(componentData);

  // ============================================================================
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS (React rules)
  // ============================================================================

  // Age reference state (used for Age components)
  // Uses prop value if provided (for controlled mode), otherwise manages internally
  const [ageReferenceInternal, setAgeReferenceInternal] = useState(() =>
    detectAgeReference(timing, ageEvaluatedAtProp)
  );
  const ageReference = ageEvaluatedAtProp ?? ageReferenceInternal;

  // Detect initial preset from existing timing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _initialPreset = useMemo(() => detectPreset(timing), []); // Intentional: only calculate on mount
  const [selectedPreset, setSelectedPreset] = useState(_initialPreset);

  // Local state for lookback inputs
  const [lookbackQuantity, setLookbackQuantity] = useState(
    timing?.quantity ? String(timing.quantity) : '10'
  );
  const [lookbackUnit, setLookbackUnit] = useState(
    timing?.unit || 'years'
  );

  // Advanced mode state
  const [advancedOperator, setAdvancedOperator] = useState(timing?.operator || 'during');
  const [advancedValue, setAdvancedValue] = useState(timing?.quantity ? String(timing.quantity) : '');
  const [advancedUnit, setAdvancedUnit] = useState(timing?.unit || 'years');
  const [advancedPosition, setAdvancedPosition] = useState(timing?.position || '');
  const [advancedAnchor, setAdvancedAnchor] = useState(timing?.reference || 'Measurement Period');

  // Track if timing changed and due date is out of sync
  const [timingChangedWarning, setTimingChangedWarning] = useState(false);

  // Build timing object from current state
  const buildTimingFromPreset = useCallback((preset, quantity, unit) => {
    switch (preset) {
      case 'during-mp':
        return {
          operator: 'during',
          quantity: undefined,
          unit: undefined,
          position: undefined,
          reference: 'Measurement Period',
          displayExpression: 'during Measurement Period',
        };
      case 'lookback-end':
        return {
          operator: 'within',
          quantity: Number(quantity) || 10,
          unit: unit || 'years',
          position: 'before end of',
          reference: 'Measurement Period',
          displayExpression: `within ${quantity} ${unit} before end of Measurement Period`,
        };
      case 'lookback-start':
        return {
          operator: 'within',
          quantity: Number(quantity) || 10,
          unit: unit || 'years',
          position: 'before start of',
          reference: 'Measurement Period',
          displayExpression: `within ${quantity} ${unit} before start of Measurement Period`,
        };
      case 'anytime':
        return {
          operator: 'during',
          quantity: undefined,
          unit: undefined,
          position: undefined,
          reference: 'Any',
          displayExpression: 'anytime (no time constraint)',
        };
      case 'advanced':
        return {
          operator: advancedOperator,
          quantity: advancedValue ? Number(advancedValue) : undefined,
          unit: advancedValue ? advancedUnit : undefined,
          position: advancedPosition || undefined,
          reference: advancedAnchor,
          displayExpression: buildDisplayExpression({
            operator: advancedOperator,
            quantity: advancedValue ? Number(advancedValue) : undefined,
            unit: advancedValue ? advancedUnit : undefined,
            position: advancedPosition || undefined,
            reference: advancedAnchor,
          }),
        };
      default:
        return timing;
    }
  }, [advancedOperator, advancedValue, advancedUnit, advancedPosition, advancedAnchor, timing]);

  // Handle preset change
  const handlePresetChange = useCallback((preset) => {
    setSelectedPreset(preset);
    const newTiming = buildTimingFromPreset(preset, lookbackQuantity, lookbackUnit);
    onChange(newTiming);

    // Show warning if due date was overridden
    if (dueDateOverridden) {
      setTimingChangedWarning(true);
    }
  }, [buildTimingFromPreset, lookbackQuantity, lookbackUnit, onChange, dueDateOverridden]);

  // Handle lookback quantity/unit change
  const handleLookbackChange = useCallback((quantity, unit) => {
    setLookbackQuantity(quantity);
    setLookbackUnit(unit);
    const newTiming = buildTimingFromPreset(selectedPreset, quantity, unit);
    onChange(newTiming);

    if (dueDateOverridden) {
      setTimingChangedWarning(true);
    }
  }, [buildTimingFromPreset, selectedPreset, onChange, dueDateOverridden]);

  // Handle advanced field changes
  const handleAdvancedChange = useCallback(() => {
    const newTiming = buildTimingFromPreset('advanced', advancedValue, advancedUnit);
    onChange(newTiming);

    if (dueDateOverridden) {
      setTimingChangedWarning(true);
    }
  }, [buildTimingFromPreset, advancedValue, advancedUnit, onChange, dueDateOverridden]);

  // Current timing preview
  const timingPreview = useMemo(() => {
    if (selectedPreset === 'during-mp') return 'during Measurement Period';
    if (selectedPreset === 'lookback-end') return `within ${lookbackQuantity} ${lookbackUnit} before end of Measurement Period`;
    if (selectedPreset === 'lookback-start') return `within ${lookbackQuantity} ${lookbackUnit} before start of Measurement Period`;
    if (selectedPreset === 'anytime') return 'anytime (no time constraint)';
    if (selectedPreset === 'advanced') {
      return buildDisplayExpression({
        operator: advancedOperator,
        quantity: advancedValue ? Number(advancedValue) : undefined,
        unit: advancedValue ? advancedUnit : undefined,
        position: advancedPosition || undefined,
        reference: advancedAnchor,
      });
    }
    return timing?.displayExpression || 'during Measurement Period';
  }, [selectedPreset, lookbackQuantity, lookbackUnit, advancedOperator, advancedValue, advancedUnit, advancedPosition, advancedAnchor, timing]);

  // Resolved date range preview
  const resolvedPreview = useMemo(() => {
    if (!mpStart || !mpEnd) return null;

    const mpEndDate = new Date(mpEnd);
    const mpStartDate = new Date(mpStart);

    if (selectedPreset === 'during-mp') {
      return `${mpStartDate.toLocaleDateString()} → ${mpEndDate.toLocaleDateString()}`;
    }

    if (selectedPreset === 'lookback-end' || selectedPreset === 'lookback-start') {
      const quantity = Number(lookbackQuantity) || 0;
      const referenceDate = selectedPreset === 'lookback-end' ? mpEndDate : mpStartDate;
      const startDate = new Date(referenceDate);

      if (lookbackUnit === 'years') {
        startDate.setFullYear(startDate.getFullYear() - quantity);
      } else if (lookbackUnit === 'months') {
        startDate.setMonth(startDate.getMonth() - quantity);
      } else {
        startDate.setDate(startDate.getDate() - quantity);
      }

      return `${startDate.toLocaleDateString()} → ${referenceDate.toLocaleDateString()}`;
    }

    if (selectedPreset === 'anytime') {
      return 'Any documented date';
    }

    return null;
  }, [mpStart, mpEnd, selectedPreset, lookbackQuantity, lookbackUnit]);

  // Auto-derived due date based on current timing
  const suggestedDueDays = useMemo(() => {
    const currentTiming = buildTimingFromPreset(selectedPreset, lookbackQuantity, lookbackUnit);
    return deriveDueDateDays(currentTiming, componentCategory, negation);
  }, [selectedPreset, lookbackQuantity, lookbackUnit, componentCategory, negation, buildTimingFromPreset]);

  // Age reference change handler
  const handleAgeReferenceChange = useCallback((refValue) => {
    // Update internal state
    setAgeReferenceInternal(refValue);

    // Call persistence callback if provided
    if (onAgeEvaluatedAtChange) {
      onAgeEvaluatedAtChange(refValue);
    }

    // Update timing object
    const option = AGE_REFERENCE_OPTIONS.find(o => o.value === refValue);
    if (option) {
      onChange(option.timing);
    }
  }, [onChange, onAgeEvaluatedAtChange]);

  // ============================================================================
  // CONDITIONAL RETURNS FOR SPECIAL COMPONENT TYPES (after all hooks)
  // ============================================================================

  // Sex components: No timing section at all (immutable characteristic)
  if (componentType === 'sex') {
    return (
      <div
        className="border rounded-lg p-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="text-sm italic" style={{ color: 'var(--text-dim)' }}>
          Sex/Gender is an immutable patient characteristic — no timing constraint applies.
        </div>
      </div>
    );
  }

  // Age components: Simple reference point selector
  if (componentType === 'age') {
    return (
      <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
        <fieldset
          className="border rounded-lg p-4 space-y-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <legend
            className="text-xs font-semibold uppercase tracking-wide px-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Age Reference Point
            </span>
          </legend>

          <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Calculate patient age as of:
          </div>

          <div className="space-y-2">
            {AGE_REFERENCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  ageReference === option.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-transparent hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <input
                  type="radio"
                  name="age-reference"
                  value={option.value}
                  checked={ageReference === option.value}
                  onChange={() => handleAgeReferenceChange(option.value)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          {/* Preview */}
          <div
            className="text-xs px-3 py-2 rounded-md font-mono mt-3"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Preview: </span>
            Age {AGE_REFERENCE_OPTIONS.find(o => o.value === ageReference)?.timing.displayExpression}
          </div>
        </fieldset>

        {/* Note about T-Days not applicable */}
        <div
          className="border rounded-lg p-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="text-sm italic" style={{ color: 'var(--text-dim)' }}>
            Age is a demographic constraint — no due date / T-Days applies.
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STANDARD TIMING UI (for all other component types)
  // ============================================================================

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      {/* Timing Pattern Selection */}
      <fieldset
        className="border rounded-lg p-4 space-y-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <legend
          className="text-xs font-semibold uppercase tracking-wide px-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> Timing Pattern
          </span>
        </legend>

        {/* Preset Radio Buttons */}
        <div className="space-y-2">
          {TIMING_PRESETS.map((preset) => (
            <label
              key={preset.value}
              className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                selectedPreset === preset.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <input
                type="radio"
                name="timing-preset"
                value={preset.value}
                checked={selectedPreset === preset.value}
                onChange={() => handlePresetChange(preset.value)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {preset.label}
                </div>
                {!compact && (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {preset.description}
                  </div>
                )}
              </div>
              {preset.value === 'advanced' && (
                <Settings2 size={14} style={{ color: 'var(--text-secondary)' }} />
              )}
            </label>
          ))}
        </div>

        {/* Lookback Inputs (for lookback-end and lookback-start) */}
        {(selectedPreset === 'lookback-end' || selectedPreset === 'lookback-start') && (
          <div
            className="ml-7 p-3 rounded-lg border space-y-3"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                How far back?
              </span>
              <input
                type="number"
                min={1}
                value={lookbackQuantity}
                onChange={(e) => handleLookbackChange(e.target.value, lookbackUnit)}
                className="w-20 px-2 py-1.5 rounded border text-sm text-center"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
              <select
                value={lookbackUnit}
                onChange={(e) => handleLookbackChange(lookbackQuantity, e.target.value)}
                className="px-2 py-1.5 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                {TIMING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Advanced Mode Inputs */}
        {selectedPreset === 'advanced' && (
          <div
            className="ml-7 p-3 rounded-lg border space-y-3"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Operator
                </label>
                <select
                  value={advancedOperator}
                  onChange={(e) => {
                    setAdvancedOperator(e.target.value);
                    setTimeout(handleAdvancedChange, 0);
                  }}
                  className="w-full px-2 py-1.5 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {ADVANCED_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Value (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={advancedValue}
                  onChange={(e) => {
                    setAdvancedValue(e.target.value);
                    setTimeout(handleAdvancedChange, 0);
                  }}
                  placeholder="e.g., 10"
                  className="w-full px-2 py-1.5 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Unit
                </label>
                <select
                  value={advancedUnit}
                  onChange={(e) => {
                    setAdvancedUnit(e.target.value);
                    setTimeout(handleAdvancedChange, 0);
                  }}
                  className="w-full px-2 py-1.5 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {TIMING_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Position (optional)
                </label>
                <select
                  value={advancedPosition}
                  onChange={(e) => {
                    setAdvancedPosition(e.target.value);
                    setTimeout(handleAdvancedChange, 0);
                  }}
                  className="w-full px-2 py-1.5 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {ADVANCED_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Anchor / Reference
              </label>
              <select
                value={advancedAnchor}
                onChange={(e) => {
                  setAdvancedAnchor(e.target.value);
                  setTimeout(handleAdvancedChange, 0);
                }}
                className="w-full px-2 py-1.5 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                {ADVANCED_ANCHORS.map((anchor) => (
                  <option key={anchor} value={anchor}>
                    {anchor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Timing Preview */}
        <div
          className="text-xs px-3 py-2 rounded-md font-mono"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Preview: </span>
          {timingPreview}
        </div>

        {/* Resolved Date Preview */}
        {resolvedPreview && (
          <div
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-dim)' }}
          >
            <span>Resolved: </span>
            {resolvedPreview}
          </div>
        )}
      </fieldset>

      {/* Due Date (T-Days) Section */}
      {showDueDate && (
        <fieldset
          className="border rounded-lg p-4 space-y-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <legend
            className="text-xs font-semibold uppercase tracking-wide px-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Due Date (T-Days)
            </span>
          </legend>

          {suggestedDueDays === null ? (
            <div className="text-sm italic" style={{ color: 'var(--text-dim)' }}>
              Non-recurring component (no due date)
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Recurrence every
                </span>
                <input
                  type="number"
                  min={1}
                  value={dueDateDays ?? suggestedDueDays}
                  onChange={(e) => onDueDateChange(Number(e.target.value))}
                  className="w-24 px-2 py-1.5 rounded border text-sm text-center font-mono"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--accent)',
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  days
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}
                >
                  {formatDueDateDays(dueDateDays ?? suggestedDueDays)}
                </span>
              </div>

              {/* Auto-derived / Override indicator */}
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                {dueDateOverridden ? (
                  <span className="flex items-center gap-1">
                    <span>Manually set</span>
                    {timingChangedWarning && (
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Timing changed — due date may be out of sync
                      </span>
                    )}
                    {suggestedDueDays !== dueDateDays && !timingChangedWarning && (
                      <span className="text-[var(--text-secondary)]">
                        (timing suggests {suggestedDueDays})
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Auto-derived from timing lookback</span>
                )}
              </div>
            </>
          )}
        </fieldset>
      )}
    </div>
  );
}

export default TimingSection;
