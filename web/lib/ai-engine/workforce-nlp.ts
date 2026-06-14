/**
 * Workforce Analytics NLP Engine — OpenAI-powered.
 *
 * Translates natural-language HR questions into structured data queries,
 * executes them, and returns structured results with chart recommendations.
 *
 * Architecture:
 * 1. Send user question + HR schema context to OpenAI as a function-call prompt.
 * 2. OpenAI returns a structured QueryPlan (intent + params).
 * 3. Execute the QueryPlan against Prisma.
 * 4. Return data + recommended chart type.
 *
 * @module lib/ai-engine/workforce-nlp
 */

import OpenAI from 'openai';
import prisma from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_VERSION = 'gpt-4o-mini';

/** Supported query intents the engine can handle. */
const SUPPORTED_INTENTS = [
  'top_leave_takers',
  'attrition_rate',
  'headcount_by_department',
  'payroll_trend',
  'attendance_summary',
  'leave_utilization',
  'new_hires',
  'pending_approvals',
  'performance_distribution',
  'open_positions',
] as const;

type QueryIntent = typeof SUPPORTED_INTENTS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'number' | 'heatmap';

export interface NlpQueryResult {
  question: string;
  intent: QueryIntent | 'unknown';
  data: Record<string, unknown>[];
  /** Total count if paginated. */
  total: number;
  chartType: ChartType;
  chartTitle: string;
  /** Brief summary sentence for the AI to surface. */
  summary: string;
  modelVersion: string;
}

interface QueryPlan {
  intent: QueryIntent | 'unknown';
  params: {
    startDate?: string;
    endDate?: string;
    department?: string;
    limit?: number;
    groupBy?: string;
  };
  chartType: ChartType;
  chartTitle: string;
}

// ─── OpenAI Client (lazy-initialized) ─────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Processes a natural-language HR analytics question.
 *
 * @param question  - The user's question in plain English.
 * @param companyId - Scopes all data to this company.
 * @returns Structured NlpQueryResult with data and chart metadata.
 * @throws Error if OpenAI API key is missing or query fails.
 */
export async function processHrQuery(
  question: string,
  companyId: string
): Promise<NlpQueryResult> {
  const plan = await extractQueryPlan(question);
  const { data, total, summary } = await executeQueryPlan(plan, companyId);

  return {
    question,
    intent: plan.intent,
    data,
    total,
    chartType: plan.chartType,
    chartTitle: plan.chartTitle,
    summary,
    modelVersion: MODEL_VERSION,
  };
}

// ─── OpenAI Intent Extraction ─────────────────────────────────────────────────

/**
 * Calls OpenAI to classify the question and produce a structured QueryPlan.
 * Uses function calling for reliable structured output.
 */
async function extractQueryPlan(question: string): Promise<QueryPlan> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: MODEL_VERSION,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      {
        role: 'user',
        content: question,
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'create_query_plan',
          description: 'Creates a structured query plan from a natural language HR analytics question.',
          parameters: {
            type: 'object',
            properties: {
              intent: {
                type: 'string',
                enum: [...SUPPORTED_INTENTS, 'unknown'],
                description: 'The classified intent of the question.',
              },
              params: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', description: 'ISO date string for start of range.' },
                  endDate: { type: 'string', description: 'ISO date string for end of range.' },
                  department: { type: 'string', description: 'Filter by department name.' },
                  limit: { type: 'number', description: 'Max records to return.' },
                  groupBy: { type: 'string', description: 'Field to group results by.' },
                },
              },
              chartType: {
                type: 'string',
                enum: ['bar', 'line', 'pie', 'table', 'number', 'heatmap'],
              },
              chartTitle: { type: 'string', description: 'Human-readable chart title.' },
            },
            required: ['intent', 'params', 'chartType', 'chartTitle'],
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'create_query_plan' } },
    max_tokens: 512,
    temperature: 0,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0] as
    | { function?: { arguments?: string } }
    | undefined;
  if (!toolCall?.function?.arguments) {
    return buildFallbackPlan();
  }

  try {
    return JSON.parse(toolCall.function.arguments) as QueryPlan;
  } catch {
    return buildFallbackPlan();
  }
}

// ─── Query Executors ──────────────────────────────────────────────────────────

