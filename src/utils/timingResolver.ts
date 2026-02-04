// ============================================================
// Timing Resolution Utility
// ============================================================
// Forward: TimingConstraint + Measurement Period → concrete date window
// Reverse: desired date window → TimingConstraint parameters
// ============================================================

import type { TimingConstraint, TimingWindow, TimingBoundary, TimingAnchor, OffsetUnit } from '../types/ums';

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

// ============================================================
// Timing Window Parsing and Formatting
// ============================================================

const ANCHOR_ALIASES: Record<string, TimingAnchor> = {
  'ipsd': 'IPSD',
  'iped': 'IPED',
  'measurement period start': 'Measurement Period Start',
  'measurement period end': 'Measurement Period End',
  'mp start': 'Measurement Period Start',
  'mp end': 'Measurement Period End',
  'start of measurement period': 'Measurement Period Start',
  'end of measurement period': 'Measurement Period End',
  'the measurement period': 'Measurement Period Start', // for "during the measurement period"
  'measurement period': 'Measurement Period Start',
  'encounter start': 'Encounter Start',
  'encounter end': 'Encounter End',
  'diagnosis date': 'Diagnosis Date',
  'procedure date': 'Procedure Date',
  'discharge date': 'Discharge Date',
  'discharge': 'Discharge Date',
};

function parseAnchor(text: string): TimingAnchor | null {
  const normalized = text.toLowerCase().trim();
  return ANCHOR_ALIASES[normalized] || null;
}

function parseUnit(text: string): OffsetUnit | null {
  const normalized = text.toLowerCase().trim();
  if (normalized.startsWith('day')) return 'day(s)';
  if (normalized.startsWith('month')) return 'month(s)';
  if (normalized.startsWith('year')) return 'year(s)';
  return null;
}

/**
 * Parses free-text timing strings into a structured TimingWindow.
 *
 * Handles patterns like:
 * - "From IPSD through 231 days after IPSD"
 * - "During the measurement period"
 * - "Within 10 years of the end of the measurement period"
 * - "From 12 months before IPSD through IPSD"
 * - "From IPSD through IPSD"
 */
export function parseTimingText(text: string): TimingWindow | null {
  if (!text || typeof text !== 'string') return null;

  const normalized = text.toLowerCase().trim();

  // Pattern: "From X through Y" or "From X to Y"
  const fromThroughMatch = normalized.match(
    /^from\s+(.+?)\s+(?:through|to)\s+(.+)$/i
  );

  if (fromThroughMatch) {
    const startBoundary = parseBoundary(fromThroughMatch[1]);
    const endBoundary = parseBoundary(fromThroughMatch[2]);

    if (startBoundary && endBoundary) {
      return { start: startBoundary, end: endBoundary };
    }
  }

  // Pattern: "During the measurement period"
  if (normalized.includes('during') && normalized.includes('measurement period')) {
    return {
      start: { anchor: 'Measurement Period Start', offsetValue: null, offsetUnit: null, offsetDirection: null },
      end: { anchor: 'Measurement Period End', offsetValue: null, offsetUnit: null, offsetDirection: null },
    };
  }

  // Pattern: "Within N units of anchor"
  const withinMatch = normalized.match(
    /^within\s+(\d+)\s+(days?|months?|years?)\s+(?:of\s+)?(?:the\s+)?(.+)$/i
  );

  if (withinMatch) {
    const value = parseInt(withinMatch[1], 10);
    const unit = parseUnit(withinMatch[2]);
    const anchorText = withinMatch[3];
    const anchor = parseAnchor(anchorText);

    if (unit && anchor) {
      // "Within N of end" means from (end - N) to end
      if (anchor === 'Measurement Period End' || anchorText.includes('end')) {
        return {
          start: { anchor: 'Measurement Period End', offsetValue: value, offsetUnit: unit, offsetDirection: 'before' },
          end: { anchor: 'Measurement Period End', offsetValue: null, offsetUnit: null, offsetDirection: null },
        };
      }
      // "Within N of start" means from start to (start + N)
      return {
        start: { anchor: anchor, offsetValue: null, offsetUnit: null, offsetDirection: null },
        end: { anchor: anchor, offsetValue: value, offsetUnit: unit, offsetDirection: 'after' },
      };
    }
  }

  // Log unparseable strings for review
  console.warn(`[parseTimingText] Could not parse: "${text}"`);
  return null;
}

/**
 * Parses a single boundary expression like "IPSD" or "231 days after IPSD"
 */
