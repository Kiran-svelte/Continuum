/**
 * Attrition Prediction Engine for Continuum HR.
 *
 * Deterministic, rule-based risk scoring using employee signals.
 * No external ML dependency. Designed to be extended with ML later.
 *
 * Features used:
 * - Tenure (months)
 * - Leave pattern (frequency, consecutive rejections)
 * - Salary revision recency
 * - Manager change frequency
 * - Review rating history
 *
 * @module lib/ai-engine/attrition-predictor
 */

import prisma from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Model version for auditability. */
const MODEL_VERSION = 'rule-based-v2';

/** Weight map for risk factors (must sum to 1.0). */
const FACTOR_WEIGHTS = {
  tenureRisk: 0.20,
  leaveAbuse: 0.20,
  salaryStagnation: 0.25,
  managerInstability: 0.15,
  performanceRisk: 0.20,
} as const;

/** Risk score thresholds for categorization. */
const RISK_THRESHOLDS = {
  critical: 0.75,
  high: 0.55,
  medium: 0.35,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AttritionRiskFactor {
  /** Machine-readable factor key. */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Score 0–1 for this factor. */
  score: number;
  /** Explanation for the HR officer. */
  explanation: string;
}

export interface AttritionRiskResult {
  employeeId: string;
  employeeName: string;
  department: string | null;
  riskLevel: RiskLevel;
  /** Composite score 0–1. */
  riskScore: number;
  factors: AttritionRiskFactor[];
  modelVersion: string;
  computedAt: string;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Predicts attrition risk for a single employee.
 *
 * @param employeeId - The employee to evaluate.
 * @param companyId  - Used to scope data access.
 * @returns AttritionRiskResult with full factor breakdown.
 * @throws Error if employee not found or not in company.
 */
export async function predictAttritionRisk(
  employeeId: string,
  companyId: string
): Promise<AttritionRiskResult> {
  const employee = await fetchEmployeeData(employeeId, companyId);

  const [tenureFactor, leaveFactor, salaryFactor, managerFactor, perfFactor] =
    await Promise.all([
      scoreTenureRisk(employee),
      scoreLeavePattern(employeeId, companyId),
      scoreSalaryStagnation(employeeId, companyId),
      scoreManagerInstability(employeeId, companyId),
      scorePerformanceRisk(employeeId, companyId),
    ]);

  const factors = [tenureFactor, leaveFactor, salaryFactor, managerFactor, perfFactor];
  const riskScore = computeCompositeScore(factors);
  const riskLevel = classifyRisk(riskScore);

  return {
    employeeId,
    employeeName: `${employee.first_name} ${employee.last_name}`,
    department: employee.department,
    riskLevel,
    riskScore: Math.round(riskScore * 100) / 100,
    factors,
    modelVersion: MODEL_VERSION,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Predicts attrition risk for all active employees in a company.
 * Optionally filtered by department.
 *
 * @param companyId  - Company scope.
 * @param department - Optional department filter.
 * @returns Array of risk results sorted by riskScore descending.
 */
export async function predictCompanyAttritionRisk(
  companyId: string,
  department?: string
): Promise<AttritionRiskResult[]> {
  const where: Record<string, unknown> = {
    org_id: companyId,
    status: 'active',
    deleted_at: null,
  };

  if (department) {
    where.department = department;
  }

  const employees = await prisma.employee.findMany({
    where,
    select: { id: true },
  });

  const results = await Promise.all(
    employees.map((e) => predictAttritionRisk(e.id, companyId).catch(() => null))
  );

  return results
    .filter((r): r is AttritionRiskResult => r !== null)
    .sort((a, b) => b.riskScore - a.riskScore);
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchEmployeeData(employeeId: string, companyId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, org_id: companyId, deleted_at: null },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      department: true,
      date_of_joining: true,
      status: true,
    },
  });

  if (!employee) {
    throw new Error(`Employee ${employeeId} not found in company ${companyId}`);
  }

  return employee;
}

// ─── Scoring Functions ────────────────────────────────────────────────────────

/**
 * Scores tenure risk. New hires (<6 months) and long-tenured employees
 * in stagnant roles both show elevated risk.
 */
async function scoreTenureRisk(
  employee: { date_of_joining: Date | null }
): Promise<AttritionRiskFactor> {
  if (!employee.date_of_joining) {
    return makeFactor('tenureRisk', 'Tenure Risk', 0.1, 'No join date recorded.');
  }

  const tenureMonths =
    (Date.now() - new Date(employee.date_of_joining).getTime()) / (1000 * 60 * 60 * 24 * 30);

  let score = 0;
  let explanation = '';

  if (tenureMonths < 3) {
    score = 0.7;
    explanation = `Very new hire (${Math.round(tenureMonths)} months). High first-90-day risk.`;
  } else if (tenureMonths < 12) {
    score = 0.4;
    explanation = `Early-tenure employee (${Math.round(tenureMonths)} months). Settling-in phase.`;
  } else if (tenureMonths > 48) {
    score = 0.3;
    explanation = `Long tenure (${Math.round(tenureMonths / 12)} years). Low churn risk unless stagnant.`;
  } else {
    score = 0.15;
    explanation = `Healthy tenure (${Math.round(tenureMonths)} months). Stable zone.`;
  }

  return makeFactor('tenureRisk', 'Tenure Risk', score, explanation);
}

/**
 * Scores leave pattern risk. Flags excessive leaves, rejected leave spikes,
 * or consecutive short-notice requests.
 */
async function scoreLeavePattern(
  employeeId: string,
  companyId: string
): Promise<AttritionRiskFactor> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const leaves = await prisma.leaveRequest.findMany({
    where: { emp_id: employeeId, company_id: companyId, created_at: { gte: oneYearAgo } },
    select: { status: true, total_days: true },
  });

  const total = leaves.length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;
  const totalDays = leaves.reduce((acc, l) => acc + (l.total_days ?? 0), 0);

  let score = 0;
  let explanation = '';

  const rejectionRate = total > 0 ? rejected / total : 0;

  if (total > 15) {
    score += 0.3;
    explanation += `High leave frequency (${total} requests). `;
  }
  if (rejectionRate > 0.4) {
    score += 0.4;
    explanation += `High rejection rate (${Math.round(rejectionRate * 100)}%). `;
  }
  if (totalDays > 30) {
    score += 0.2;
    explanation += `Excessive leave days (${totalDays} days in 12 months). `;
  }

  score = Math.min(1, score);
  if (!explanation) explanation = `Normal leave pattern (${total} requests, ${totalDays} days).`;

  return makeFactor('leaveAbuse', 'Leave Pattern Risk', score, explanation.trim());
}

