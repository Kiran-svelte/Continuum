/**
 * Smart Leave AI Engine for Continuum HR.
 *
 * Provides intelligent leave recommendations and conflict predictions.
 * Deterministic engine — no external API dependency.
 *
 * Features:
 * - Suggest optimal leave dates (avoids team-capacity conflicts)
 * - Auto-risk scoring for leave requests (low/medium/high)
 * - Team coverage prediction during requested leave period
 * - Leave pattern analysis for the requesting employee
 *
 * @module lib/ai-engine/smart-leave
 */

import prisma from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum team coverage percentage before flagging a leave as high-risk. */
const MIN_TEAM_COVERAGE_PERCENT = 60;

/** Max look-ahead window for date suggestions (days). */
const SUGGESTION_WINDOW_DAYS = 30;

/** Number of date suggestions to return. */
const MAX_SUGGESTIONS = 5;

/** Day names for readability. */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveRiskLevel = 'low' | 'medium' | 'high';

export interface LeaveRiskAssessment {
  /** Overall risk level for the requested leave. */
  riskLevel: LeaveRiskLevel;
  /** Score 0–1 for sorting/comparison. */
  riskScore: number;
  /** Human-readable factors contributing to the risk. */
  factors: LeaveRiskFactor[];
  /** Team coverage percentage during the leave period. */
  teamCoveragePercent: number;
  /** Number of teammates already on leave during this period. */
  overlappingLeaveCount: number;
  /** Recommendation for HR/manager. */
  recommendation: string;
}

export interface LeaveRiskFactor {
  key: string;
  label: string;
  score: number;
  explanation: string;
}

export interface LeaveDateSuggestion {
  startDate: string;
  endDate: string;
  durationDays: number;
  teamCoveragePercent: number;
  riskLevel: LeaveRiskLevel;
  /** Why this window is recommended. */
  reason: string;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Assesses risk for a proposed leave request.
 *
 * @param employeeId - The employee requesting leave.
 * @param companyId  - Company scope.
 * @param startDate  - Proposed leave start.
 * @param endDate    - Proposed leave end.
 * @returns Risk assessment with factors and coverage analysis.
 * @throws Error if employee not found.
 */
export async function assessLeaveRisk(
  employeeId: string,
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<LeaveRiskAssessment> {
  const [coverageFactor, patternFactor, timingFactor] = await Promise.all([
    assessTeamCoverage(employeeId, companyId, startDate, endDate),
    assessLeavePattern(employeeId, companyId),
    assessTiming(startDate, endDate),
  ]);

  const factors = [coverageFactor.factor, patternFactor, timingFactor];
  const riskScore = computeWeightedScore(factors);
  const riskLevel = classifyLeaveRisk(riskScore);

  return {
    riskLevel,
    riskScore: Math.round(riskScore * 100) / 100,
    factors,
    teamCoveragePercent: coverageFactor.coveragePercent,
    overlappingLeaveCount: coverageFactor.overlappingCount,
    recommendation: buildRecommendation(riskLevel, coverageFactor.coveragePercent),
  };
}

/**
 * Suggests optimal leave windows for an employee.
 *
 * @param employeeId     - The employee requesting leave.
 * @param companyId      - Company scope.
 * @param durationDays   - Desired leave duration.
 * @returns Up to MAX_SUGGESTIONS date windows sorted by lowest risk.
 */
export async function suggestLeaveDates(
  employeeId: string,
  companyId: string,
  durationDays: number
): Promise<LeaveDateSuggestion[]> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, org_id: companyId },
    select: { department: true },
  });

  if (!employee) {
    throw new Error(`Employee ${employeeId} not found`);
  }

  const suggestions: LeaveDateSuggestion[] = [];
  const today = new Date();

  for (let offset = 1; offset <= SUGGESTION_WINDOW_DAYS; offset++) {
    const candidate = new Date(today);
    candidate.setDate(candidate.getDate() + offset);

    if (isWeekend(candidate)) continue;

    const windowEnd = new Date(candidate);
    windowEnd.setDate(windowEnd.getDate() + durationDays - 1);

    const coverageResult = await assessTeamCoverage(
      employeeId, companyId, candidate, windowEnd
    );

    if (coverageResult.coveragePercent >= MIN_TEAM_COVERAGE_PERCENT) {
      const riskScore = coverageResult.factor.score;
      suggestions.push({
        startDate: candidate.toISOString().split('T')[0],
        endDate: windowEnd.toISOString().split('T')[0],
        durationDays,
        teamCoveragePercent: coverageResult.coveragePercent,
        riskLevel: classifyLeaveRisk(riskScore),
        reason: buildSuggestionReason(coverageResult.coveragePercent, coverageResult.overlappingCount),
      });
    }

    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  return suggestions.sort((a, b) => b.teamCoveragePercent - a.teamCoveragePercent);
}

// ─── Factor Scoring ───────────────────────────────────────────────────────────

interface CoverageResult {
  factor: LeaveRiskFactor;
  coveragePercent: number;
  overlappingCount: number;
}

/**
 * Checks how many teammates in the same department are already on leave
 * during the proposed window.
 */
