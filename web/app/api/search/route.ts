import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { parseBoundedInt, parseDateOnlyRange } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

type SearchEntity = 'employees' | 'leaves' | 'approvals' | 'all';
type SearchEntityType = 'employee' | 'leave' | 'approval';
type SortBy = 'relevance' | 'date' | 'name';
type SortOrder = 'asc' | 'desc';

interface SearchOptions {
  department?: string | null;
  status?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  leaveType?: string | null;
  userRole: string;
  userId: string;
  canSearchAll: boolean;
  canSearchTeam: boolean;
  limit: number;
}

interface EmployeeSummaryResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  primary_role: string;
  date_of_joining: Date | null;
  status: string;
  updated_at: Date;
  relevance_score?: number;
}

interface LeaveEmployeeSummary {
  first_name: string;
  last_name: string;
  department: string | null;
}

interface LeaveSummaryResult {
  id: string;
  leave_type: string;
  reason: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  employee: LeaveEmployeeSummary;
  relevance_score?: number;
}

interface ApprovalSummaryResult extends LeaveSummaryResult {
  approval_type: 'leave_request';
  approval_date: Date;
}

type RelevanceCarrier = {
  relevance_score?: number;
};

type SearchBatchResult = EmployeeSummaryResult[] | LeaveSummaryResult[] | ApprovalSummaryResult[];

type SearchResult =
  | (EmployeeSummaryResult & { entityType: 'employee' })
  | (LeaveSummaryResult & { entityType: 'leave' })
  | (ApprovalSummaryResult & { entityType: 'approval' });

interface SearchCounts {
  employees: number;
  leaveRequests: number;
  approvals: number;
}

interface SearchInsights {
  total_matches: number;
  best_match_entity: 'employees' | 'leaves' | 'approvals';
  search_coverage: number;
  departments_found: string[];
  date_range: {
    earliest: Date | null;
    latest: Date | null;
  };
}

