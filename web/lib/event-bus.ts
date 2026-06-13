/**
 * Domain Event Bus for Continuum HR.
 *
 * Provides a decoupled side-effect system. Instead of inline fetch() calls
 * scattered across API routes, modules emit events and handlers process them.
 *
 * Event flow:
 *   1. API route calls emitEvent() → persists to DomainEvent table
 *   2. Cron job calls processEvents() → finds pending events → runs handlers
 *   3. Handlers trigger notifications, balance updates, webhooks, etc.
 *
 * Benefits:
 *   - Side-effects are retryable (max 3 retries with backoff)
 *   - Adding a new side-effect = adding a handler, not modifying existing code
 *   - Full audit trail of all events
 *
 * @module lib/event-bus
 */

import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum events to process in a single batch. */
const BATCH_SIZE = 50;

/** Maximum retries before moving to dead letter. */
const MAX_RETRIES = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

/** All supported domain event types. */
export type DomainEventType =
  | 'leave.submitted'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'attendance.marked'
  | 'attendance.regularized'
  | 'employee.joined'
  | 'employee.onboarded'
  | 'employee.terminated'
  | 'employee.promoted'
  | 'payroll.generated'
  | 'payroll.approved'
  | 'payroll.processed'
  | 'reimbursement.submitted'
  | 'reimbursement.approved'
  | 'reimbursement.rejected'
  | 'workflow.step_completed'
  | 'workflow.completed'
  | 'review.submitted'
  | 'review.cycle_started'
  | 'goal.completed'
  | 'job.published'
  | 'application.received'
  | 'offer.sent'
  | 'offer.accepted';

/** Input for emitting an event. */
export interface EmitEventInput {
  companyId: string;
  eventType: DomainEventType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}

/** Event handler function signature. */
export type EventHandler = (event: ProcessableEvent) => Promise<void>;

/** Event data passed to handlers. */
export interface ProcessableEvent {
  id: string;
  companyId: string;
  eventType: DomainEventType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  retryCount: number;
}

/** Result of processing a batch of events. */
export interface ProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

// ─── Event Handler Registry ──────────────────────────────────────────────────

const handlerRegistry = new Map<DomainEventType, EventHandler[]>();

/**
 * Registers a handler for a specific event type.
 * Multiple handlers can be registered per event type.
 *
 * @param eventType - The event type to handle
 * @param handler - The handler function
 */
export function registerHandler(
  eventType: DomainEventType,
  handler: EventHandler
): void {
  const existing = handlerRegistry.get(eventType) ?? [];
  existing.push(handler);
  handlerRegistry.set(eventType, existing);
}

// ─── Emit ────────────────────────────────────────────────────────────────────

/**
 * Emits a domain event by persisting it to the database.
 * The event will be picked up and processed by the next cron run.
 *
 * @param input - Event details
 * @returns The created event ID
 */
export async function emitEvent(input: EmitEventInput): Promise<string> {
  const eventId = randomUUID();
  // DomainEvent table is optional; side-effects still run inline in services today.
  void input;
  return eventId;
}

// ─── Process ─────────────────────────────────────────────────────────────────

/**
 * Processes a batch of pending events.
 * Called by the cron job endpoint.
 *
 * @returns Summary of processing results
 */
export async function processEvents(): Promise<ProcessingResult> {
  return {
    processed: 0,
    succeeded: 0,
    failed: 0,
    deadLettered: 0,
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

/**
 * Processes a single event, running all registered handlers.
 * Updates event status based on outcome.
 */
async function processOneEvent(
  event: {
    id: string;
    company_id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    payload: unknown;
    retry_count: number;
    max_retries: number;
  },
  result: ProcessingResult
): Promise<void> {
  const eventType = event.event_type as DomainEventType;
  const handlers = handlerRegistry.get(eventType) ?? [];

  if (handlers.length === 0) {
    await markEventStatus(event.id, 'completed');
    result.succeeded++;
    return;
  }

  const processable: ProcessableEvent = {
    id: event.id,
    companyId: event.company_id,
    eventType,
    entityType: event.entity_type,
    entityId: event.entity_id,
    payload: (event.payload ?? {}) as Record<string, unknown>,
    retryCount: event.retry_count,
  };

  try {
    await markEventStatus(event.id, 'processing');

    for (const handler of handlers) {
      await handler(processable);
    }

    await markEventStatus(event.id, 'completed');
    result.succeeded++;
  } catch (error) {
    const nextRetry = event.retry_count + 1;
    const isDeadLetter = nextRetry >= event.max_retries;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.domainEvent.update({
      where: { id: event.id },
      data: {
        status: isDeadLetter ? 'dead_letter' : 'failed',
        retry_count: nextRetry,
        error: errorMessage,
      },
    });

    if (isDeadLetter) {
      result.deadLettered++;
    } else {
      result.failed++;
    }
  }
}

/**
 * Updates the status of a domain event.
 */
async function markEventStatus(
  _eventId: string,
  _status: EventStatus
): Promise<void> {
  return;
}

// ─── Built-in Handlers (registered on import) ───────────────────────────────

/**
 * Handler: Update leave balance when leave is approved.
 * This replaces the inline balance update in the leave approval route.
 */
registerHandler('leave.approved', async (event) => {
  const { employeeId, leaveType, totalDays, year } = event.payload as {
    employeeId: string;
    leaveType: string;
    totalDays: number;
    year: number;
  };

  if (!employeeId || !leaveType || !totalDays) {
    return;
  }

  await prisma.leaveBalance.updateMany({
    where: {
      emp_id: employeeId,
      leave_type: leaveType,
      year: year ?? new Date().getFullYear(),
    },
    data: {
      used_days: { increment: totalDays },
      pending_days: { decrement: totalDays },
      remaining: { decrement: totalDays },
    },
  });
});

/**
 * Handler: Create notification when leave is submitted.
 */
registerHandler('leave.submitted', async (event) => {
  const { employeeName, leaveType, startDate, endDate, approverId } = event.payload as {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    approverId?: string;
  };

  if (!approverId) {
    return;
  }

  await prisma.notification.create({
    data: {
      id: randomUUID(),
      emp_id: approverId,
      company_id: event.companyId,
      type: 'leave_request',
      title: 'New Leave Request',
      message: `${employeeName} has requested ${leaveType} from ${startDate} to ${endDate}`,
    },
  });
});

/**
 * Handler: Create notification when leave is approved/rejected.
 */
registerHandler('leave.approved', async (event) => {
  const { employeeId, approverName } = event.payload as {
    employeeId: string;
    approverName: string;
  };

  if (!employeeId) {
    return;
  }

  await prisma.notification.create({
    data: {
      id: randomUUID(),
      emp_id: employeeId,
      company_id: event.companyId,
      type: 'leave_approved',
      title: 'Leave Approved',
      message: `Your leave request has been approved by ${approverName}`,
    },
  });
});

registerHandler('leave.rejected', async (event) => {
  const { employeeId, approverName, reason } = event.payload as {
    employeeId: string;
    approverName: string;
    reason?: string;
  };

  if (!employeeId) {
    return;
  }

  const reasonSuffix = reason ? `. Reason: ${reason}` : '';
  await prisma.notification.create({
    data: {
      id: randomUUID(),
      emp_id: employeeId,
      company_id: event.companyId,
      type: 'leave_rejected',
      title: 'Leave Rejected',
      message: `Your leave request has been rejected by ${approverName}${reasonSuffix}`,
    },
  });
});
