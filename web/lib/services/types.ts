/**
 * Core service result type for the Zero UI headless service layer.
 * All service functions return this type — they never throw (except programmer errors).
 * Implements L5-03-PART-B.
 */

/** All possible service error codes (exhaustive). */
export type ServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_BALANCE'
  | 'MODULE_DISABLED'
  | 'COMPANY_SETUP_INCOMPLETE'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'ALREADY_CLOCKED_IN'
  | 'ALREADY_CLOCKED_OUT'
  | 'WFH_DISABLED'
  | 'NOTICE_PERIOD'
  | 'CONSTRAINT_VIOLATION'
  | 'OVERLAP_CONFLICT'
  | 'INTERNAL_ERROR';

/** A successful service result. */
export type ServiceOk<T> = { ok: true; data: T };

/** A failed service result. */
export type ServiceError = {
  ok: false;
  error: {
    code: ServiceErrorCode;
    message: string;
    httpStatus: number;
    details?: unknown;
  };
};

/**
 * Discriminated union for all service function returns.
 * Routes map ok=false to appropriate HTTP status via error.httpStatus.
 */
export type ServiceResult<T> = ServiceOk<T> | ServiceError;

/**
 * Execution context passed to all headless service functions.
 * Built from a JWT session (web) or a ChannelIdentityLink (WhatsApp).
 * Implements L5-03-003.
 */
export interface AssistantExecutionContext {
  /** Employee UUID. */
  employeeId: string;
  /** Company UUID. */
  orgId: string;
  /** Employee email. */
  email: string;
  /** First name. */
  firstName: string;
  /** Last name. */
  lastName: string;
  /** Primary role string (matches Role enum). */
  primaryRole: string;
  /** Resolved portal slug for deep links (e.g. 'employee', 'manager'). */
  portalSlug: string;
  /** Permission codes for the employee. */
  permissions: string[];
  /** Channel that triggered this context ('web' | 'whatsapp'). */
  channel: 'web' | 'whatsapp';
  /** External message ID from channel (for idempotency). */
  externalMessageId?: string;
  /** Idempotency key for write operations. */
  idempotencyKey?: string;
}

/**
 * Creates a successful ServiceResult.
 *
 * @param data - The success payload.
 * @returns ServiceOk wrapping data.
 */
export function serviceOk<T>(data: T): ServiceOk<T> {
  return { ok: true, data };
}

/**
 * Creates an error ServiceResult.
 *
 * @param code - Machine-readable error code.
 * @param message - User-safe error message.
 * @param httpStatus - HTTP status code (for route handler mapping).
 * @param details - Optional extra detail (validation errors etc.).
 * @returns ServiceError with the given fields.
 */
export function serviceError(
  code: ServiceErrorCode,
  message: string,
  httpStatus: number,
  details?: unknown
): ServiceError {
  return { ok: false, error: { code, message, httpStatus, details } };
}