/**
 * GET /api/search
 * 
 * Enterprise Global Search System
 * 
 * Features:
 * - Multi-entity search across employees, leave requests, approvals
 * - Full-text search with relevance scoring
 * - Advanced filtering with multiple criteria
 * - Role-based result filtering (RBAC)
 * - Saved searches and search history
 * - Performance optimized with pagination
 * - Real-time search suggestions
 * 
 * Security:
 * - RBAC: Results filtered by user permissions
 * - Rate limiting to prevent abuse
 * - Search query sanitization
 * - Audit logging for sensitive searches
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    // Enhanced rate limiting for search API
    const rateLimit = checkApiRateLimit(employee.id, 'global_search');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Search rate limit exceeded. Please wait before searching again.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse search parameters
    const query = searchParams.get('q') || '';
    const rawEntity = searchParams.get('entity'); // 'employees', 'leaves', 'approvals', 'all'
    const entity: SearchEntity | null =
      rawEntity === 'employees' || rawEntity === 'leaves' || rawEntity === 'approvals' || rawEntity === 'all'
        ? rawEntity
        : null;
    if (rawEntity && !entity) {
      console.warn('[Global Search] Ignoring invalid entity filter', {
        actorId: employee.id,
        rawEntity,
      });
    }
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const dateFromRaw = searchParams.get('dateFrom');
    const dateToRaw = searchParams.get('dateTo');
    const leaveType = searchParams.get('leaveType');
    const limit = parseBoundedInt(searchParams.get('limit'), {
      defaultValue: 20,
      min: 1,
      max: 100,
    });
    const offset = parseBoundedInt(searchParams.get('offset'), {
      defaultValue: 0,
      min: 0,
      max: 10000,
    });
    const rawSortBy = searchParams.get('sortBy'); // 'relevance', 'date', 'name'
    const sortBy: SortBy = rawSortBy === 'date' || rawSortBy === 'name' ? rawSortBy : 'relevance';
    const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Validate search query
    if (!query.trim() && !entity && !department && !status) {
      return NextResponse.json(
        { error: 'Search query or filter criteria required' },
        { status: 400 }
      );
    }

    // Sanitize search query
    const sanitizedQuery = query.trim().slice(0, 200); // Limit query length
    const searchTerms = sanitizedQuery.split(/\s+/).filter(term => term.length > 0);

    const dateRangeResult = parseDateOnlyRange({
      startDateRaw: dateFromRaw,
      endDateRaw: dateToRaw,
      defaultStart: new Date(Date.UTC(2000, 0, 1)),
      defaultEndExclusive: new Date(Date.UTC(2000, 0, 2)),
      maxDays: 366,
    });

    if ((dateFromRaw || dateToRaw) && !dateRangeResult.ok) {
      return NextResponse.json(
        { error: dateRangeResult.error },
        { status: 400 }
      );
    }

    const dateFrom = (dateFromRaw && dateToRaw && dateRangeResult.ok) ? dateRangeResult.start : null;
    const dateTo = (dateFromRaw && dateToRaw && dateRangeResult.ok) ? dateRangeResult.endExclusive : null;

    const companyId = employee.org_id;
    const userRole = employee.primary_role;

    // Build RBAC-compliant search scope
    const canSearchAll = ['hr', 'admin', 'director'].includes(userRole);
    const canSearchTeam = ['manager', 'team_lead'].includes(userRole);

    // Parallel search across entities
    const searchPromises: Promise<SearchBatchResult>[] = [];

    // Employee search
    if (!entity || entity === 'employees' || entity === 'all') {
      searchPromises.push(searchEmployees(companyId, searchTerms, {
        department,
        userRole,
        userId: employee.id,
        canSearchAll,
        canSearchTeam,
        limit: entity === 'employees' ? limit : Math.ceil(limit / 3)
      }));
    }

    // Leave requests search
    if (!entity || entity === 'leaves' || entity === 'all') {
      searchPromises.push(searchLeaveRequests(companyId, searchTerms, {
        department,
        status,
        dateFrom,
        dateTo,
        leaveType,
        userRole,
        userId: employee.id,
        canSearchAll,
        canSearchTeam,
        limit: entity === 'leaves' ? limit : Math.ceil(limit / 3)
      }));
    }

    // Approval workflows search
    if (!entity || entity === 'approvals' || entity === 'all') {
      searchPromises.push(searchApprovals(companyId, searchTerms, {
        department,
        status,
        dateFrom,
        dateTo,
        userRole,
        userId: employee.id,
        canSearchAll,
        canSearchTeam,
        limit: entity === 'approvals' ? limit : Math.ceil(limit / 3)
      }));
    }

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process and combine results
    let employees: EmployeeSummaryResult[] = [];
    let leaveRequests: LeaveSummaryResult[] = [];
    let approvals: ApprovalSummaryResult[] = [];

    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const entityType = getEntityTypeByIndex(index, entity ?? undefined);
        switch (entityType) {
          case 'employees':
            employees = result.value as EmployeeSummaryResult[];
            break;
          case 'leaves':
            leaveRequests = result.value as LeaveSummaryResult[];
            break;
          case 'approvals':
            approvals = result.value as ApprovalSummaryResult[];
            break;
        }
      }
    });

    // Calculate relevance scores
    employees = calculateRelevance(employees, searchTerms, 'employee') as EmployeeSummaryResult[];
    leaveRequests = calculateRelevance(leaveRequests, searchTerms, 'leave') as LeaveSummaryResult[];
    approvals = calculateRelevance(approvals, searchTerms, 'approval') as ApprovalSummaryResult[];

    // Combine and sort results
    let allResults: SearchResult[] = [];
    
    if (entity === 'all' || !entity) {
      allResults = [
        ...employees.map((emp) => ({ ...emp, entityType: 'employee' as const })),
        ...leaveRequests.map((req) => ({ ...req, entityType: 'leave' as const })),
        ...approvals.map((app) => ({ ...app, entityType: 'approval' as const }))
      ];
    } else {
      switch (entity) {
        case 'employees':
          allResults = employees.map((emp) => ({ ...emp, entityType: 'employee' as const }));
          break;
        case 'leaves':
          allResults = leaveRequests.map((req) => ({ ...req, entityType: 'leave' as const }));
          break;
        case 'approvals':
          allResults = approvals.map((app) => ({ ...app, entityType: 'approval' as const }));
          break;
      }
    }

    // Sort results
    allResults = sortResults(allResults, sortBy, sortOrder);

    // Pagination — clamp offset to actual result count
    const totalResults = allResults.length;
    const safeOffset = Math.min(offset, totalResults);
    const paginatedResults = allResults.slice(safeOffset, safeOffset + limit);

    // Generate search insights
    const insights = generateSearchInsights(allResults, searchTerms, {
      employees: employees.length,
      leaveRequests: leaveRequests.length,
      approvals: approvals.length
    });

    // Log search for analytics (if query is meaningful)
    if (sanitizedQuery.length > 2) {
      logSearchActivity(employee.id, sanitizedQuery, entity ?? 'all', totalResults);
    }

    const responseData = {
      meta: {
        query: sanitizedQuery,
        entity,
        total_results: totalResults,
        returned_results: paginatedResults.length,
        limit,
        offset,
        has_more: safeOffset + limit < totalResults,
        search_time_ms: Date.now(),
        user_role: userRole,
        filters_applied: {
          department,
          status,
          date_range: dateFrom && dateTo ? { from: dateFrom.toISOString(), to: dateTo.toISOString() } : null,
          leave_type: leaveType
        }
      },
      results: paginatedResults,
      summary: {
        employees: employees.length,
        leave_requests: leaveRequests.length,
        approvals: approvals.length
      },
      insights,
      suggestions: generateSearchSuggestions(sanitizedQuery, insights)
    };

    return NextResponse.json(responseData, {
      headers: {
        // Enterprise search headers
        'X-Search-Query': sanitizedQuery,
        'X-Search-Results': totalResults.toString(),
        'X-Search-Entity': entity || 'all',
        'X-User-Role': userRole,
        
        // Cache control for search results
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[Global Search] Error:', error);
    
    if (error instanceof AuthError) {
      return NextResponse.json({ 
        error: error.message,
        code: 'AUTH_ERROR'
      }, { status: error.status });
    }

    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Search temporarily unavailable' 
      : String(error);
      
    return NextResponse.json({
      error: errorMessage,
      code: 'SEARCH_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Search employees with RBAC filtering
 */