function parseBoundary(text: string): TimingBoundary | null {
  const normalized = text.toLowerCase().trim();

  // Pattern: "N units before/after anchor"
  const offsetMatch = normalized.match(
    /^(\d+)\s+(days?|months?|years?)\s+(before|after)\s+(.+)$/i
  );

  if (offsetMatch) {
    const value = parseInt(offsetMatch[1], 10);
    const unit = parseUnit(offsetMatch[2]);
    const direction = offsetMatch[3].toLowerCase() as 'before' | 'after';
    const anchor = parseAnchor(offsetMatch[4]);

    if (unit && anchor) {
      return { anchor, offsetValue: value, offsetUnit: unit, offsetDirection: direction };
    }
  }

  // Pattern: "anchor + N units" or "anchor - N units"
  const plusMinusMatch = normalized.match(
    /^(.+?)\s*([+-])\s*(\d+)\s*(days?|months?|years?)?$/i
  );

  if (plusMinusMatch) {
    const anchor = parseAnchor(plusMinusMatch[1]);
    const direction = plusMinusMatch[2] === '+' ? 'after' : 'before';
    const value = parseInt(plusMinusMatch[3], 10);
    const unit = plusMinusMatch[4] ? parseUnit(plusMinusMatch[4]) : 'day(s)';

    if (anchor && unit) {
      return { anchor, offsetValue: value, offsetUnit: unit, offsetDirection: direction };
    }
  }

  // Simple anchor with no offset
  const anchor = parseAnchor(normalized);
  if (anchor) {
    return { anchor, offsetValue: null, offsetUnit: null, offsetDirection: null };
  }

  return null;
}

/**
 * Formats a TimingBoundary as a human-readable string.
 */
export function formatBoundary(boundary: TimingBoundary): string {
  const { anchor, offsetValue, offsetUnit, offsetDirection } = boundary;

  if (offsetValue === null || offsetUnit === null || offsetDirection === null) {
    return anchor;
  }

  return `${offsetValue} ${offsetUnit} ${offsetDirection} ${anchor}`;
}

/**
 * Formats a TimingWindow as a human-readable string.
 */
export function formatTimingWindow(window: TimingWindow): string {
  const startStr = formatBoundary(window.start);
  const endStr = formatBoundary(window.end);

  // Same boundary = single point
  if (startStr === endStr) {
    return `At ${startStr}`;
  }

  return `From ${startStr} through ${endStr}`;
}

/**
 * Formats a TimingWindow as a compact resolved expression.
 * For measurement-period anchors with known dates, shows concrete dates.
 * For patient-specific anchors, shows symbolic form.
 */
export function formatWindowResolved(
  window: TimingWindow,
  mpStart?: string,
  mpEnd?: string
): string {
  const startStr = formatBoundaryShort(window.start, mpStart, mpEnd);
  const endStr = formatBoundaryShort(window.end, mpStart, mpEnd);

  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr} → ${endStr}`;
}

function formatBoundaryShort(
  boundary: TimingBoundary,
  mpStart?: string,
  mpEnd?: string
): string {
  const { anchor, offsetValue, offsetUnit, offsetDirection } = boundary;

  // For MP-based anchors with known dates, try to resolve to concrete date
  if (mpStart && mpEnd) {
    let baseDate: Date | null = null;

    if (anchor === 'Measurement Period Start') {
      baseDate = toSafeDate(mpStart);
    } else if (anchor === 'Measurement Period End') {
      baseDate = toSafeDate(mpEnd);
    }

    if (baseDate) {
      if (offsetValue !== null && offsetUnit !== null && offsetDirection !== null) {
        const resolved = offsetDirection === 'after'
          ? addTime(baseDate, offsetValue, offsetUnit)
          : subtractTime(baseDate, offsetValue, offsetUnit);
        return formatDate(resolved);
      }
      return formatDate(baseDate);
    }
  }

  // For patient-specific anchors, use symbolic form
  const shortAnchor = anchor === 'Measurement Period Start' ? 'MP Start'
    : anchor === 'Measurement Period End' ? 'MP End'
    : anchor;

  if (offsetValue === null || offsetUnit === null || offsetDirection === null) {
    return shortAnchor;
  }

  const sign = offsetDirection === 'after' ? '+' : '-';
  const unitShort = offsetUnit === 'day(s)' ? 'd' : offsetUnit === 'month(s)' ? 'mo' : 'y';
  return `${shortAnchor} ${sign} ${offsetValue}${unitShort}`;
}