async function assessTeamCoverage(
  employeeId: string,
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<CoverageResult> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, org_id: companyId },
    select: { department: true },
  });

  if (!employee?.department) {
    return {
      factor: makeFactor('team_coverage', 'Team Coverage', 0.1, 'No department assigned — cannot assess team impact.'),
      coveragePercent: 100,
      overlappingCount: 0,
    };
  }

  const [teamSize, overlappingLeaves] = await Promise.all([
    prisma.employee.count({
      where: { org_id: companyId, department: employee.department, status: 'active', deleted_at: null },
    }),
    prisma.leaveRequest.count({
      where: {
        company_id: companyId,
        status: 'approved',
        emp_id: { not: employeeId },
        Employee_LeaveRequest_emp_idToEmployee: { department: employee.department },
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
    }),
  ]);

  const availableAfterLeave = Math.max(0, teamSize - overlappingLeaves - 1);
  const coveragePercent = teamSize > 1 ? Math.round((availableAfterLeave / (teamSize - 1)) * 100) : 100;

  let score = 0;
  let explanation = '';

  if (coveragePercent < 40) {
    score = 0.9;
    explanation = `Only ${coveragePercent}% team coverage. ${overlappingLeaves} teammate(s) already on leave.`;
  } else if (coveragePercent < MIN_TEAM_COVERAGE_PERCENT) {
    score = 0.6;
    explanation = `${coveragePercent}% coverage — below ${MIN_TEAM_COVERAGE_PERCENT}% threshold. ${overlappingLeaves} overlap(s).`;
  } else if (coveragePercent < 80) {
    score = 0.3;
    explanation = `${coveragePercent}% coverage. ${overlappingLeaves} teammate(s) on leave.`;
  } else {
    score = 0.05;
    explanation = `${coveragePercent}% team coverage — minimal impact.`;
  }

  return {
    factor: makeFactor('team_coverage', 'Team Coverage Impact', score, explanation),
    coveragePercent,
    overlappingCount: overlappingLeaves,
  };
}

/**
 * Analyzes the employee's recent leave pattern.
 * Frequent short-notice or high-frequency requests increase risk score.
 */
async function assessLeavePattern(
  employeeId: string,
  companyId: string
): Promise<LeaveRiskFactor> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentLeaves = await prisma.leaveRequest.findMany({
    where: { emp_id: employeeId, company_id: companyId, created_at: { gte: threeMonthsAgo } },
    select: { total_days: true, status: true, created_at: true, start_date: true },
  });

  const approvedCount = recentLeaves.filter((l) => l.status === 'approved').length;
  const totalDays = recentLeaves.reduce((sum, l) => sum + (l.total_days ?? 0), 0);

  let score = 0;
  let explanation = '';

  if (approvedCount > 6) {
    score += 0.4;
    explanation += `${approvedCount} leave requests in 3 months (high frequency). `;
  }

  if (totalDays > 15) {
    score += 0.3;
    explanation += `${totalDays} total leave days in 3 months. `;
  }

  const shortNoticeCount = recentLeaves.filter((l) => {
    const daysBefore = (new Date(l.start_date).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysBefore < 2;
  }).length;

  if (shortNoticeCount > 2) {
    score += 0.2;
    explanation += `${shortNoticeCount} short-notice requests. `;
  }

  score = Math.min(1, score);
  if (!explanation) explanation = 'Normal leave pattern.';

  return makeFactor('leave_pattern', 'Leave Pattern', score, explanation.trim());
}

/**
 * Assesses timing-related risk: duration, weekends, public holidays.
 */
async function assessTiming(
  startDate: Date,
  endDate: Date
): Promise<LeaveRiskFactor> {
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  let score = 0;
  let explanation = '';

  if (durationDays > 10) {
    score = 0.5;
    explanation = `Extended leave (${durationDays} days). Consider phased absence.`;
  } else if (durationDays > 5) {
    score = 0.2;
    explanation = `${durationDays}-day leave. Standard duration.`;
  } else {
    score = 0.05;
    explanation = `Short leave (${durationDays} day${durationDays > 1 ? 's' : ''}). Low impact.`;
  }

  const startDay = DAY_NAMES[startDate.getDay()];
  if (startDay === 'Monday' || startDay === 'Friday') {
    score = Math.max(score - 0.05, 0);
    explanation += ` Starts on ${startDay} — efficient bridge.`;
  }

  return makeFactor('timing', 'Timing & Duration', score, explanation.trim());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFactor(key: string, label: string, score: number, explanation: string): LeaveRiskFactor {
  return { key, label, score: Math.round(score * 100) / 100, explanation };
}

function computeWeightedScore(factors: LeaveRiskFactor[]): number {
  const weights: Record<string, number> = {
    team_coverage: 0.50,
    leave_pattern: 0.30,
    timing: 0.20,
  };

  return factors.reduce((sum, factor) => {
    return sum + factor.score * (weights[factor.key] ?? 0);
  }, 0);
}

function classifyLeaveRisk(score: number): LeaveRiskLevel {
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function buildRecommendation(riskLevel: LeaveRiskLevel, coveragePercent: number): string {
  if (riskLevel === 'high') {
    return `High risk — team coverage drops to ${coveragePercent}%. Consider rescheduling or arranging backup.`;
  }
  if (riskLevel === 'medium') {
    return `Moderate risk. Ensure handover tasks are documented before approval.`;
  }
  return `Low risk. Team coverage is healthy — safe to approve.`;
}

function buildSuggestionReason(coveragePercent: number, overlapCount: number): string {
  if (overlapCount === 0) return `No teammates on leave — ${coveragePercent}% coverage.`;
  return `${overlapCount} teammate(s) on leave but ${coveragePercent}% coverage maintained.`;
}