/**
 * Routes the QueryPlan to the correct Prisma executor.
 */
async function executeQueryPlan(
  plan: QueryPlan,
  companyId: string
): Promise<{ data: Record<string, unknown>[]; total: number; summary: string }> {
  const executors: Record<QueryIntent, () => Promise<{ data: Record<string, unknown>[]; total: number; summary: string }>> = {
    top_leave_takers: () => executeTopLeaveTakers(plan, companyId),
    attrition_rate: () => executeAttritionRate(plan, companyId),
    headcount_by_department: () => executeHeadcountByDept(plan, companyId),
    payroll_trend: () => executePayrollTrend(plan, companyId),
    attendance_summary: () => executeAttendanceSummary(plan, companyId),
    leave_utilization: () => executeLeaveUtilization(plan, companyId),
    new_hires: () => executeNewHires(plan, companyId),
    pending_approvals: () => executePendingApprovals(plan, companyId),
    performance_distribution: () => executePerformanceDistribution(plan, companyId),
    open_positions: () => executeOpenPositions(plan, companyId),
  };

  const executor = executors[plan.intent as QueryIntent];
  if (!executor) {
    return { data: [], total: 0, summary: 'I could not understand that question. Try asking about leave trends, headcount, payroll, or performance.' };
  }

  return executor();
}

// ─── Individual Query Executors ───────────────────────────────────────────────

async function executeTopLeaveTakers(plan: QueryPlan, companyId: string) {
  const limit = plan.params.limit ?? 10;
  const leaves = await prisma.leaveRequest.groupBy({
    by: ['emp_id'],
    where: { company_id: companyId, status: 'approved' },
    _sum: { total_days: true },
    orderBy: { _sum: { total_days: 'desc' } },
    take: limit,
  });

  const empIds = leaves.map((l) => l.emp_id);
  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds } },
    select: { id: true, first_name: true, last_name: true, department: true },
  });

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const data = leaves.map((l) => ({
    name: empMap.get(l.emp_id) ? `${empMap.get(l.emp_id)!.first_name} ${empMap.get(l.emp_id)!.last_name}` : l.emp_id,
    department: empMap.get(l.emp_id)?.department ?? 'N/A',
    totalDays: l._sum.total_days ?? 0,
  }));

  return { data, total: data.length, summary: `Top ${data.length} employees by approved leave days.` };
}