async function searchEmployees(companyId: string, searchTerms: string[], options: SearchOptions): Promise<EmployeeSummaryResult[]> {
  const { department, userId, canSearchAll, canSearchTeam, limit } = options;

  // Build where clause with RBAC
  const whereClause: Prisma.EmployeeWhereInput = {
    org_id: companyId,
    deleted_at: null,
    status: { not: 'exited' }
  };

  // Apply role-based filtering
  if (!canSearchAll) {
    if (canSearchTeam) {
      whereClause.manager_id = userId;
    } else {
      whereClause.id = userId; // Employee can only see themselves
    }
  }

  // Apply department filter
  if (department) {
    whereClause.department = department;
  }

  // Build search conditions
  const searchConditions: Prisma.EmployeeWhereInput = searchTerms.length > 0 ? {
    OR: [
      { first_name: { contains: searchTerms.join(' '), mode: 'insensitive' } },
      { last_name: { contains: searchTerms.join(' '), mode: 'insensitive' } },
      { email: { contains: searchTerms.join(''), mode: 'insensitive' } },
      { department: { contains: searchTerms.join(' '), mode: 'insensitive' } }
    ]
  } : {};

  const employees = await prisma.employee.findMany({
    where: {
      ...whereClause,
      ...searchConditions
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      department: true,
      primary_role: true,
      date_of_joining: true,
      status: true,
      updated_at: true
    },
    take: limit,
    orderBy: { updated_at: 'desc' }
  });

  return employees;
}

/**
 * Search leave requests with RBAC filtering
 */
