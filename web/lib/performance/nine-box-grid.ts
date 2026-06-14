/**
 * Nine-Box Grid classifier for performance calibration.
 *
 * Maps (performance, potential) scores → 9-box grid position.
 * Standard HR talent management tool used in calibration sessions.
 *
 * Grid layout (potential Y-axis, performance X-axis):
 * [7: Star] [8: Rising Star] [9: Superstar]
 * [4: Core] [5: Key Player] [6: High Performer]
 * [1: Risk] [2: Solid]      [3: Specialist]
 *
 * @module lib/performance/nine-box-grid
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Labels for each of the 9 grid boxes (1-indexed). */
const BOX_LABELS: Record<number, string> = {
  1: 'Under Performer',
  2: 'Solid Professional',
  3: 'Technical Specialist',
  4: 'Core Contributor',
  5: 'Key Player',
  6: 'High Performer',
  7: 'Star',
  8: 'Rising Star',
  9: 'Superstar',
};

/** Development recommendations per box. */
const BOX_RECOMMENDATIONS: Record<number, string> = {
  1: 'Initiate PIP or reassignment. Immediate manager attention required.',
  2: 'Provide coaching and development opportunities. Set clearer goals.',
  3: 'Leverage technical expertise. Explore lateral career moves.',
  4: 'Recognize consistency. Explore expanded responsibilities.',
  5: 'Accelerate development. Consider stretch assignments.',
  6: 'Fast-track for leadership. Assign mentoring role.',
  7: 'Retain with recognition and compensation. Succession candidate.',
  8: 'Invest in rapid development. High-visibility projects.',
  9: 'Critical talent. Succession plan immediately. Premium retention.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NineBoxPosition {
  /** Box number 1–9. */
  box: number;
  /** Performance tier: 'low' | 'medium' | 'high'. */
  performanceTier: 'low' | 'medium' | 'high';
  /** Potential tier: 'low' | 'medium' | 'high'. */
  potentialTier: 'low' | 'medium' | 'high';
  label: string;
  recommendation: string;
}

export interface NineBoxEmployee {
  employeeId: string;
  employeeName: string;
  department: string | null;
  performanceScore: number;
  potentialScore: number;
  position: NineBoxPosition;
}

export interface NineBoxGrid {
  /** Map of box number → employees in that box. */
  boxes: Record<number, NineBoxEmployee[]>;
  /** Summary counts per box. */
  summary: Record<number, { label: string; count: number }>;
  totalEmployees: number;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Classifies a single employee into their nine-box position.
 *
 * @param performanceScore - 0–5 rating (from review overall_rating).
 * @param potentialScore   - 0–5 rating (from goal completion %, derived).
 * @returns NineBoxPosition with box number, label, and recommendation.
 */
export function classify(
  performanceScore: number,
  potentialScore: number
): NineBoxPosition {
  const performanceTier = scoreTier(performanceScore);
  const potentialTier = scoreTier(potentialScore);
  const box = resolveBox(performanceTier, potentialTier);

  return {
    box,
    performanceTier,
    potentialTier,
    label: BOX_LABELS[box],
    recommendation: BOX_RECOMMENDATIONS[box],
  };
}

/**
 * Builds a full nine-box grid from an array of employees with scores.
 *
 * @param employees - Array of employees with performance and potential scores.
 * @returns Complete NineBoxGrid with boxes map and summary counts.
 */
export function buildNineBoxGrid(
  employees: Array<{
    employeeId: string;
    employeeName: string;
    department: string | null;
    performanceScore: number;
    potentialScore: number;
  }>
): NineBoxGrid {
  const boxes: Record<number, NineBoxEmployee[]> = {};

  for (let i = 1; i <= 9; i++) {
    boxes[i] = [];
  }

  for (const emp of employees) {
    const position = classify(emp.performanceScore, emp.potentialScore);
    boxes[position.box].push({ ...emp, position });
  }

  const summary: Record<number, { label: string; count: number }> = {};
  for (let i = 1; i <= 9; i++) {
    summary[i] = { label: BOX_LABELS[i], count: boxes[i].length };
  }

  return { boxes, summary, totalEmployees: employees.length };
}

/**
 * Derives a potential score from goal completion percentage.
 * Maps 0–100% completion to a 0–5 scale.
 *
 * @param goalCompletionPercent - 0–100.
 * @returns Potential score 0–5.
 */
export function derivePotenialFromGoals(goalCompletionPercent: number): number {
  return Math.min(5, (goalCompletionPercent / 100) * 5);
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

type Tier = 'low' | 'medium' | 'high';

/** Maps a 0–5 score to a low/medium/high tier. */
function scoreTier(score: number): Tier {
  if (score >= 4) return 'high';
  if (score >= 2.5) return 'medium';
  return 'low';
}

/**
 * Resolves the 1–9 box number from performance and potential tiers.
 * Grid is standard McKinsey 9-box (potential=Y, performance=X).
 */
function resolveBox(performanceTier: Tier, potentialTier: Tier): number {
  const grid: Record<Tier, Record<Tier, number>> = {
    low:    { low: 1, medium: 4, high: 7 },
    medium: { low: 2, medium: 5, high: 8 },
    high:   { low: 3, medium: 6, high: 9 },
  };
  return grid[performanceTier][potentialTier];
}
