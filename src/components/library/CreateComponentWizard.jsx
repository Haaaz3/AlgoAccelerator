import { useState, useMemo, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Zap,
  Layers,
  Building2,
  Stethoscope,
  Scissors,
  Pill,
  FlaskConical,
  ClipboardList,
  Syringe,
  AlertTriangle,
  TestTube,
  User,
  Target,
  GitBranch,
  Activity,
  Heart,
  MessageSquare,
  Code,
} from 'lucide-react';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore';
import { createAtomicComponent } from '../../services/componentLibraryService';

// ============================================================================
// Category Definitions
// ============================================================================

const CATEGORY_GROUPS = [
  {
    group: 'Clinical',
    items: [
      { id: 'encounter', label: 'Encounter', desc: 'Office visits, ED, telehealth, inpatient stays', icon: Building2,
        blocks: ['valueSet', 'codes', 'timing', 'facilityLocation', 'lengthOfStay', 'negation', 'status'] },
      { id: 'diagnosis', label: 'Diagnosis / Condition', desc: 'Active conditions, resolved, recurrence', icon: Stethoscope,
        blocks: ['valueSet', 'codes', 'timing', 'severity', 'anatomicalLocation', 'status', 'negation'] },
      { id: 'procedure', label: 'Procedure', desc: 'Surgeries, screenings, interventions', icon: Scissors,
        blocks: ['valueSet', 'codes', 'timing', 'result', 'anatomicalLocation', 'negation', 'status'] },
      { id: 'medication', label: 'Medication', desc: 'Prescriptions, administered, dispensed', icon: Pill,
        blocks: ['valueSet', 'codes', 'timing', 'dosage', 'route', 'frequency', 'supply', 'negation', 'status'] },
      { id: 'lab', label: 'Laboratory Test', desc: 'Lab results with values and reference ranges', icon: FlaskConical,
        blocks: ['valueSet', 'codes', 'timing', 'result', 'resultComparator', 'referenceRange', 'interpretation', 'negation', 'status'] },
      { id: 'assessment', label: 'Assessment / Screening', desc: 'PHQ-9, fall risk, tobacco screening', icon: ClipboardList,
        blocks: ['valueSet', 'codes', 'timing', 'result', 'resultComparator', 'negation', 'status'] },
    ],
  },
  {
    group: 'Medication Detail',
    items: [
      { id: 'substance', label: 'Substance', desc: 'Substance use, exposure tracking', icon: TestTube,
        blocks: ['valueSet', 'codes', 'timing', 'negation', 'status'] },
      { id: 'allergy', label: 'Allergy / Intolerance', desc: 'Drug, food, environmental allergies', icon: AlertTriangle,
        blocks: ['valueSet', 'codes', 'timing', 'severity', 'type', 'negation', 'status'] },
      { id: 'immunization', label: 'Immunization', desc: 'Vaccines, administered or historical', icon: Syringe,
        blocks: ['valueSet', 'codes', 'timing', 'doseNumber', 'negation', 'status'] },
    ],
  },
  {
    group: 'Care & Communication',
    items: [
      { id: 'intervention', label: 'Intervention', desc: 'Non-procedure interventions, counseling, education', icon: GitBranch,
        blocks: ['valueSet', 'codes', 'timing', 'negation', 'status'] },
      { id: 'communication', label: 'Communication', desc: 'Patient/provider communication events', icon: MessageSquare,
        blocks: ['valueSet', 'codes', 'timing', 'medium', 'sender', 'recipient', 'negation', 'status'] },
      { id: 'caregoal', label: 'Care Goal', desc: 'Patient care goals, targets, tracking', icon: Target,
        blocks: ['valueSet', 'codes', 'timing', 'targetValue', 'negation', 'status'] },
      { id: 'device', label: 'Device', desc: 'Medical devices, implants, applied devices', icon: Activity,
        blocks: ['valueSet', 'codes', 'timing', 'negation', 'status'] },
    ],
  },
  {
    group: 'Patient Context',
    items: [
      { id: 'demographic', label: 'Patient Demographic', desc: 'Age, sex, race, ethnicity, payer', icon: User,
        blocks: ['attribute', 'attributeComparator', 'timing'] },
      { id: 'familyhistory', label: 'Family History', desc: 'Family member conditions and relationships', icon: Heart,
        blocks: ['valueSet', 'codes', 'relationship', 'timing', 'negation'] },
      { id: 'symptom', label: 'Symptom', desc: 'Reported symptoms and clinical findings', icon: Activity,
        blocks: ['valueSet', 'codes', 'timing', 'severity', 'negation', 'status'] },
    ],
  },
  {
    group: 'Advanced',
    items: [
      { id: 'custom', label: 'Custom / CQL Expression', desc: 'Full control — define any component, including raw CQL', icon: Code,
        blocks: ['valueSet', 'codes', 'timing', 'result', 'resultComparator', 'dosage', 'route', 'frequency', 'supply', 'severity', 'anatomicalLocation', 'facilityLocation', 'lengthOfStay', 'referenceRange', 'interpretation', 'attribute', 'attributeComparator', 'medium', 'sender', 'recipient', 'doseNumber', 'relationship', 'targetValue', 'type', 'negation', 'status', 'cql'] },
    ],
  },
];

