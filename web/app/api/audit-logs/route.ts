import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { verifyAuditChain } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    // Rate limit
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const search = searchParams.get('search') || undefined;
    const verifyChain = searchParams.get('verifyChain') === 'true';

    // Validate date parameters
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (from !== undefined) {
      if (!dateFormatRegex.test(from) || isNaN(new Date(from).getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for 'from' parameter." },
          { status: 400 }
        );
      }
    }
    if (to !== undefined) {
      if (!dateFormatRegex.test(to) || isNaN(new Date(to).getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for 'to' parameter." },
          { status: 400 }
        );
      }
    }

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entity_type = entityType;
    }

    if (actorId) {
      where.actor_id = actorId;
    }

    // Date range filter
    if (from || to) {
      const createdAtFilter: Record<string, Date> = {};
      if (from) {
        createdAtFilter.gte = new Date(from);
      }
      if (to) {
        // Set to end of day
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        createdAtFilter.lte = toDate;
      }
      where.created_at = createdAtFilter;
    }

    // Search filter: search across action, entity_type, and entity_id
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity_type: { contains: search, mode: 'insensitive' } },
        { entity_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute count and find in parallel
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: where as any }),
      prisma.auditLog.findMany({
        where: where as any,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entity_type: true,
          entity_id: true,
          previous_state: true,
          new_state: true,
          integrity_hash: true,
          prev_hash: true,
          created_at: true,
          actor: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Optionally verify chain integrity
    let chainStatus: { valid: boolean; totalLogs: number; verifiedLogs: number; details?: string } | undefined;
    if (verifyChain) {
      chainStatus = await verifyAuditChain(employee.org_id);
    }

    const pages = Math.ceil(total / limit);

    // Transform to API response shape
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      actor: log.actor
        ? {
            id: log.actor.id,
            firstName: log.actor.first_name,
            lastName: log.actor.last_name,
            email: log.actor.email,
          }
        : null,
      previousState: log.previous_state,
      newState: log.new_state,
      integrityHash: log.integrity_hash,
      prevHash: log.prev_hash,
      createdAt: log.created_at.toISOString(),
    }));

    return NextResponse.json(
      {
        logs: transformedLogs,
        pagination: { page, limit, total, pages },
        ...(chainStatus ? { chainStatus } : {}),
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