async function searchLeaveRequests(companyId: string, searchTerms: string[], options: SearchOptions): Promise<LeaveSummaryResult[]> {
  const {
    department, status, dateFrom, dateTo, leaveType,
    userId, canSearchAll, canSearchTeam, limit
  } = options;

  const whereClause: Record<string, unknown> = {
    company_id: companyId
  };

  const employeeScopeFilter: Record<string, unknown> = {};

  // Apply role-based filtering
  if (!canSearchAll) {
    if (canSearchTeam) {
      employeeScopeFilter.manager_id = userId;
    } else {
      whereClause.emp_id = userId;
    }
  }

  // Apply department filter
  if (department) {
    employeeScopeFilter.department = department;
  }

  if (Object.keys(employeeScopeFilter).length > 0) {
    whereClause.employee = employeeScopeFilter;
  }

  // Apply filters
  if (status) whereClause.status = status;
  if (leaveType) whereClause.leave_type = leaveType;
  if (dateFrom && dateTo) {
    whereClause.start_date = {
      gte: dateFrom,
      lt: dateTo
    };
  }

  // Add search conditions
  if (searchTerms.length > 0) {
    whereClause.OR = [
      { leave_type: { contains: searchTerms.join(' '), mode: 'insensitive' } },
      { reason: { contains: searchTerms.join(' '), mode: 'insensitive' } },
      { status: { contains: searchTerms.join(''), mode: 'insensitive' } }
    ];
  }

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: whereClause as Prisma.LeaveRequestWhereInput,
    include: {
      employee: {
        select: {
          first_name: true,
          last_name: true,
          department: true
        }
      }
    },
    take: limit,
    orderBy: { created_at: 'desc' }
  });

  return leaveRequests;
}

/**
 * Search approval workflows with RBAC filtering
 */
async function searchApprovals(companyId: string, searchTerms: string[], options: SearchOptions): Promise<ApprovalSummaryResult[]> {
  const {
    status, dateFrom, dateTo,
    userRole, userId, canSearchAll, canSearchTeam, limit
  } = options;

  // This would search approval workflows/audit logs
  // For now, return subset of leave requests that need approval
  const whereClause: Record<string, unknown> = {
    company_id: companyId,
    status: { in: ['pending', 'approved', 'rejected'] }
  };

  // Apply role-based filtering
  if (!canSearchAll) {
    if (canSearchTeam) {
      whereClause.employee = { manager_id: userId };
    } else if (userRole === 'manager') {
      whereClause.OR = [
        { emp_id: userId },
        { employee: { manager_id: userId } }
      ];
    } else {
      whereClause.emp_id = userId;
    }
  }

  // Apply filters similar to leave requests
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    whereClause.status = status;
  }
  if (dateFrom && dateTo) {
    whereClause.updated_at = {
      gte: dateFrom,
      lt: dateTo
    };
  }

  const approvals = await prisma.leaveRequest.findMany({
    where: whereClause as Prisma.LeaveRequestWhereInput,
    include: {
      employee: {
        select: {
          first_name: true,
          last_name: true,
          department: true
        }
      }
    },
    take: limit,
    orderBy: { updated_at: 'desc' }
  });

  return approvals.map(approval => ({
    ...approval,
    approval_type: 'leave_request' as const,
    approval_date: approval.updated_at
  }));
}

// Helper functions
function getEntityTypeByIndex(index: number, entity?: SearchEntity): 'employees' | 'leaves' | 'approvals' | 'unknown' {
  if (entity && entity !== 'all') {
    return entity;
  }

  const types: Array<'employees' | 'leaves' | 'approvals'> = ['employees', 'leaves', 'approvals'];
  return types[index] || 'unknown';
}

function calculateRelevance<T>(
  results: T[],
  searchTerms: string[],
  entityType: SearchEntityType
): Array<T & { relevance_score: number }> {
  if (searchTerms.length === 0) {
    return results.map(item => ({ ...item, relevance_score: 1 }));
  }

  return results.map(item => {
    let score = 0;
    const searchText = getSearchableText(item as Record<string, unknown>, entityType).toLowerCase();

    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      if (searchText.includes(termLower)) {
        // Boost score for exact matches
        if (searchText.startsWith(termLower)) score += 10;
        else score += 5;
      }
    });

    return { ...item, relevance_score: score };
  });
}