const BLOCK_DEFS = {
  valueSet: { label: 'Value Set', section: true },
  codes: { label: 'Codes', section: true },
  timing: { label: 'Timing', section: true },
  result: { label: 'Result Value', section: false },
  resultComparator: { label: 'Result Comparator', section: false },
  referenceRange: { label: 'Reference Range', section: false },
  interpretation: { label: 'Interpretation', section: false },
  dosage: { label: 'Dosage', section: false },
  route: { label: 'Route', section: false },
  frequency: { label: 'Frequency', section: false },
  supply: { label: 'Supply / Days', section: false },
  severity: { label: 'Severity', section: false },
  anatomicalLocation: { label: 'Anatomical Location', section: false },
  facilityLocation: { label: 'Facility Location', section: false },
  lengthOfStay: { label: 'Length of Stay', section: false },
  status: { label: 'Status', section: false },
  negation: { label: 'Negation', section: false },
  attribute: { label: 'Attribute', section: false },
  attributeComparator: { label: 'Attribute Comparator', section: false },
  medium: { label: 'Medium', section: false },
  sender: { label: 'Sender', section: false },
  recipient: { label: 'Recipient', section: false },
  doseNumber: { label: 'Dose Number', section: false },
  relationship: { label: 'Relationship', section: false },
  targetValue: { label: 'Target Value', section: false },
  type: { label: 'Type', section: false },
  cql: { label: 'CQL Expression', section: true },
};

// ============================================================================
// Collapsible Block Component
// ============================================================================

