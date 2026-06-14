import prisma from '@/lib/prisma';
import type { Prisma, Employee, CompanySettings, LeaveRequest } from '@prisma/client';
import { differenceInDays, isSameDay, parseISO, isFriday, isMonday } from 'date-fns';

export interface AIDecisionOutput {
  decision: 'auto_approve' | 'require_approval' | 'escalate';
  confidence: number;
  reasoning: string[];
  risk_score: number;
  escalate_to: string | null;
  model_version: string;
  pattern_detected: string | null;
  pattern_confidence: number | null;
  employee_approval_rate: number | null;
  team_coverage: number | null;
}

export interface LeaveRequestPayload {
  leave_type: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  is_half_day?: boolean;
}

/**
 * 3.1 Leave Request Submission Context Builder
 */
async function buildContext(employeeId: string, companyId: string, payload: LeaveRequestPayload) {
  const [employee, settings, allLeaves, teamLeaves] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, department: true, primary_role: true, manager_id: true }
    }),
    prisma.companySettings.findUnique({
      where: { company_id: companyId }
    }),
    // Past 12 months for this employee
    prisma.leaveRequest.findMany({
      where: {
        emp_id: employeeId,
        created_at: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
      },
      select: { status: true, start_date: true, end_date: true }
    }),
    // Team leaves overlapping with requested period
    prisma.leaveRequest.findMany({
      where: {
        company_id: companyId,
        status: 'approved',
        OR: [
          { start_date: { lte: payload.end_date }, end_date: { gte: payload.start_date } }
        ]
      },
      include: {
        employee: {
          select: { department: true, manager_id: true }
        }
      }
    })
  ]);

  if (!employee || !settings) {
    throw new Error('Missing employee or company settings context');
  }

  // Calculate Employee Approval Rate
  let approvedCount = 0;
  let closedCount = 0;
  for (const l of allLeaves) {
    if (l.status === 'approved' || l.status === 'rejected') closedCount++;
    if (l.status === 'approved') approvedCount++;
  }
  const approvalRate = closedCount > 0 ? approvedCount / closedCount : 1.0;

  // Identify Team (same manager or same department)
  const teamMembers = await prisma.employee.count({
    where: {
      org_id: companyId,
      status: 'active',
      OR: [
        { department: employee.department || 'N/A_FALLBACK' },
        { manager_id: employee.manager_id || 'N/A_FALLBACK' }
      ]
    }
  });

  const overlappingTeamLeaves = teamLeaves.filter((leave) => {
    const leaveEmployee = leave.employee;
    return (
      leaveEmployee.department === employee.department ||
      leaveEmployee.manager_id === employee.manager_id
    );
  });

  const teamCoverage = teamMembers > 0 
    ? Math.max(0, (teamMembers - overlappingTeamLeaves.length) / teamMembers) 
    : 1.0;

  // Detect patterns (e.g. frequent Fridays/Mondays)
  let weekendExtensions = 0;
  for (const l of allLeaves) {
    if (isFriday(new Date(l.start_date)) || isMonday(new Date(l.end_date))) {
      weekendExtensions++;
    }
  }
  const isWeekendExtension = isFriday(payload.start_date) || isMonday(payload.end_date);
  
  let patternDetected = null;
  let patternConfidence = 0;
  if (isWeekendExtension && weekendExtensions > 3) {
    patternDetected = 'frequent_long_weekends';
    patternConfidence = Math.min(0.9, (weekendExtensions - 3) * 0.15 + 0.5);
  }

  return {
    employee,
    settings,
    approvalRate,
    teamCoverage,
    teamSize: teamMembers,
    patternDetected,
    patternConfidence
  };
}

/**
 * AI CORE ENGINE - Orchestrates the analysis
 */