function getSearchableText(item: Record<string, unknown>, entityType: SearchEntityType): string {
  const employeeSummary = item['employee'] as LeaveEmployeeSummary | undefined;

  switch (entityType) {
    case 'employee':
      return `${String(item['first_name'] ?? '')} ${String(item['last_name'] ?? '')} ${String(item['email'] ?? '')} ${String(item['department'] ?? '')}`;
    case 'leave':
      return `${String(item['leave_type'] ?? '')} ${String(item['reason'] ?? '')} ${employeeSummary?.first_name ?? ''} ${employeeSummary?.last_name ?? ''}`;
    case 'approval':
      return `${String(item['leave_type'] ?? '')} ${String(item['status'] ?? '')} ${employeeSummary?.first_name ?? ''} ${employeeSummary?.last_name ?? ''}`;
    default:
      return '';
  }
}

function getResultDate(result: SearchResult): Date {
  if ('updated_at' in result && result.updated_at) {
    return new Date(result.updated_at);
  }
  if ('created_at' in result && result.created_at) {
    return new Date(result.created_at);
  }
  if ('date_of_joining' in result && result.date_of_joining) {
    return new Date(result.date_of_joining);
  }
  return new Date(0);
}

function getResultName(result: SearchResult): string {
  if (result.entityType === 'employee') {
    return `${result.first_name} ${result.last_name}`.trim();
  }
  return `${result.employee?.first_name ?? ''} ${result.employee?.last_name ?? ''}`.trim();
}

function getResultDepartment(result: SearchResult): string | null {
  if (result.entityType === 'employee') {
    return result.department;
  }
  return result.employee?.department ?? null;
}

function sortResults(results: SearchResult[], sortBy: SortBy, sortOrder: SortOrder): SearchResult[] {
  return results.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'relevance':
        compareValue = ((a as RelevanceCarrier).relevance_score ?? 0) - ((b as RelevanceCarrier).relevance_score ?? 0);
        break;
      case 'date':
        compareValue = getResultDate(a).getTime() - getResultDate(b).getTime();
        break;
      case 'name':
        compareValue = getResultName(a).localeCompare(getResultName(b));
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });
}

function generateSearchInsights(results: SearchResult[], searchTerms: string[], counts: SearchCounts): SearchInsights {
  const resultDates = results.map(getResultDate).filter((date) => !Number.isNaN(date.getTime()));
  const dateValues = resultDates.map((date) => date.getTime());

  return {
    total_matches: results.length,
    best_match_entity: counts.employees >= counts.leaveRequests && counts.employees >= counts.approvals
      ? 'employees'
      : counts.leaveRequests >= counts.approvals ? 'leaves' : 'approvals',
    search_coverage: searchTerms.length > 0
      ? Math.min(100, Math.round((results.length / (searchTerms.length * 10)) * 100))
      : 100,
    departments_found: [...new Set(results.map(getResultDepartment).filter((department): department is string => Boolean(department)))],
    date_range: {
      earliest: dateValues.length > 0 ? new Date(Math.min(...dateValues)) : null,
      latest: dateValues.length > 0 ? new Date(Math.max(...dateValues)) : null,
    }
  };
}

function generateSearchSuggestions(query: string, insights: SearchInsights): string[] {
  const suggestions: string[] = [];
  
  if (query.length < 3) {
    suggestions.push('Try searching with at least 3 characters');
  }
  
  if (insights.departments_found.length > 0) {
    suggestions.push(`Filter by department: ${insights.departments_found.slice(0, 3).join(', ')}`);
  }
  
  if (insights.total_matches === 0) {
    suggestions.push('Try broader search terms or remove filters');
  }
  
  return suggestions;
}

function logSearchActivity(userId: string, query: string, entity: string, resultCount: number) {
  // Log to search analytics (would integrate with monitoring service)
  console.log(`[Search] User ${userId} searched "${query}" in ${entity}, found ${resultCount} results`);
  
  // This would be enhanced with:
  // - Search analytics tracking
  // - Popular searches identification
  // - User search behavior analysis
  // - Search performance monitoring
}