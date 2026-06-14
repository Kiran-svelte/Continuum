/**
 * Domain Event System for Continuum HR.
 *
 * Provides a type-safe, in-process pub/sub event bus for decoupled
 * module communication. Events are dispatched synchronously within
 * the request lifecycle (not queued to an external broker).
 *
 * Usage:
 *   - Modules emit events: `emitEvent('leave.approved', { leaveId, empId })`
 *   - Handlers subscribe: `onEvent('leave.approved', handler)`
 *   - Audit logging, notifications, and cascade updates subscribe to events.
 *
 * Design: Synchronous dispatch within the same process. For cross-service
 * events, wrap this with a queue adapter (out of scope for now).
 *
 * @module lib/event-system
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of handlers per event type. Prevents runaway subscriptions. */
const MAX_HANDLERS_PER_EVENT = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

/** All domain event types in the system. */
export type DomainEventType =
  | 'leave.requested'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'attendance.checked_in'
  | 'attendance.checked_out'
  | 'employee.onboarded'
  | 'employee.terminated'
  | 'employee.role_changed'
  | 'payroll.processed'
  | 'payroll.paid'
  | 'review.submitted'
  | 'review.acknowledged'
  | 'goal.completed'
  | 'course.enrolled'
  | 'course.completed'
  | 'travel.requested'
  | 'travel.approved'
  | 'travel.rejected'
  | 'expense.submitted'
  | 'expense.approved'
  | 'expense.rejected'
  | 'offer.sent'
  | 'offer.accepted'
  | 'offer.rejected';

export interface DomainEvent {
  /** Unique event ID. */
  id: string;
  /** Event type identifier. */
  type: DomainEventType;
  /** ISO timestamp when the event occurred. */
  timestamp: string;
  /** Company scope. */
  companyId: string;
  /** Employee who triggered the event. */
  actorId: string;
  /** Additional event-specific data. */
  payload: Record<string, unknown>;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

// ─── Event Bus ────────────────────────────────────────────────────────────────

const handlers = new Map<DomainEventType, EventHandler[]>();

/**
 * Registers an event handler for a specific event type.
 *
 * @param eventType - The event to subscribe to.
 * @param handler   - Async function called when the event fires.
 * @throws Error if handler limit is exceeded.
 */
export function onEvent(eventType: DomainEventType, handler: EventHandler): void {
  const existing = handlers.get(eventType) ?? [];

  if (existing.length >= MAX_HANDLERS_PER_EVENT) {
    throw new Error(
      `Handler limit (${MAX_HANDLERS_PER_EVENT}) reached for event "${eventType}". Check for duplicate subscriptions.`
    );
  }

  handlers.set(eventType, [...existing, handler]);
}

/**
 * Removes a specific handler for an event type.
 *
 * @param eventType - The event type.
 * @param handler   - The handler reference to remove.
 */
export function offEvent(eventType: DomainEventType, handler: EventHandler): void {
  const existing = handlers.get(eventType) ?? [];
  handlers.set(eventType, existing.filter((h) => h !== handler));
}

/**
 * Emits a domain event and dispatches it to all registered handlers.
 * Handlers run sequentially. Failures are logged but do not block
 * subsequent handlers.
 *
 * @param type      - The event type to emit.
 * @param companyId - Company scope.
 * @param actorId   - Employee who caused the event.
 * @param payload   - Event-specific data.
 * @returns The created DomainEvent.
 */
export async function emitEvent(
  type: DomainEventType,
  companyId: string,
  actorId: string,
  payload: Record<string, unknown> = {}
): Promise<DomainEvent> {
  const event: DomainEvent = {
    id: randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    companyId,
    actorId,
    payload,
  };

  const eventHandlers = handlers.get(type) ?? [];

  for (const handler of eventHandlers) {
    try {
      await handler(event);
    } catch (error) {
      console.error(
        `[EventSystem] Handler failed for "${type}" (event: ${event.id}):`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return event;
}

/**
 * Returns the count of registered handlers for a given event type.
 * Useful for debugging and testing.
 */
export function getHandlerCount(eventType: DomainEventType): number {
  return (handlers.get(eventType) ?? []).length;
}

/**
 * Clears all handlers for all event types.
 * Used in tests to reset state between test cases.
 */
export function clearAllHandlers(): void {
  handlers.clear();
}

// ─── Built-in Handlers ───────────────────────────────────────────────────────

/**
 * Audit log handler — writes every domain event to the AuditLog table.
 * This handler is auto-registered on module load.
 */
async function auditLogHandler(event: DomainEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        company_id: event.companyId,
        actor_id: event.actorId,
        action: event.type,
        entity_type: event.type.split('.')[0],
        entity_id: (event.payload.entityId as string) ?? event.id,
        new_state: event.payload as Prisma.InputJsonObject,
        integrity_hash: event.id,
        created_at: new Date(event.timestamp),
      },
    });
  } catch (error) {
    console.error(
      `[EventSystem] Audit log write failed for event ${event.id}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ─── Auto-register Built-in Handlers ──────────────────────────────────────────

const ALL_EVENT_TYPES: DomainEventType[] = [
  'leave.requested', 'leave.approved', 'leave.rejected', 'leave.cancelled',
  'attendance.checked_in', 'attendance.checked_out',
  'employee.onboarded', 'employee.terminated', 'employee.role_changed',
  'payroll.processed', 'payroll.paid',
  'review.submitted', 'review.acknowledged',
  'goal.completed',
  'course.enrolled', 'course.completed',
  'travel.requested', 'travel.approved', 'travel.rejected',
  'expense.submitted', 'expense.approved', 'expense.rejected',
  'offer.sent', 'offer.accepted', 'offer.rejected',
];

for (const eventType of ALL_EVENT_TYPES) {
  onEvent(eventType, auditLogHandler);
}