async function executeAttritionRate(plan: QueryPlan, companyId: string) {
  const startDate = plan.params.startDate ? new Date(plan.params.startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const endDate = plan.params.endDate ? new Date(plan.params.endDate) : new Date();

  const [exited, total] = await Promise.all([
    prisma.employee.count({
      where: { org_id: companyId, status: { in: ['resigned', 'terminated', 'exited'] }, deleted_at: { gte: startDate, lte: endDate } },
    }),
    prisma.employee.count({ where: { org_id: companyId } }),
  ]);

  const rate = total > 0 ? ((exited / total) * 100).toFixed(1) : '0.0';
  return {
    data: [{ period: `${startDate.toDateString()} – ${endDate.toDateString()}`, exitedEmployees: exited, totalEmployees: total, attritionRate: `${rate}%` }],
    total: 1,
    summary: `Attrition rate is ${rate}% (${exited} exits out of ${total} employees).`,
  };
}

async function executeHeadcountByDept(plan: QueryPlan, companyId: string) {
  const grouped = await prisma.employee.groupBy({
    by: ['department'],
    where: { org_id: companyId, status: 'active', deleted_at: null },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const data = grouped.map((g) => ({ department: g.department ?? 'Unassigned', headcount: g._count.id }));
  return { data, total: data.reduce((s, d) => s + d.headcount, 0), summary: `Active headcount across ${data.length} departments.` };
}

async function executePayrollTrend(plan: QueryPlan, companyId: string) {
  const runs = await prisma.payrollRun.findMany({
    where: { company_id: companyId, status: { in: ['paid', 'processed'] } },
    select: { month: true, year: true, total_gross: true, total_net: true },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    take: 12,
  });

  const data = runs.map((r) => ({ period: `${r.year}-${String(r.month).padStart(2, '0')}`, grossPayroll: r.total_gross, netPayroll: r.total_net }));
  return { data, total: data.length, summary: `Payroll trend over last ${data.length} months.` };
}

async function executeAttendanceSummary(plan: QueryPlan, companyId: string) {
  const grouped = await prisma.attendance.groupBy({
    by: ['status'],
    where: { company_id: companyId },
    _count: { id: true },
  });

  const data = grouped.map((g) => ({ status: g.status, count: g._count.id }));
  const total = data.reduce((s, d) => s + d.count, 0);
  return { data, total, summary: `Attendance summary: ${total} records across ${data.length} statuses.` };
}

async function executeLeaveUtilization(_plan: QueryPlan, companyId: string) {
  const balances = await prisma.leaveBalance.groupBy({
    by: ['leave_type'],
    where: { company_id: companyId },
    _sum: { used_days: true, annual_entitlement: true, carried_forward: true },
  });

  const data = balances.map((b) => {
    const allocated = (b._sum?.annual_entitlement ?? 0) + (b._sum?.carried_forward ?? 0);
    const used = b._sum?.used_days ?? 0;
    const utilizationPct = allocated > 0 ? ((used / allocated) * 100).toFixed(1) : '0';
    return { leaveType: b.leave_type, allocated, used, utilizationPct };
  });

  return { data, total: data.length, summary: `Leave utilization across ${data.length} leave types.` };
}

async function executeNewHires(plan: QueryPlan, companyId: string) {
  const startDate = plan.params.startDate ? new Date(plan.params.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));

  const newHires = await prisma.employee.findMany({
    where: { org_id: companyId, date_of_joining: { gte: startDate }, deleted_at: null },
    select: { first_name: true, last_name: true, department: true, date_of_joining: true, primary_role: true },
    orderBy: { date_of_joining: 'desc' },
    take: plan.params.limit ?? 50,
  });

  const data = newHires.map((e) => ({ name: `${e.first_name} ${e.last_name}`, department: e.department, joinedAt: e.date_of_joining?.toISOString().split('T')[0], role: e.primary_role }));
  return { data, total: data.length, summary: `${data.length} new hires since ${startDate.toDateString()}.` };
}

async function executePendingApprovals(plan: QueryPlan, companyId: string) {
  const [leaves, reimbursements] = await Promise.all([
    prisma.leaveRequest.count({ where: { company_id: companyId, status: 'pending' } }),
    prisma.reimbursement.count({ where: { company_id: companyId, status: 'pending' } }),
  ]);

  const data = [{ type: 'Leave Requests', count: leaves }, { type: 'Reimbursements', count: reimbursements }];
  return { data, total: leaves + reimbursements, summary: `${leaves + reimbursements} items pending approval.` };
}

async function executePerformanceDistribution(plan: QueryPlan, companyId: string) {
  const instances = await prisma.reviewInstance.groupBy({
    by: ['status'],
    where: { company_id: companyId },
    _count: { id: true },
  });

  const data = instances.map((i) => ({ status: i.status, count: i._count.id }));
  return { data, total: data.reduce((s, d) => s + d.count, 0), summary: `Performance review status distribution.` };
}

async function executeOpenPositions(plan: QueryPlan, companyId: string) {
  const openings = await prisma.jobPosting.findMany({
    where: { company_id: companyId, status: 'published' },
    select: { title: true, department: true, employment_type: true, _count: { select: { applications: true } } },
    orderBy: { created_at: 'desc' },
    take: plan.params.limit ?? 20,
  });

  const data = openings.map((j) => ({ title: j.title, department: j.department, type: j.employment_type, applications: j._count.applications }));
  return { data, total: data.length, summary: `${data.length} open positions currently published.` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an HR analytics assistant for Continuum HR. 
Your job is to classify natural language questions into one of these intents: ${SUPPORTED_INTENTS.join(', ')}.
Extract any date ranges, department filters, and limits from the question.
Choose the most appropriate chart type for the data.
Respond ONLY using the create_query_plan function.
If the question does not match any intent, use "unknown".`;
}

function buildFallbackPlan(): QueryPlan {
  return {
    intent: 'unknown',
    params: {},
    chartType: 'table',
    chartTitle: 'Query Result',
  };
}
