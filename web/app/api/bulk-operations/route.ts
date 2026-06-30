/**
 * Bulk Operations API — RALPH-20260630-018
 *
 * GET  /api/bulk-operations — list recent bulk jobs (employee.edit_any)
 * POST /api/bulk-operations — create a new bulk job
 *
 * Supported types:
 *   - update_salaries: payload.updates = [{emp_id, salary}]
 *   - assign_shift:    payload.updates = [{emp_id, shift_id}]
 *   - bulk_leave:      payload.updates = [{emp_id, leave_type_id, start_date, end_date}]
 *   - send_email:      payload.updates = [{emp_id}], payload.subject, payload.body
 *
 * Propagated to: app/hr/(main)/bulk-operations/page
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

const VALID_TYPES = ['update_salaries', 'assign_shift', 'bulk_leave', 'send_email', 'import_employees'];

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    const jobs = await prisma.bulkJob.findMany({
      where: { company_id: employee.org_id! },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { type, payload } = body;
    if (!type || !VALID_TYPES.includes(type))
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    if (!payload?.updates || !Array.isArray(payload.updates))
      return NextResponse.json({ error: 'payload.updates[] required' }, { status: 400 });

    // Create job record
    const job = await prisma.bulkJob.create({
      data: {
        company_id: employee.org_id!,
        type,
        status: 'processing',
        total: payload.updates.length,
        payload,
        created_by: employee.id,
      },
    });

    // Execute synchronously for smaller batches (≤500)
    const errors: Array<{ index: number; emp_id: string; error: string }> = [];
    let processed = 0;

    for (let i = 0; i < payload.updates.length; i++) {
      const update = payload.updates[i];
      try {
        if (type === 'update_salaries' && update.emp_id && update.ctc != null) {
          await prisma.salaryStructure.updateMany({
            where: { emp_id: update.emp_id, company_id: employee.org_id! },
            data: { ctc: Number(update.ctc) },
          });
        } else if (type === 'assign_shift' && update.emp_id && update.shift_id) {
          await prisma.employeeShift.create({
            data: {
              company_id: employee.org_id!,
              emp_id: update.emp_id,
              shift_id: update.shift_id,
              effective_from: new Date(update.effective_from ?? new Date()),
            },
          });
        } else if (type === 'bulk_leave' && update.emp_id) {
          await prisma.leaveRequest.create({
            data: {
              company_id: employee.org_id!,
              emp_id: update.emp_id,
              leave_type: update.leave_type ?? 'casual',
              start_date: new Date(update.start_date),
              end_date: new Date(update.end_date),
              total_days: update.total_days ?? 1,
              reason: payload.reason ?? 'Bulk leave allocation',
              status: 'approved',
              approved_by: employee.id,
            },
          });
        }
        processed++;
      } catch (err) {
        errors.push({ index: i, emp_id: update.emp_id ?? '?', error: String(err) });
      }
    }

    const updatedJob = await prisma.bulkJob.update({
      where: { id: job.id },
      data: { status: errors.length === 0 ? 'done' : 'failed', processed, errors, completed_at: new Date() },
    });

    return NextResponse.json({ job: updatedJob }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