function CollapsibleBlock({ label, defaultOpen = false, children, onRemove }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg mb-2 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center gap-2 transition-colors"
        style={{
          backgroundColor: open ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
        }}
      >
        <span className="transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          <ChevronRight size={14} style={{ color: open ? 'var(--accent)' : 'var(--text-secondary)' }} />
        </span>
        <span
          className="text-xs font-semibold flex-1 text-left"
          style={{ color: open ? 'var(--accent)' : 'var(--text)' }}
        >
          {label}
        </span>
        {onRemove && (
          <span
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="opacity-50 hover:opacity-100 cursor-pointer"
          >
            <Trash2 size={14} style={{ color: 'var(--text-secondary)' }} />
          </span>
        )}
      </button>
      {open && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Logic Block Renderers
// ============================================================================

function ValueSetBlock({ form, update }) {
  return (
    <CollapsibleBlock label="Value Set" defaultOpen={true}>
      <div className="mb-2">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>OID</label>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          placeholder="2.16.840.1.113883.3.464.1003..."
          value={form.vsOid || ''}
          onChange={e => update('vsOid', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Version</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="20230301"
            value={form.vsVersion || ''}
            onChange={e => update('vsVersion', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="e.g., Office Visit"
            value={form.vsName || ''}
            onChange={e => update('vsName', e.target.value)}
          />
        </div>
      </div>
    </CollapsibleBlock>
  );
}

function CodesBlock({ form, update }) {
  const codes = form.codes || [];
  const addCode = () => update('codes', [...codes, { system: 'SNOMED-CT', code: '', display: '' }]);
  const removeCode = (i) => update('codes', codes.filter((_, idx) => idx !== i));
  const updateCode = (i, field, val) => {
    const c = [...codes];
    c[i] = { ...c[i], [field]: val };
    update('codes', c);
  };

  return (
    <CollapsibleBlock label={`Codes (${codes.length})`}>
      {codes.map((c, i) => (
        <div key={i} className="grid grid-cols-[100px_1fr_1fr_28px] gap-2 mb-2 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>System</label>
            <select
              className="w-full px-2 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              value={c.system}
              onChange={e => updateCode(i, 'system', e.target.value)}
            >
              {['SNOMED-CT', 'ICD-10-CM', 'ICD-10-PCS', 'CPT', 'HCPCS', 'LOINC', 'RxNorm', 'CVX', 'CDT', 'Other'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Code</label>
            <input
              type="text"
              className="w-full px-2 py-2 rounded-lg border text-xs outline-none font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="428191000124101"
              value={c.code}
              onChange={e => updateCode(i, 'code', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Display</label>
            <input
              type="text"
              className="w-full px-2 py-2 rounded-lg border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Description"
              value={c.display}
              onChange={e => updateCode(i, 'display', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => removeCode(i)}
            className="w-7 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addCode}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
        style={{ borderColor: 'var(--border)', borderStyle: 'dashed', color: 'var(--accent)' }}
      >
        <Plus size={12} /> Add Code
      </button>
    </CollapsibleBlock>
  );
}

function TimingBlock({ form, update }) {
  const timingPreview = useMemo(() => {
    const parts = [(form.timingOp || 'during').toLowerCase()];
    if (form.timingQuantity) {
      parts.push(form.timingQuantity, (form.timingUnit || 'years').toLowerCase());
    }
    parts.push(form.timingRef || 'Measurement Period');
    return parts.join(' ');
  }, [form.timingOp, form.timingQuantity, form.timingUnit, form.timingRef]);

  return (
    <CollapsibleBlock label="Timing" defaultOpen={true}>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Operator</label>
          <select
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={form.timingOp || 'During'}
            onChange={e => update('timingOp', e.target.value)}
          >
            {['During', 'Before Start', 'After Start', 'Before End', 'After End', 'Overlaps', 'Starts During', 'Ends During', 'Same As', 'Includes', 'Included In', 'Within'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Quantity</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="e.g., 27"
            value={form.timingQuantity || ''}
            onChange={e => update('timingQuantity', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Unit</label>
          <select
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={form.timingUnit || 'Years'}
            onChange={e => update('timingUnit', e.target.value)}
          >
            {['Years', 'Months', 'Weeks', 'Days', 'Hours', 'Minutes'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Position</label>
          <select
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={form.timingPosition || 'None'}
            onChange={e => update('timingPosition', e.target.value)}
          >
            {['None', 'Before', 'After', 'At Start', 'At End'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reference</label>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          value={form.timingRef || 'Measurement Period'}
          onChange={e => update('timingRef', e.target.value)}
        />
      </div>
      <div
        className="mt-2 px-3 py-2 rounded-md text-xs font-mono"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        {timingPreview}
      </div>
    </CollapsibleBlock>
  );
}

function ResultBlock({ form, update }) {
  return (
    <CollapsibleBlock label="Result">
      <div className="grid grid-cols-[80px_1fr_70px] gap-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Operator</label>
          <select
            className="w-full px-2 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={form.resultOp || '>'}
            onChange={e => update('resultOp', e.target.value)}
          >
            {['>', '>=', '<', '<=', '=', '!=', 'is null', 'is not null'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Value</label>
          <input
            type="text"
            className="w-full px-2 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="e.g., 9.0"
            value={form.resultValue || ''}
            onChange={e => update('resultValue', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Unit</label>
          <input
            type="text"
            className="w-full px-2 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="%"
            value={form.resultUnit || ''}
            onChange={e => update('resultUnit', e.target.value)}
          />
        </div>
      </div>
    </CollapsibleBlock>
  );
}

function SimpleFieldBlock({ label, placeholder, formKey, form, update }) {
  return (
    <CollapsibleBlock label={label}>
      <input
        type="text"
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
        placeholder={placeholder}
        value={form[formKey] || ''}
        onChange={e => update(formKey, e.target.value)}
      />
    </CollapsibleBlock>
  );
}

function SelectFieldBlock({ label, formKey, form, update, options }) {
  return (
    <CollapsibleBlock label={label}>
      <select
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
        value={form[formKey] || options[0]}
        onChange={e => update(formKey, e.target.value)}
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </CollapsibleBlock>
  );
}

function NegationBlock({ form, update }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border mb-2"
      style={{
        borderColor: form.negation ? 'var(--accent)' : 'var(--border)',
        backgroundColor: form.negation ? 'var(--accent-muted)' : 'var(--bg-primary)',
      }}
    >
      <div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Negation (absence of / without)</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Represents the absence of this criterion</div>
      </div>
      <button
        type="button"
        onClick={() => update('negation', !form.negation)}
        className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
        style={{ backgroundColor: form.negation ? 'var(--accent)' : 'var(--border)' }}
      >
        <div
          className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
          style={{ left: form.negation ? '22px' : '2px' }}
        />
      </button>
    </div>
  );
}

function CQLBlock({ form, update }) {
  return (
    <CollapsibleBlock label="CQL Expression" defaultOpen={true}>
      <div className="mb-1.5">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Custom CQL</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-y font-mono"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)', minHeight: '100px' }}
          placeholder={'define "Custom Criteria":\n  exists (\n    [Encounter: "Office Visit"] E\n      where E.period during "Measurement Period"\n  )'}
          value={form.cqlExpression || ''}
          onChange={e => update('cqlExpression', e.target.value)}
        />
      </div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        Write a valid CQL expression. This will be included directly in the measure logic.
      </div>
    </CollapsibleBlock>
  );
}

function renderBlock(blockId, form, update) {
  switch (blockId) {
    case 'valueSet': return <ValueSetBlock key={blockId} form={form} update={update} />;
    case 'codes': return <CodesBlock key={blockId} form={form} update={update} />;
    case 'timing': return <TimingBlock key={blockId} form={form} update={update} />;
    case 'result': case 'resultComparator': return <ResultBlock key="result" form={form} update={update} />;
    case 'negation': return <NegationBlock key={blockId} form={form} update={update} />;
    case 'cql': return <CQLBlock key={blockId} form={form} update={update} />;
    case 'status': return <SelectFieldBlock key={blockId} label="Status" formKey="status" form={form} update={update} options={['active', 'completed', 'in-progress', 'not-done', 'on-hold', 'stopped', 'cancelled', 'draft', 'unknown']} />;
    case 'severity': return <SelectFieldBlock key={blockId} label="Severity" formKey="severity" form={form} update={update} options={['mild', 'moderate', 'severe']} />;
    case 'route': return <SimpleFieldBlock key={blockId} label="Route" placeholder="e.g., Oral, IV, Subcutaneous" formKey="route" form={form} update={update} />;
    case 'dosage': return <SimpleFieldBlock key={blockId} label="Dosage" placeholder="e.g., 10 mg" formKey="dosage" form={form} update={update} />;
    case 'frequency': return <SimpleFieldBlock key={blockId} label="Frequency" placeholder="e.g., once daily, BID" formKey="frequency" form={form} update={update} />;
    case 'supply': return <SimpleFieldBlock key={blockId} label="Supply / Days" placeholder="e.g., 90 days" formKey="supply" form={form} update={update} />;
    case 'anatomicalLocation': return <SimpleFieldBlock key={blockId} label="Anatomical Location" placeholder="e.g., Left breast, cervix" formKey="anatomicalLocation" form={form} update={update} />;
    case 'facilityLocation': return <SimpleFieldBlock key={blockId} label="Facility Location" placeholder="e.g., Emergency department" formKey="facilityLocation" form={form} update={update} />;
    case 'lengthOfStay': return <SimpleFieldBlock key={blockId} label="Length of Stay" placeholder="e.g., <= 120 days" formKey="lengthOfStay" form={form} update={update} />;
    case 'referenceRange': return <SimpleFieldBlock key={blockId} label="Reference Range" placeholder="e.g., 4.0 - 5.6 %" formKey="referenceRange" form={form} update={update} />;
    case 'interpretation': return <SelectFieldBlock key={blockId} label="Interpretation" formKey="interpretation" form={form} update={update} options={['Normal', 'Abnormal', 'Critical', 'High', 'Low', 'Positive', 'Negative']} />;
    case 'medium': return <SelectFieldBlock key={blockId} label="Medium" formKey="medium" form={form} update={update} options={['In-person', 'Telephone', 'Email', 'Patient portal', 'Video', 'Other']} />;
    case 'sender': return <SimpleFieldBlock key={blockId} label="Sender" placeholder="e.g., Provider, System" formKey="sender" form={form} update={update} />;
    case 'recipient': return <SimpleFieldBlock key={blockId} label="Recipient" placeholder="e.g., Patient, Caregiver" formKey="recipient" form={form} update={update} />;
    case 'doseNumber': return <SimpleFieldBlock key={blockId} label="Dose Number" placeholder="e.g., 1, 2, booster" formKey="doseNumber" form={form} update={update} />;
    case 'relationship': return <SelectFieldBlock key={blockId} label="Relationship" formKey="relationship" form={form} update={update} options={['Parent', 'Mother', 'Father', 'Sibling', 'Child', 'Grandparent', 'Other']} />;
    case 'targetValue': return <SimpleFieldBlock key={blockId} label="Target Value" placeholder="e.g., HbA1c < 7%" formKey="targetValue" form={form} update={update} />;
    case 'type': return <SelectFieldBlock key={blockId} label="Type" formKey="allergyType" form={form} update={update} options={['Drug', 'Food', 'Environmental', 'Other']} />;
    case 'attribute': return <SimpleFieldBlock key={blockId} label="Attribute" placeholder="e.g., birthdate, gender" formKey="attribute" form={form} update={update} />;
    case 'attributeComparator': return <SimpleFieldBlock key={blockId} label="Attribute Value" placeholder="e.g., >= 18 years, female" formKey="attributeValue" form={form} update={update} />;
    default: return null;
  }
}

// ============================================================================
// Step Bar Component
// ============================================================================

function StepBar({ step, labels }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {labels.map((s, i) => (
        <div key={i} className="flex items-center" style={{ flex: i < labels.length - 1 ? 1 : 'none' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
            style={{
              backgroundColor: step >= i ? 'var(--accent)' : 'var(--border)',
              color: step >= i ? 'white' : 'var(--text-secondary)',
            }}
          >
            {step > i ? <Check size={12} /> : i + 1}
          </div>
          <span
            className="text-xs font-medium ml-1.5 whitespace-nowrap"
            style={{ color: step === i ? 'var(--text)' : 'var(--text-secondary)' }}
          >
            {s}
          </span>
          {i < labels.length - 1 && (
            <div
              className="flex-1 h-px mx-2 transition-colors"
              style={{ backgroundColor: step > i ? 'var(--accent)' : 'var(--border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateComponentWizard({ onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [compType, setCompType] = useState('atomic');
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({
    timingOp: 'During',
    timingUnit: 'Years',
    timingRef: 'Measurement Period',
    status: 'active',
    codes: []
  });
  const [searchFilter, setSearchFilter] = useState('');

  const { addComponent } = useComponentLibraryStore();

  const allCategories = CATEGORY_GROUPS.flatMap(g => g.items);
  const selectedCat = allCategories.find(c => c.id === category);

  const update = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), []);

  const selectCategory = useCallback((catId) => {
    setCategory(catId);
    setStep(1);
  }, []);

  const stepLabels = ['Type', selectedCat?.label || 'Configure', 'Details', 'Review'];

  // Filter categories
  const filteredGroups = useMemo(() => {
    return CATEGORY_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(item =>
        item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    })).filter(g => g.items.length > 0);
  }, [searchFilter]);

  // Complexity calculation
  const complexity = useMemo(() => {
    const score = (form.resultValue ? 1 : 0) + (form.negation ? 1 : 0) + ((form.codes?.length > 0) ? 1 : 0) + (form.cqlExpression ? 2 : 0) + (form.dosage ? 1 : 0);
    if (score <= 1) return { level: 'LOW', score, color: 'text-green-400' };
    if (score <= 3) return { level: 'MEDIUM', score, color: 'text-yellow-400' };
    return { level: 'HIGH', score, color: 'text-red-400' };
  }, [form]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!form.name?.trim() || !selectedCat) return;

    const tags = (form.tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Build timing expression
    const timingParts = [(form.timingOp || 'during').toLowerCase()];
    if (form.timingQuantity) {
      timingParts.push(form.timingQuantity, (form.timingUnit || 'years').toLowerCase());
    }
    timingParts.push(form.timingRef || 'Measurement Period');
    const timingExpression = timingParts.join(' ');

    const component = createAtomicComponent({
      name: form.name.trim(),
      valueSet: {
        oid: form.vsOid?.trim() || '',
        version: form.vsVersion?.trim() || '1.0',
        name: form.vsName?.trim() || '',
      },
      timing: {
        operator: (form.timingOp || 'during').toLowerCase(),
        quantity: form.timingQuantity ? Number(form.timingQuantity) : undefined,
        unit: form.timingQuantity ? (form.timingUnit || 'years').toLowerCase() : undefined,
        reference: form.timingRef || 'Measurement Period',
        displayExpression: timingExpression,
      },
      negation: form.negation || false,
      category: form.categoryOverride || selectedCat.id,
      tags,
    });

    // Attach codes and additional fields
    component.valueSet.codes = form.codes || [];

    // Store additional metadata
    if (form.resultValue) component.metadata.result = { op: form.resultOp, value: form.resultValue, unit: form.resultUnit };
    if (form.dosage) component.metadata.dosage = form.dosage;
    if (form.route) component.metadata.route = form.route;
    if (form.frequency) component.metadata.frequency = form.frequency;
    if (form.severity) component.metadata.severity = form.severity;
    if (form.cqlExpression) component.metadata.cqlExpression = form.cqlExpression;

    addComponent(component);
    onSave();
  }, [form, selectedCat, addComponent, onSave]);

  const canNext = step === 0
    ? (compType === 'atomic' && category)
    : step === 1
    ? (form.name || '').trim().length > 0
    : step === 2
    ? true
    : false;

  // ============================================================================
  // Step 0: Category Selection
  // ============================================================================
  const renderStep0 = () => (
    <div>
      {/* Atomic vs Composite */}
      <div className="text-xs font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-secondary)' }}>
        Component structure
      </div>
      <div className="flex gap-2 mb-5">
        {[
          { key: 'atomic', label: 'Atomic', desc: 'Single criterion with one value set', icon: Zap },
          { key: 'composite', label: 'Composite', desc: 'Combines multiple components with AND/OR', icon: Layers },
        ].map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setCompType(opt.key)}
            className="flex-1 p-3 rounded-lg text-left transition-all border"
            style={{
              borderColor: compType === opt.key ? 'var(--accent)' : 'var(--border)',
              backgroundColor: compType === opt.key ? 'var(--accent-muted)' : 'var(--bg-primary)',
              borderWidth: compType === opt.key ? '2px' : '1.5px',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <opt.icon size={16} style={{ color: compType === opt.key ? 'var(--accent)' : 'var(--text-secondary)' }} />
              <span className="text-sm font-semibold" style={{ color: compType === opt.key ? 'var(--accent)' : 'var(--text)' }}>
                {opt.label}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.35 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {compType === 'atomic' && (
        <>
          <div className="text-xs font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            Select category
          </div>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Search categories..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />

          <div className="max-h-[300px] overflow-y-auto pr-1">
            {filteredGroups.map(group => (
              <div key={group.group} className="mb-3.5">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {group.group}
                </div>
                <div className="flex flex-col gap-1">
                  {group.items.map(cat => {
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.id)}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all w-full hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <IconComponent size={16} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{cat.label}</div>
                          <div
                            className="text-xs truncate"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {cat.desc}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{cat.blocks.length} fields</span>
                          <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {compType === 'composite' && (
        <div
          className="p-4 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', lineHeight: 1.5 }}
        >
          Composite components combine existing atomic components with AND/OR logic. Create your atomic components first, then combine them from the UMS Editor.
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Step 1: Core Fields
  // ============================================================================
  const renderStep1 = () => {
    const coreBlocks = (selectedCat?.blocks || []).filter(b => BLOCK_DEFS[b]?.section);
    const IconComponent = selectedCat?.icon;

    return (
      <div>
        <div
          className="flex items-center gap-2 mb-4 p-2.5 rounded-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-muted)' }}
          >
            {IconComponent && <IconComponent size={14} style={{ color: 'var(--accent)' }} />}
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selectedCat?.label}</span>
          <button
            type="button"
            onClick={() => { setStep(0); setCategory(null); }}
            className="ml-auto text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            Change
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Component Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder={`e.g., Qualifying ${selectedCat?.label || 'Component'} During MP`}
            value={form.name || ''}
            onChange={e => update('name', e.target.value)}
          />
        </div>

        {coreBlocks.map(blockId => renderBlock(blockId, form, update))}
      </div>
    );
  };

  // ============================================================================
  // Step 2: Detail Blocks
  // ============================================================================
  const renderStep2 = () => {
    const detailBlocks = (selectedCat?.blocks || []).filter(b => !BLOCK_DEFS[b]?.section);

    return (
      <div>
        <div className="text-xs font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-secondary)' }}>
          Refine your {selectedCat?.label?.toLowerCase()} component
        </div>

        {detailBlocks.map(blockId => renderBlock(blockId, form, update))}

        <div className="mt-1">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tags (optional)</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="encounter, qualifying, screening (comma-separated)"
            value={form.tags || ''}
            onChange={e => update('tags', e.target.value)}
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
          <select
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={form.categoryOverride || selectedCat?.id}
            onChange={e => update('categoryOverride', e.target.value)}
          >
            {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Review
  // ============================================================================
  const renderStep3 = () => {
    const rows = [
      { label: 'Name', value: form.name || '(unnamed)' },
      { label: 'Type', value: `Atomic / ${selectedCat?.label}` },
      form.vsName && { label: 'Value Set', value: `${form.vsName}${form.vsOid ? ` (${form.vsOid})` : ''}` },
      form.codes?.length > 0 && { label: 'Codes', value: `${form.codes.length} code(s)` },
      selectedCat?.blocks.includes('timing') && {
        label: 'Timing',
        value: `${(form.timingOp || 'during').toLowerCase()} ${form.timingQuantity ? form.timingQuantity + ' ' + (form.timingUnit || 'years').toLowerCase() + ' ' : ''}${form.timingRef || 'Measurement Period'}`
      },
      form.resultValue && { label: 'Result', value: `${form.resultOp || '>'} ${form.resultValue}${form.resultUnit || ''}` },
      form.dosage && { label: 'Dosage', value: form.dosage },
      form.route && { label: 'Route', value: form.route },
      form.frequency && { label: 'Frequency', value: form.frequency },
      form.severity && { label: 'Severity', value: form.severity },
      form.negation && { label: 'Negation', value: 'Yes — absence of' },
      form.status && form.status !== 'active' && { label: 'Status', value: form.status },
      form.tags && { label: 'Tags', value: form.tags },
      form.cqlExpression && { label: 'CQL', value: 'Custom expression defined' },
    ].filter(Boolean);

    return (
      <div>
        <div
          className="rounded-lg border overflow-hidden mb-3"
          style={{ borderColor: 'var(--border)' }}
        >
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="flex p-3"
              style={{
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
              }}
            >
              <span
                className="text-xs font-semibold w-24 flex-shrink-0"
                style={{ color: 'var(--text-secondary)' }}
              >
                {r.label}
              </span>
              <span
                className="text-xs break-all"
                style={{
                  color: 'var(--text)',
                  fontFamily: ['Timing', 'CQL', 'Value Set'].includes(r.label) ? 'monospace' : 'inherit',
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between p-3 rounded-lg border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Estimated Complexity</span>
          <span className={`text-xs font-bold ${complexity.color}`}>{complexity.level} ({complexity.score})</span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-xl shadow-2xl border w-full max-w-xl max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-muted)', border: '1px solid var(--accent)' }}
            >
              <Plus size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Create Component</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Define a reusable measure building block</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <StepBar step={step} labels={stepLabels} />
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              opacity: step > 0 ? 1 : 0.7,
            }}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Skip details
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (step === 3) {
                  handleSave();
                } else if (canNext) {
                  setStep(step + 1);
                }
              }}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: (step === 3 || canNext) ? 'var(--accent)' : 'var(--border)',
                color: (step === 3 || canNext) ? 'white' : 'var(--text-secondary)',
                cursor: (step === 3 || canNext) ? 'pointer' : 'not-allowed',
                boxShadow: (step === 3 || canNext) ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {step === 3 ? 'Create Component' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