/**
 * Scores salary stagnation. If no revision in 18+ months, risk increases.
 */
async function scoreSalaryStagnation(
  employeeId: string,
  companyId: string
): Promise<AttritionRiskFactor> {
  const latestRevision = await prisma.salaryRevision.findFirst({
    where: { emp_id: employeeId, company_id: companyId },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });

  if (!latestRevision) {
    return makeFactor('salaryStagnation', 'Salary Stagnation', 0.7, 'No salary revision on record.');
  }

  const monthsSinceRevision =
    (Date.now() - new Date(latestRevision.created_at).getTime()) /
    (1000 * 60 * 60 * 24 * 30);

  let score = 0;
  let explanation = '';

  if (monthsSinceRevision > 24) {
    score = 0.8;
    explanation = `No raise in ${Math.round(monthsSinceRevision)} months (2+ years).`;
  } else if (monthsSinceRevision > 18) {
    score = 0.55;
    explanation = `Last revision ${Math.round(monthsSinceRevision)} months ago.`;
  } else if (monthsSinceRevision > 12) {
    score = 0.3;
    explanation = `Last revision ${Math.round(monthsSinceRevision)} months ago.`;
  } else {
    score = 0.1;
    explanation = `Recent revision ${Math.round(monthsSinceRevision)} months ago.`;
  }

  return makeFactor('salaryStagnation', 'Salary Stagnation', score, explanation);
}

/**
 * Scores manager instability from employee movement records.
 */
async function scoreManagerInstability(
  employeeId: string,
  companyId: string
): Promise<AttritionRiskFactor> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const managerChanges = await prisma.employeeMovement.count({
    where: {
      emp_id: employeeId,
      company_id: companyId,
      type: 'role_change',
      created_at: { gte: oneYearAgo },
    },
  });

  let score = 0;
  let explanation = '';

  if (managerChanges >= 3) {
    score = 0.75;
    explanation = `${managerChanges} manager/role changes in 12 months. High instability.`;
  } else if (managerChanges === 2) {
    score = 0.45;
    explanation = `${managerChanges} role changes this year.`;
  } else if (managerChanges === 1) {
    score = 0.2;
    explanation = `1 role change this year.`;
  } else {
    score = 0.05;
    explanation = `Stable role, no changes this year.`;
  }

  return makeFactor('managerInstability', 'Manager/Role Instability', score, explanation);
}

/**
 * Scores performance risk from review instance ratings.
 * Low or no ratings signals disengagement.
 */
async function scorePerformanceRisk(
  employeeId: string,
  companyId: string
): Promise<AttritionRiskFactor> {
  const recentReview = await prisma.reviewInstance.findFirst({
    where: {
      reviewee_id: employeeId,
      company_id: companyId,
      status: { in: ['submitted', 'acknowledged'] },
    },
    orderBy: { submitted_at: 'desc' },
    select: { overall_rating: true, submitted_at: true },
  });

  if (!recentReview) {
    return makeFactor('performanceRisk', 'Performance Risk', 0.35, 'No completed performance review on record.');
  }

  const rating = recentReview.overall_rating ?? 3;
  let score = 0;
  let explanation = '';

  if (rating <= 2) {
    score = 0.8;
    explanation = `Very low review rating (${rating}/5). High flight risk.`;
  } else if (rating <= 3) {
    score = 0.4;
    explanation = `Below-average rating (${rating}/5).`;
  } else if (rating >= 4.5) {
    score = 0.15;
    explanation = `High performer (${rating}/5). May leave for better opportunities.`;
  } else {
    score = 0.1;
    explanation = `Solid performer (${rating}/5).`;
  }

  return makeFactor('performanceRisk', 'Performance Risk', score, explanation);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFactor(
  key: keyof typeof FACTOR_WEIGHTS,
  label: string,
  score: number,
  explanation: string
): AttritionRiskFactor {
  return { key, label, score: Math.round(score * 100) / 100, explanation };
}

function computeCompositeScore(factors: AttritionRiskFactor[]): number {
  const keyToWeight: Record<string, number> = FACTOR_WEIGHTS;
  return factors.reduce((sum, factor) => {
    const weight = keyToWeight[factor.key] ?? 0;
    return sum + factor.score * weight;
  }, 0);
}

function classifyRisk(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_THRESHOLDS.high) return 'high';
  if (score >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}
