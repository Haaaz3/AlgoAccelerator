// ============================================================
// Timing Resolution Utility
// ============================================================
// Forward: TimingConstraint + Measurement Period → concrete date window
// Reverse: desired date window → TimingConstraint parameters
// ============================================================

import type { TimingConstraint } from '../types/ums';

export interface ResolvedWindow {
  from: Date;
  to: Date;
}

// ── Date arithmetic helpers ──────────────────────────────────

function subtractTime(date: Date, value: number, unit: string): Date {
  const d = new Date(date);
  if (unit === 'year(s)') d.setFullYear(d.getFullYear() - value);
  else if (unit === 'month(s)') d.setMonth(d.getMonth() - value);
  else if (unit === 'day(s)') d.setDate(d.getDate() - value);
  return d;
}

function addTime(date: Date, value: number, unit: string): Date {
  const d = new Date(date);
  if (unit === 'year(s)') d.setFullYear(d.getFullYear() + value);
  else if (unit === 'month(s)') d.setMonth(d.getMonth() + value);
  else if (unit === 'day(s)') d.setDate(d.getDate() + value);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function toSafeDate(isoDate: string): Date {
  return new Date(isoDate + 'T00:00:00');
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Forward resolution ───────────────────────────────────────

/**
 * Resolves a structured timing constraint into a concrete date window
 * given a measurement period.
 *
 * Returns null if the timing cannot be resolved (e.g., anchor is
 * "Encounter Period" which is patient-specific).
 */
export function resolveTimingWindow(
  timing: TimingConstraint,
  mpStart: string,
  mpEnd: string
): ResolvedWindow | null {
  if (!timing || !mpStart || !mpEnd) return null;

  const start = toSafeDate(mpStart);
  const end = toSafeDate(mpEnd);
  const { operator: op, value: val, unit, anchor } = timing;

  // "during" family — window equals the anchor period
  if (['during', 'starts during', 'ends during', 'overlaps'].includes(op)) {
    if (anchor === 'Measurement Period') return { from: start, to: end };
    if (anchor === 'Measurement Period Start') return { from: start, to: start };
    if (anchor === 'Measurement Period End') return { from: end, to: end };
    return null; // Encounter Period, Diagnosis Date — cannot resolve statically
  }

  // "within" — lookback from anchor
  if (op === 'within' && val && unit) {
    if (anchor === 'Measurement Period End')
      return { from: subtractTime(end, val, unit), to: end };
    if (anchor === 'Measurement Period Start')
      return { from: subtractTime(start, val, unit), to: start };
    if (anchor === 'Measurement Period')
      return { from: subtractTime(start, val, unit), to: end };
    return null;
  }

  // "before end of" — lookback from anchor
  if (op === 'before end of' && val && unit) {
    if (
      anchor === 'Measurement Period End' ||
      anchor === 'Measurement Period'
    ) {
      return { from: subtractTime(end, val, unit), to: end };
    }
    return null;
  }

  // "after start of" — look forward from anchor
  if (op === 'after start of' && val && unit) {
    if (
      anchor === 'Measurement Period Start' ||
      anchor === 'Measurement Period'
    ) {
      return { from: start, to: addTime(start, val, unit) };
    }
    return null;
  }

  return null;
}

// ── Reverse calculation ──────────────────────────────────────

/**
 * Given a desired date window, back-calculates the timing constraint
 * parameters. Tries to express the result in the cleanest unit
 * (years > months > days).
 *
 * Used when the user edits dates directly in "Date Range" mode.
 */
export function reverseCalcTiming(
  fromDate: string,
  toDate: string,
  currentTiming: TimingConstraint,
  mpStart: string,
  mpEnd: string
): TimingConstraint {
  const mpStartD = toSafeDate(mpStart);
  const mpEndD = toSafeDate(mpEnd);
  const from = toSafeDate(fromDate);
  const to = toSafeDate(toDate);

  const { operator: op } = currentTiming;

  // "during" family: if dates still match MP, keep as-is; otherwise convert to "within"
  if (['during', 'starts during', 'ends during', 'overlaps'].includes(op)) {
    if (
      from.getTime() === mpStartD.getTime() &&
      to.getTime() === mpEndD.getTime()
    ) {
      return { ...currentTiming };
    }
    return convertToWithin(from, to, mpStartD, mpEndD, currentTiming);
  }

  // "within" / "before end of" — recalc value from anchor → from
  if (op === 'within' || op === 'before end of') {
    const anchorDate =
      currentTiming.anchor === 'Measurement Period Start'
        ? mpStartD
        : mpEndD;
    return computeBackward(anchorDate, from, currentTiming);
  }

  // "after start of" — recalc value from anchor → to
  if (op === 'after start of') {
    const anchorDate =
      currentTiming.anchor === 'Measurement Period End'
        ? mpEndD
        : mpStartD;
    return computeForward(anchorDate, to, currentTiming);
  }

  return { ...currentTiming };
}

// ── Reverse calculation helpers ──────────────────────────────

/**
 * Try to express (anchor - from) in years, then months, then days.
 */
function computeBackward(
  anchor: Date,
  from: Date,
  timing: TimingConstraint
): TimingConstraint {
  // Try years
  const diffYears = anchor.getFullYear() - from.getFullYear();
  if (diffYears > 0) {
    const test = new Date(anchor);
    test.setFullYear(test.getFullYear() - diffYears);
    if (test.getTime() === from.getTime()) {
      return { ...timing, value: diffYears, unit: 'year(s)' };
    }
  }

  // Try months
  const diffMonths =
    (anchor.getFullYear() - from.getFullYear()) * 12 +
    (anchor.getMonth() - from.getMonth());
  if (diffMonths > 0) {
    const test = new Date(anchor);
    test.setMonth(test.getMonth() - diffMonths);
    if (test.getDate() === from.getDate()) {
      return { ...timing, value: diffMonths, unit: 'month(s)' };
    }
  }

  // Fall back to days
  const diffDays = daysBetween(from, anchor);
  if (diffDays > 0) {
    return { ...timing, value: diffDays, unit: 'day(s)' };
  }

  return { ...timing };
}

/**
 * Try to express (to - anchor) in years, then months, then days.
 */
function computeForward(
  anchor: Date,
  to: Date,
  timing: TimingConstraint
): TimingConstraint {
  const diffYears = to.getFullYear() - anchor.getFullYear();
  if (diffYears > 0) {
    const test = new Date(anchor);
    test.setFullYear(test.getFullYear() + diffYears);
    if (test.getTime() === to.getTime()) {
      return { ...timing, value: diffYears, unit: 'year(s)' };
    }
  }

  const diffDays = daysBetween(anchor, to);
  if (diffDays > 0) {
    return { ...timing, value: diffDays, unit: 'day(s)' };
  }

  return { ...timing };
}

/**
 * Convert a "during" constraint to a "within" constraint when
 * the user changes dates away from the measurement period.
 */
function convertToWithin(
  from: Date,
  to: Date,
  mpStart: Date,
  mpEnd: Date,
  timing: TimingConstraint
): TimingConstraint {
  // If "to" aligns with MP end, express as "within N of MP End"
  if (to.getTime() === mpEnd.getTime()) {
    return {
      ...computeBackward(mpEnd, from, {
        ...timing,
        operator: 'within',
        anchor: 'Measurement Period End',
      }),
    };
  }

  // If "to" aligns with MP start, express as "within N of MP Start"
  if (to.getTime() === mpStart.getTime()) {
    return {
      ...computeBackward(mpStart, from, {
        ...timing,
        operator: 'within',
        anchor: 'Measurement Period Start',
      }),
    };
  }

  // Generic: express as days from MP end
  const diffDays = daysBetween(from, mpEnd);
  return {
    ...timing,
    operator: 'within',
    value: diffDays,
    unit: 'day(s)',
    anchor: 'Measurement Period End',
  };
}

/**
 * Formats a timing constraint as a human-readable string.
 */
export function formatTimingExpression(timing: TimingConstraint): string {
  const { operator, value, unit, anchor } = timing;

  if (['during', 'starts during', 'ends during', 'overlaps'].includes(operator)) {
    return `${operator} ${anchor}`;
  }

  if (value !== null && unit !== null) {
    return `${operator} ${value} ${unit} of ${anchor}`;
  }

  return `${operator} ${anchor}`;
}