export async function evaluateLeaveRequest(
  employeeId: string, 
  companyId: string, 
  payload: LeaveRequestPayload
): Promise<AIDecisionOutput> {
  const context = await buildContext(employeeId, companyId, payload);
  const { settings, approvalRate, teamCoverage, patternDetected, patternConfidence } = context;

  // CompanySettings in the current schema does not have dedicated AI columns.
  // Read optional legacy keys when present, otherwise use safe defaults.
  const settingsRecord = settings as unknown as Record<string, unknown>;
  const aiEnabled = typeof settingsRecord.ai_enabled === 'boolean' ? settingsRecord.ai_enabled : true;
  const aiAutoApproveMaxDays =
    typeof settingsRecord.ai_auto_approve_max_days === 'number'
      ? settingsRecord.ai_auto_approve_max_days
      : 3;
  const aiMinTeamCoverage =
    typeof settingsRecord.ai_min_team_coverage === 'number'
      ? settingsRecord.ai_min_team_coverage
      : 50;
  const aiConfidenceThreshold =
    typeof settingsRecord.ai_confidence_threshold === 'number'
      ? settingsRecord.ai_confidence_threshold
      : 0.8;

  const reasoning: string[] = [];
  let confidence = 1.0;
  let riskScore = 0.0;
  let decision: 'auto_approve' | 'require_approval' | 'escalate' = 'auto_approve';
  let escalateTo: string | null = 'manager';

  // 3.2 Hard Rules Filter Pipeline
  if (!aiEnabled) {
    return {
      decision: 'require_approval',
      confidence: 1.0,
      reasoning: ['AI auto-approval is disabled company-wide.'],
      risk_score: 0.1,
      escalate_to: 'manager',
      model_version: 'rule-based-v1',
      pattern_detected: null,
      pattern_confidence: null,
      employee_approval_rate: approvalRate,
      team_coverage: teamCoverage
    };
  }

  // 3.3 AI Soft Rules & Risk Scoring
  
  // Rule 1: Notice period
  const noticeDays = differenceInDays(payload.start_date, new Date());
  if (noticeDays < 3) {
    confidence -= 0.2;
    riskScore += 0.3;
    reasoning.push(`⚠ Short notice: Only ${noticeDays} days before start.`);
  } else {
    reasoning.push(`✓ Good notice period: ${noticeDays} days.`);
  }

  // Rule 2: duration
  const maxDays = aiAutoApproveMaxDays;
  if (payload.total_days > maxDays) {
    confidence -= 0.3;
    riskScore += 0.4;
    reasoning.push(`⚠ Duration (${payload.total_days} days) exceeds auto-approve threshold (${maxDays} days).`);
  } else {
    reasoning.push(`✓ Duration within safe limits.`);
  }

  // Rule 3: Team Coverage
  const minCoverage = aiMinTeamCoverage / 100;
  if (teamCoverage < minCoverage) {
    confidence -= 0.5;
    riskScore += 0.6;
    reasoning.push(`🛑 High risk: Team coverage drops to ${(teamCoverage * 100).toFixed(0)}% (Requires ${aiMinTeamCoverage}%).`);
  } else {
    reasoning.push(`✓ Healthy team coverage: ${(teamCoverage * 100).toFixed(0)}%.`);
  }

  // Rule 4: Employee History
  if (approvalRate < 0.7) {
    confidence -= 0.2;
    riskScore += 0.3;
    reasoning.push(`⚠ Employee history shows ${(1 - approvalRate) * 100}% rejection rate.`);
  }

  // Rule 5: Behavioral Patterns
  if (patternDetected) {
    confidence -= (patternConfidence ?? 0) * 0.5;
    riskScore += (patternConfidence ?? 0) * 0.4;
    reasoning.push(`⚠ Pattern detected: ${patternDetected.replace(/_/g, ' ')} (${Math.round((patternConfidence ?? 0) * 100)}% confidence).`);
  }

  // 3.4 Dynamic Escalation Matrix
  // Clamp boundaries
  confidence = Math.max(0, Math.min(1, confidence));
  riskScore = Math.max(0, Math.min(1, riskScore));

  const threshold = aiConfidenceThreshold;

  if (riskScore > 0.7) {
    decision = 'escalate';
    escalateTo = 'hr'; // High risk bypasses manager to HR
    reasoning.push(`🚨 High risk score (${riskScore.toFixed(2)}). Escalating to HR.`);
  } else if (confidence < threshold) {
    decision = 'require_approval';
    escalateTo = 'manager';
    reasoning.push(`⚖ Confidence (${confidence.toFixed(2)}) below required threshold (${threshold.toFixed(2)}). Manager review required.`);
  } else {
    decision = 'auto_approve';
    escalateTo = null;
    reasoning.push(`✨ High confidence decision. Auto-approved.`);
  }

  // Fallback for role constraints if config forbids manager review
  if (context.employee.primary_role === 'hr' || context.employee.primary_role === 'admin') {
     // Admin/HR leaves are usually auto-approved or require special escalation
     if (decision !== 'auto_approve') escalateTo = 'admin'; // peer review
  }

  return {
    decision,
    confidence,
    reasoning,
    risk_score: riskScore,
    escalate_to: escalateTo,
    model_version: 'rule-based-v1',
    pattern_detected: patternDetected,
    pattern_confidence: patternConfidence,
    employee_approval_rate: approvalRate,
    team_coverage: teamCoverage
  };
}
