import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle, XCircle, Info, Code, FileText, User, AlertTriangle,
  Cpu, FileCode, Database, ChevronDown, ChevronUp, Heart, Calendar,
  Stethoscope, Pill, Syringe, Activity, Edit3, X, Save, Plus, Trash2,
  Library, ChevronRight, ArrowUp, ArrowDown, Filter
} from 'lucide-react';
import { useMeasureStore } from '../../stores/measureStore.js';

// Code format info for display
const CODE_FORMAT_INFO = {
  cql: { label: 'CQL', icon: FileCode, color: 'text-purple-400' },
  synapse: { label: 'Synapse SQL', icon: Database, color: 'text-[var(--accent)]' },
};

// Helper to calculate age from birth date
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Generate sample test patients for validation
function generateTestPatients(measure, count = 12) {
  const patients = [];
  const names = [
    'Paul Atreides', 'Lady Jessica', 'Duncan Idaho', 'Stilgar',
    'Chani', 'Gurney Halleck', 'Thufir Hawat', 'Leto Atreides',
    'Alia Atreides', 'Irulan Corrino', 'Feyd-Rautha', 'Baron Harkonnen'
  ];

  const outcomes = ['in_numerator', 'not_in_numerator', 'excluded', 'not_in_population'];
  const genders = ['male', 'female'];

  for (let i = 0; i < Math.min(count, names.length); i++) {
    const baseYear = 1950 + Math.floor(Math.random() * 50);
    const gender = genders[i % 2];
    const outcome = outcomes[i % outcomes.length];

    patients.push({
      id: `pt-${String(i + 1).padStart(3, '0')}`,
      name: names[i],
      demographics: {
        birthDate: `${baseYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        gender,
        race: 'Unknown',
        ethnicity: 'Unknown',
      },
      diagnoses: [
        { code: 'I10', display: 'Essential hypertension', system: 'ICD-10-CM', onsetDate: '2020-01-15', status: 'active' },
      ],
      encounters: [
        { code: '99213', display: 'Office visit', system: 'CPT', date: '2025-03-15', type: 'outpatient' },
      ],
      procedures: [],
      observations: [
        { code: '8480-6', display: 'Systolic BP', system: 'LOINC', date: '2025-03-15', value: 125 + (i * 3), unit: 'mm[Hg]' },
        { code: '8462-4', display: 'Diastolic BP', system: 'LOINC', date: '2025-03-15', value: 75 + (i * 2), unit: 'mm[Hg]' },
      ],
      medications: [],
      immunizations: [],
    });
  }

  return patients;
}

// Evaluate a patient against a measure
function evaluatePatient(patient, measure) {
  const age = calculateAge(patient.demographics.birthDate);

  // Determine outcome based on patient data
  let finalOutcome = 'not_in_population';
  const populations = {
    initialPopulation: { met: false, nodes: [] },
    denominator: { met: false, nodes: [] },
    exclusions: { met: false, nodes: [] },
    numerator: { met: false, nodes: [] },
  };

  // Check age criteria (18-85)
  const ageCheck = age >= 18 && age <= 85;

  populations.initialPopulation.nodes.push({
    id: 'ip-age',
    title: 'Age 18-85',
    type: 'initial_population',
    description: `Patient age: ${age} years`,
    status: ageCheck ? 'pass' : 'fail',
    facts: [{ code: 'AGE', display: `Age at MP End`, rawCode: String(age), rawDisplay: 'Calculated', date: '2025-12-31' }],
    cqlSnippet: 'AgeInYearsAt(date from end of "Measurement Period") in Interval[18, 85]',
    source: 'Patient Demographics',
  });

  // Check diagnosis
  const hasDiagnosis = patient.diagnoses.some(d => d.code === 'I10');
  populations.initialPopulation.nodes.push({
    id: 'ip-dx',
    title: 'Essential Hypertension',
    type: 'initial_population',
    description: hasDiagnosis ? 'Has qualifying diagnosis' : 'No qualifying diagnosis',
    status: hasDiagnosis ? 'pass' : 'fail',
    facts: patient.diagnoses.map(d => ({
      code: d.code,
      display: d.display,
      rawCode: d.code,
      rawDisplay: d.system,
      date: d.onsetDate,
    })),
    cqlSnippet: '["Diagnosis": "Essential Hypertension"]',
    source: 'Problem List',
  });

  // Check encounters
  const hasEncounter = patient.encounters.length > 0;
  populations.initialPopulation.nodes.push({
    id: 'ip-enc',
    title: 'Qualifying Encounter',
    type: 'initial_population',
    description: hasEncounter ? 'Has qualifying encounter' : 'No qualifying encounter',
    status: hasEncounter ? 'pass' : 'fail',
    facts: patient.encounters.map(e => ({
      code: e.code,
      display: e.display,
      rawCode: e.code,
      rawDisplay: e.system,
      date: e.date,
    })),
    cqlSnippet: 'exists(["Encounter": "Office Visit"])',
    source: 'Encounter History',
  });

  populations.initialPopulation.met = ageCheck && hasDiagnosis && hasEncounter;

  if (populations.initialPopulation.met) {
    finalOutcome = 'not_in_numerator';
    populations.denominator.met = true;
    populations.denominator.nodes.push({
      id: 'den-eq',
      title: 'Equals Initial Population',
      type: 'denominator',
      description: 'Included in denominator',
      status: 'pass',
      facts: [{ code: '—', display: 'Denominator state', rawDisplay: 'Included', date: '2025-12-31' }],
      cqlSnippet: 'define "Denominator": "Initial Population"',
      source: 'Measure Logic',
    });

    // Check exclusions (e.g., hospice)
    const isExcluded = patient.encounters.some(e => e.code === '99377' || e.code === 'G9473');
    populations.exclusions.met = isExcluded;
    populations.exclusions.nodes.push({
      id: 'ex-hospice',
      title: 'Hospice Services',
      type: 'denominator_exclusion',
      description: isExcluded ? 'Patient in hospice' : 'No hospice services',
      status: isExcluded ? 'pass' : 'fail',
      facts: [{ code: '—', display: 'Hospice', rawDisplay: isExcluded ? 'Found' : 'None', date: '—' }],
      cqlSnippet: 'exists(["Encounter": "Hospice Care"])',
      source: 'Encounter History',
    });

    if (isExcluded) {
      finalOutcome = 'excluded';
    } else {
      // Check numerator (BP control)
      const sbp = patient.observations.find(o => o.code === '8480-6')?.value || 999;
      const dbp = patient.observations.find(o => o.code === '8462-4')?.value || 999;
      const bpControlled = sbp < 140 && dbp < 90;

      populations.numerator.nodes.push({
        id: 'num-sbp',
        title: 'Systolic BP',
        type: 'numerator',
        description: `SBP: ${sbp} mm[Hg]`,
        status: sbp < 140 ? 'pass' : 'fail',
        facts: [{ code: '8480-6', display: 'Systolic BP', rawCode: String(sbp), rawDisplay: 'mm[Hg]', date: '2025-03-15' }],
        cqlSnippet: '"Most Recent SBP" < 140',
        source: 'Vital Signs',
      });

      populations.numerator.nodes.push({
        id: 'num-dbp',
        title: 'Diastolic BP',
        type: 'numerator',
        description: `DBP: ${dbp} mm[Hg]`,
        status: dbp < 90 ? 'pass' : 'fail',
        facts: [{ code: '8462-4', display: 'Diastolic BP', rawCode: String(dbp), rawDisplay: 'mm[Hg]', date: '2025-03-15' }],
        cqlSnippet: '"Most Recent DBP" < 90',
        source: 'Vital Signs',
      });

      populations.numerator.met = bpControlled;

      if (bpControlled) {
        finalOutcome = 'in_numerator';
      }
    }
  }

  return {
    patientId: patient.id,
    patientName: patient.name,
    narrative: `Patient ${patient.name} evaluated against ${measure?.metadata?.measureId || 'measure'}`,
    populations,
    finalOutcome,
    howClose: finalOutcome === 'not_in_numerator' ? [
      'Blood pressure not controlled',
      'SBP or DBP exceeds threshold',
    ] : undefined,
  };
}

// Outcome badge component
function OutcomeBadge({ outcome }) {
  const styles = {
    in_numerator: 'bg-[var(--success-light)] text-[var(--success)] border-[var(--success)]/30',
    not_in_numerator: 'bg-[var(--danger-light)] text-[var(--danger)] border-[var(--danger)]/30',
    excluded: 'bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/30',
    not_in_population: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border)]',
  };

  const labels = {
    in_numerator: 'In Numerator',
    not_in_numerator: 'In Denominator',
    excluded: 'Excluded',
    not_in_population: 'Not in Population',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${styles[outcome] || styles.not_in_population}`}>
      {labels[outcome] || outcome}
    </span>
  );
}

// Evaluation flow item component
function EvaluationFlowItem({ label, met, nodes, metText, notMetText, isImplied, impliedText, showTrigger }) {
  const firstFact = met && nodes.length > 0 && nodes[0].facts?.[0];

  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        met ? 'bg-[var(--success-light)]' : 'bg-[var(--danger-light)]'
      }`}>
        {met ? (
          <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-[var(--danger)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--text)]">{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            met
              ? 'bg-[var(--success-light)] text-[var(--success)]'
              : 'bg-[var(--danger-light)] text-[var(--danger)]'
          }`}>
            {met ? metText : notMetText}
          </span>
        </div>
        {isImplied && impliedText && (
          <p className="text-xs text-[var(--text-dim)] mt-0.5">{impliedText}</p>
        )}
        {firstFact && firstFact.code && firstFact.code !== '—' && (
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[var(--text-dim)]">Triggered by:</span>
            <code className="text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded font-mono">
              {firstFact.code}
            </code>
            <span className="text-[var(--text-muted)] truncate max-w-[250px]">{firstFact.display}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Validation section component
function ValidationSection({ title, subtitle, nodes, operator, resultChip, resultPositive, onInspect }) {
  const metCount = nodes.filter(n => n.status === 'pass').length;

  return (
    <div className={`mb-6 rounded-xl border p-5 transition-colors ${
      resultPositive
        ? 'bg-[var(--success)]/5 border-[var(--success)]/30'
        : 'bg-[var(--bg-secondary)] border-[var(--border-light)]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {resultPositive ? (
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
            ) : (
              <XCircle className="w-5 h-5 text-[var(--danger)]" />
            )}
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${
              resultPositive ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
            }`}>{title}</h3>
          </div>
          {subtitle && <p className="text-xs text-[var(--text-dim)] mt-1 ml-7">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            {metCount} of {nodes.length} met
          </span>
          <div className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap ${
            resultPositive
              ? 'bg-[var(--success)] text-white'
              : 'bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]/30'
          }`}>
            {resultChip}
          </div>
        </div>
      </div>

      {/* Nodes */}
      <div className="space-y-2">
        {nodes.map((node, i) => (
          <div key={node.id}>
            {i > 0 && (
              <div className="flex items-center gap-2 ml-4 my-1">
                <div className="w-px h-3 bg-[var(--border)]" />
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  operator === 'AND' ? 'bg-[var(--success-light)] text-[var(--success)]' :
                  'bg-[var(--warning-light)] text-[var(--warning)]'
                }`}>
                  {operator}
                </span>
                <div className="w-px h-3 bg-[var(--border)]" />
              </div>
            )}
            <div
              onClick={() => onInspect(node)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${
                node.status === 'pass'
                  ? 'bg-[var(--success)]/5 border-[var(--success)]/20 hover:border-[var(--success)]/40'
                  : 'bg-[var(--danger)]/5 border-[var(--danger)]/20 hover:border-[var(--danger)]/40'
              }`}
            >
              {node.status === 'pass' ? (
                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              ) : (
                <XCircle className="w-5 h-5 text-[var(--danger)]" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[var(--text)] text-sm">{node.title}</h4>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">{node.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-dim)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inspect modal component
function InspectModal({ node, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[min(800px,92vw)] max-h-[85vh] overflow-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            {node.status === 'pass' ? (
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
            ) : (
              <XCircle className="w-5 h-5 text-[var(--danger)]" />
            )}
            <h3 className="font-bold text-[var(--text)]">{node.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-xs ${
              node.status === 'pass'
                ? 'border-[var(--success)]/30 bg-[var(--success-light)] text-[var(--success)]'
                : 'border-[var(--danger)]/30 bg-[var(--danger-light)] text-[var(--danger)]'
            }`}>
              Status: {node.status === 'pass' ? 'Criteria Met' : 'Criteria Not Met'}
            </span>
            <span className="px-2.5 py-1 rounded-full border text-xs border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)]">
              {node.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>

          <p className="text-sm text-[var(--text-muted)]">{node.description}</p>

          {/* CQL */}
          {node.cqlSnippet && (
            <div>
              <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Code className="w-3.5 h-3.5" />
                Generated CQL Logic
              </h4>
              <pre className="p-3 bg-[var(--code-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--code-keyword)] overflow-auto whitespace-pre font-mono">
                {node.cqlSnippet}
              </pre>
            </div>
          )}

          {/* Facts table */}
          {node.facts && node.facts.length > 0 && (
            <div>
              <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                EMR Data Used ({node.facts.length} record{node.facts.length !== 1 ? 's' : ''})
              </h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                      <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Code</th>
                      <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Display</th>
                      <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Value</th>
                      <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {node.facts.map((fact, i) => (
                      <tr key={i} className="text-[var(--text)] hover:bg-[var(--bg-tertiary)]">
                        <td className="border-b border-[var(--border-light)] p-2.5">
                          {fact.code && fact.code !== '—' ? (
                            <code className="text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded font-mono">{fact.code}</code>
                          ) : (
                            <span className="text-[var(--text-dim)]">—</span>
                          )}
                        </td>
                        <td className="border-b border-[var(--border-light)] p-2.5">{fact.display || '—'}</td>
                        <td className="border-b border-[var(--border-light)] p-2.5">
                          {fact.rawCode ? <span className="font-medium">{fact.rawCode}</span> : '—'}
                        </td>
                        <td className="border-b border-[var(--border-light)] p-2.5 text-[var(--text-muted)]">{fact.date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {node.source && (
                <div className="text-xs text-[var(--text-muted)] mt-2">Data Source: {node.source}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component
export function ValidationTraceViewer() {
  const { getActiveMeasure, selectedCodeFormat, setActiveTab } = useMeasureStore();
  const measure = getActiveMeasure();

  const [selectedTrace, setSelectedTrace] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [inspectNode, setInspectNode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationTraces, setValidationTraces] = useState([]);
  const [testPatients, setTestPatients] = useState([]);
  const [showPatientDetails, setShowPatientDetails] = useState(true);
  const [populationFilter, setPopulationFilter] = useState('all');

  // Sort and filter state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageRange, setAgeRange] = useState({ min: null, max: null });
  const [showFilters, setShowFilters] = useState(false);

  const codeInfo = CODE_FORMAT_INFO[selectedCodeFormat] || CODE_FORMAT_INFO.cql;
  const CodeIcon = codeInfo.icon;

  // Generate test patients and evaluate them when measure changes
  useEffect(() => {
    if (!measure) {
      setValidationTraces([]);
      setTestPatients([]);
      setSelectedTrace(null);
      setSelectedPatient(null);
      return;
    }

    setIsGenerating(true);

    // Generate test patients
    const patients = generateTestPatients(measure, 12);

    // Evaluate each patient against the measure
    const traces = patients.map(patient => evaluatePatient(patient, measure));

    setTestPatients(patients);
    setValidationTraces(traces);
    setSelectedTrace(traces[0] || null);
    setSelectedPatient(patients[0] || null);
    setIsGenerating(false);
  }, [measure?.id]);

  // Handle patient selection
  const handleSelectPatient = useCallback((trace, index) => {
    setSelectedTrace(trace);
    const patient = testPatients.find(p => p.id === trace.patientId);
    setSelectedPatient(patient || null);
  }, [testPatients]);

  // Filter and sort traces
  const filteredAndSortedTraces = useMemo(() => {
    let traces = [...validationTraces];

    // Apply population filter
    if (populationFilter !== 'all') {
      traces = traces.filter(t => t.finalOutcome === populationFilter);
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      traces = traces.filter(t => {
        const patient = testPatients.find(p => p.id === t.patientId);
        return patient?.demographics.gender === genderFilter;
      });
    }

    // Apply age range filter
    if (ageRange.min !== null || ageRange.max !== null) {
      traces = traces.filter(t => {
        const patient = testPatients.find(p => p.id === t.patientId);
        if (!patient) return false;
        const age = calculateAge(patient.demographics.birthDate);
        if (ageRange.min !== null && age < ageRange.min) return false;
        if (ageRange.max !== null && age > ageRange.max) return false;
        return true;
      });
    }

    // Apply sorting
    traces.sort((a, b) => {
      const patientA = testPatients.find(p => p.id === a.patientId);
      const patientB = testPatients.find(p => p.id === b.patientId);

      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.patientName || '').localeCompare(b.patientName || '');
          break;
        case 'age':
          const ageA = patientA ? calculateAge(patientA.demographics.birthDate) : 0;
          const ageB = patientB ? calculateAge(patientB.demographics.birthDate) : 0;
          comparison = ageA - ageB;
          break;
        case 'sex':
          comparison = (patientA?.demographics.gender || '').localeCompare(patientB?.demographics.gender || '');
          break;
        case 'outcome':
          const outcomeOrder = { in_numerator: 0, not_in_numerator: 1, excluded: 2, not_in_population: 3 };
          comparison = outcomeOrder[a.finalOutcome] - outcomeOrder[b.finalOutcome];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return traces;
  }, [validationTraces, populationFilter, genderFilter, ageRange, sortField, sortDirection, testPatients]);

  const filteredTraces = filteredAndSortedTraces;

  // Handle filter click
  const handleFilterClick = useCallback((filter) => {
    setPopulationFilter(prev => prev === filter ? 'all' : filter);
  }, []);

  // Toggle sort direction or change sort field
  const handleSortChange = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setGenderFilter('all');
    setAgeRange({ min: null, max: null });
    setPopulationFilter('all');
  }, []);

  if (!measure) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[var(--text-dim)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No Measure Selected</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Select a measure from the library to generate test patients and validate measure logic.
          </p>
          <button
            onClick={() => useMeasureStore.getState().setActiveTab('library')}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors inline-flex items-center gap-2"
          >
            <Library className="w-4 h-4" />
            Go to Measure Library
          </button>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const stats = {
    total: validationTraces.length,
    inNumerator: validationTraces.filter(t => t.finalOutcome === 'in_numerator').length,
    notControlled: validationTraces.filter(t => t.finalOutcome === 'not_in_numerator').length,
    excluded: validationTraces.filter(t => t.finalOutcome === 'excluded').length,
    notInPop: validationTraces.filter(t => t.finalOutcome === 'not_in_population').length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-4">
            <button
              onClick={() => setActiveTab('library')}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Measure Library
            </button>
            <ChevronRight className="w-4 h-4 text-[var(--text-dim)]" />
            <span className="text-[var(--text-muted)]">{measure.metadata.measureId}</span>
            <ChevronRight className="w-4 h-4 text-[var(--text-dim)]" />
            <span className="text-[var(--text)]">Test Validation</span>
          </nav>

          {/* Measure & Code Format Info */}
          <div className="flex items-start gap-6 mb-4">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-1">Validating Measure</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[var(--text)]">{measure.metadata.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span className="font-mono">{measure.metadata.measureId}</span>
                    <span className="text-[var(--text-dim)]">•</span>
                    <span>v{measure.metadata.version}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-1">Generated Code</div>
              <button
                onClick={() => setActiveTab('codegen')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors group"
              >
                <CodeIcon className={`w-5 h-5 ${codeInfo.color}`} />
                <span className={`font-medium ${codeInfo.color}`}>{codeInfo.label}</span>
                <span className="text-xs text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">← Change</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-4">
            Running {stats.total} synthetic test patients through the generated <span className={`font-medium ${codeInfo.color}`}>{codeInfo.label}</span> code.
          </p>

          {/* Summary stats */}
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => handleFilterClick('in_numerator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                populationFilter === 'in_numerator'
                  ? 'bg-[var(--success-light)] border-2 border-[var(--success)]/60 ring-2 ring-[var(--success)]/20'
                  : 'bg-[var(--success-light)] border border-[var(--success)]/20 hover:opacity-80'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
              <span className="text-[var(--success)] font-medium">{stats.inNumerator}</span>
              <span className="text-[var(--text-muted)]">In Numerator</span>
            </button>
            <button
              onClick={() => handleFilterClick('not_in_numerator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                populationFilter === 'not_in_numerator'
                  ? 'bg-[var(--danger-light)] border-2 border-[var(--danger)]/60 ring-2 ring-[var(--danger)]/20'
                  : 'bg-[var(--danger-light)] border border-[var(--danger)]/20 hover:opacity-80'
              }`}
            >
              <XCircle className="w-4 h-4 text-[var(--danger)]" />
              <span className="text-[var(--danger)] font-medium">{stats.notControlled}</span>
              <span className="text-[var(--text-muted)]">In Denominator</span>
            </button>
            <button
              onClick={() => handleFilterClick('excluded')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                populationFilter === 'excluded'
                  ? 'bg-[var(--warning-light)] border-2 border-[var(--warning)]/60 ring-2 ring-[var(--warning)]/20'
                  : 'bg-[var(--warning-light)] border border-[var(--warning)]/20 hover:opacity-80'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
              <span className="text-[var(--warning)] font-medium">{stats.excluded}</span>
              <span className="text-[var(--text-muted)]">Excluded</span>
            </button>
            <button
              onClick={() => handleFilterClick('not_in_population')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                populationFilter === 'not_in_population'
                  ? 'bg-slate-500/25 border-2 border-slate-400/60 ring-2 ring-slate-500/20'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)]/80'
              }`}
            >
              <span className="text-[var(--text-muted)] font-medium">{stats.notInPop}</span>
              <span className="text-[var(--text-dim)]">Not in Population</span>
            </button>
            {populationFilter !== 'all' && (
              <button
                onClick={() => setPopulationFilter('all')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Patient list */}
        <div className="w-80 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-[var(--text)]">Test Patients</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showFilters || genderFilter !== 'all' || ageRange.min !== null || ageRange.max !== null
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                }`}
                title="Filter patients"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {filteredTraces.length === stats.total
                ? `${stats.total} synthetic patients`
                : `${filteredTraces.length} of ${stats.total} patients`}
            </p>

            {/* Sort controls */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              <span className="text-xs text-[var(--text-dim)] mr-1">Sort:</span>
              {['name', 'age', 'sex', 'outcome'].map(field => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    sortField === field
                      ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span className="capitalize">{field}</span>
                  {sortField === field && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Gender</label>
                  <div className="flex gap-1">
                    {['all', 'male', 'female'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          genderFilter === g
                            ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Age Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={ageRange.min ?? ''}
                      onChange={(e) => setAgeRange(prev => ({ ...prev, min: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-16 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-[var(--text)]"
                    />
                    <span className="text-xs text-[var(--text-dim)]">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={ageRange.max ?? ''}
                      onChange={(e) => setAgeRange(prev => ({ ...prev, max: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-16 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-[var(--text)]"
                    />
                  </div>
                </div>

                {(genderFilter !== 'all' || ageRange.min !== null || ageRange.max !== null) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Patient list */}
          <div className="flex-1 overflow-auto p-2">
            {isGenerating ? (
              <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
                <span>Loading...</span>
              </div>
            ) : filteredTraces.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No patients match your filters
              </div>
            ) : filteredTraces.map((trace, index) => {
              const patient = testPatients.find(p => p.id === trace.patientId);
              const age = patient ? calculateAge(patient.demographics.birthDate) : null;
              const gender = patient?.demographics.gender;

              return (
                <button
                  key={trace.patientId}
                  onClick={() => handleSelectPatient(trace, index)}
                  className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                    selectedTrace?.patientId === trace.patientId
                      ? 'bg-[var(--accent-light)] border border-[var(--accent)]/30'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      gender === 'male' ? 'bg-blue-500/15' : gender === 'female' ? 'bg-pink-500/15' : 'bg-[var(--bg-tertiary)]'
                    }`}>
                      <User className={`w-4 h-4 ${
                        gender === 'male' ? 'text-[var(--accent)]' : gender === 'female' ? 'text-pink-400' : 'text-[var(--text-muted)]'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text)] truncate">{trace.patientName}</div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                        {age !== null && <span>{age} yrs</span>}
                        {gender && <span className="capitalize">{gender}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <OutcomeBadge outcome={trace.finalOutcome} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trace detail */}
        {selectedTrace ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Patient header */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[var(--text)]">{selectedTrace.patientName}</h1>
                  <OutcomeBadge outcome={selectedTrace.finalOutcome} />
                </div>
              </div>

              {/* Measure Evaluation Summary */}
              <div className="mb-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent)]" />
                  Measure Evaluation Summary
                </h3>
                <div className="space-y-3">
                  <EvaluationFlowItem
                    label="Initial Population"
                    met={selectedTrace.populations.initialPopulation.met}
                    nodes={selectedTrace.populations.initialPopulation.nodes}
                    metText="Patient qualifies"
                    notMetText="Patient does not qualify"
                  />

                  {selectedTrace.populations.initialPopulation.met && (
                    <EvaluationFlowItem
                      label="Denominator"
                      met={selectedTrace.populations.denominator?.met ?? selectedTrace.populations.initialPopulation.met}
                      nodes={selectedTrace.populations.denominator?.nodes ?? []}
                      metText="Included in denominator"
                      notMetText="Not in denominator"
                      isImplied={!selectedTrace.populations.denominator?.nodes?.length}
                      impliedText="Equals Initial Population"
                    />
                  )}

                  {selectedTrace.populations.initialPopulation.met && selectedTrace.populations.exclusions.met && (
                    <EvaluationFlowItem
                      label="Denominator Exclusions"
                      met={false}
                      nodes={selectedTrace.populations.exclusions.nodes.filter(n => n.status === 'pass')}
                      metText=""
                      notMetText="Excluded from measure"
                      showTrigger
                    />
                  )}

                  {selectedTrace.populations.initialPopulation.met && !selectedTrace.populations.exclusions.met && (
                    <EvaluationFlowItem
                      label="Numerator"
                      met={selectedTrace.populations.numerator.met}
                      nodes={selectedTrace.populations.numerator.nodes}
                      metText="Quality criteria met"
                      notMetText="Quality criteria not met"
                    />
                  )}

                  {selectedTrace.howClose && selectedTrace.howClose.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <div className="text-xs font-medium text-[var(--accent)] mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Gaps to Close
                      </div>
                      <ul className="space-y-1">
                        {selectedTrace.howClose.map((item, i) => (
                          <li key={i} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                            <span className="text-[var(--warning)] mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Clinical Details */}
              {selectedPatient && (
                <div className="mb-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <button
                      onClick={() => setShowPatientDetails(!showPatientDetails)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-[var(--text)]">Patient Clinical Data</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Demographics, diagnoses, encounters, observations
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowPatientDetails(!showPatientDetails)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      {showPatientDetails ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>

                  {showPatientDetails && (
                    <div className="p-5 pt-0 space-y-5">
                      {/* Demographics */}
                      <div>
                        <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          Demographics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                            <div className="text-xs text-[var(--text-dim)]">Date of Birth</div>
                            <div className="text-sm font-medium text-[var(--text)]">{selectedPatient.demographics.birthDate}</div>
                          </div>
                          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                            <div className="text-xs text-[var(--text-dim)]">Age</div>
                            <div className="text-sm font-medium text-[var(--text)]">
                              {calculateAge(selectedPatient.demographics.birthDate)} years
                            </div>
                          </div>
                          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                            <div className="text-xs text-[var(--text-dim)]">Gender</div>
                            <div className="text-sm font-medium text-[var(--text)] capitalize">{selectedPatient.demographics.gender}</div>
                          </div>
                        </div>
                      </div>

                      {/* Diagnoses */}
                      {selectedPatient.diagnoses.length > 0 && (
                        <div>
                          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5" />
                            Diagnoses ({selectedPatient.diagnoses.length})
                          </h4>
                          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Code</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Description</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Onset Date</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedPatient.diagnoses.map((dx, i) => (
                                  <tr key={i} className="text-[var(--text)] hover:bg-[var(--bg-tertiary)]/50">
                                    <td className="border-b border-[var(--border)]/50 p-2.5">
                                      <code className="text-[var(--danger)] bg-[var(--danger-light)] px-1.5 py-0.5 rounded font-mono">{dx.code}</code>
                                    </td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5">{dx.display}</td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5 text-[var(--text-muted)]">{dx.onsetDate}</td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5">
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        dx.status === 'active' ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-gray-500/15 text-gray-400'
                                      }`}>
                                        {dx.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Encounters */}
                      {selectedPatient.encounters.length > 0 && (
                        <div>
                          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5" />
                            Encounters ({selectedPatient.encounters.length})
                          </h4>
                          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Code</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Description</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Date</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedPatient.encounters.map((enc, i) => (
                                  <tr key={i} className="text-[var(--text)] hover:bg-[var(--bg-tertiary)]/50">
                                    <td className="border-b border-[var(--border)]/50 p-2.5">
                                      <code className="text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded font-mono">{enc.code}</code>
                                    </td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5">{enc.display}</td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5 text-[var(--text-muted)]">{enc.date}</td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5">
                                      <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent-light)] text-[var(--accent)]">
                                        {enc.type}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Observations */}
                      {selectedPatient.observations.length > 0 && (
                        <div>
                          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            Observations ({selectedPatient.observations.length})
                          </h4>
                          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Code</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Description</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Value</th>
                                  <th className="border-b border-[var(--border)] p-2.5 text-left font-medium">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedPatient.observations.map((obs, i) => (
                                  <tr key={i} className="text-[var(--text)] hover:bg-[var(--bg-tertiary)]/50">
                                    <td className="border-b border-[var(--border)]/50 p-2.5">
                                      <code className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">{obs.code}</code>
                                    </td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5">{obs.display}</td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5 font-medium">
                                      {obs.value !== undefined ? `${obs.value} ${obs.unit || ''}` : '—'}
                                    </td>
                                    <td className="border-b border-[var(--border)]/50 p-2.5 text-[var(--text-muted)]">{obs.date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Initial Population */}
              {selectedTrace.populations.initialPopulation.nodes.length > 0 && (
                <ValidationSection
                  title="Initial Population"
                  subtitle="Patient must meet ALL criteria to be included"
                  nodes={selectedTrace.populations.initialPopulation.nodes}
                  operator="AND"
                  resultChip={selectedTrace.populations.initialPopulation.met ? 'IN POPULATION' : 'NOT IN POPULATION'}
                  resultPositive={selectedTrace.populations.initialPopulation.met}
                  onInspect={setInspectNode}
                />
              )}

              {selectedTrace.populations.exclusions.nodes.length > 0 && (
                <ValidationSection
                  title="Denominator Exclusions"
                  subtitle="ANY one triggers exclusion"
                  nodes={selectedTrace.populations.exclusions.nodes}
                  operator="OR"
                  resultChip={selectedTrace.populations.exclusions.met ? 'EXCLUDED' : 'Not Excluded'}
                  resultPositive={!selectedTrace.populations.exclusions.met}
                  onInspect={setInspectNode}
                />
              )}

              {selectedTrace.populations.numerator.nodes.length > 0 && !selectedTrace.populations.exclusions.met && (
                <ValidationSection
                  title="Numerator"
                  subtitle="Quality action / outcome criteria"
                  nodes={selectedTrace.populations.numerator.nodes}
                  operator="AND"
                  resultChip={selectedTrace.populations.numerator.met ? 'MET' : 'NOT MET'}
                  resultPositive={selectedTrace.populations.numerator.met}
                  onInspect={setInspectNode}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            <p>Select a patient to view their validation trace</p>
          </div>
        )}

        {/* Inspect modal */}
        {inspectNode && (
          <InspectModal node={inspectNode} onClose={() => setInspectNode(null)} />
        )}
      </div>
    </div>
  );
}
