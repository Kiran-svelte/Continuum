import { z } from 'zod';

// ─── Leave Request Validation ────────────────────────────────────────────────

export const leaveRequestSchema = z.object({
  leave_type: z.string().min(1, 'Leave type is required').max(10),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(1000, 'Reason must not exceed 1000 characters')
    .optional(),
  is_half_day: z.boolean().default(false),
  attachment_url: z.string().url('Invalid attachment URL').optional().nullable(),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  { message: 'Start date must be before or equal to end date', path: ['end_date'] }
);

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

// ─── Employee Validation ─────────────────────────────────────────────────────

export const employeeCreateSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  department: z.string().max(100).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  date_of_joining: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of joining',
  }),
  gender: z.enum(['male', 'female', 'other']),
  primary_role: z
    .enum(['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'])
    .default('employee'),
  manager_id: z.string().uuid('Invalid manager ID').optional().nullable(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial().omit({
  email: true,
  date_of_joining: true,
  gender: true,
});

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

// ─── Company Settings Validation ─────────────────────────────────────────────

export const companySettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional().nullable(),
  size: z.string().max(50).optional().nullable(),
  timezone: z.string().max(50).default('Asia/Kolkata'),
  work_start: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .default('09:00'),
  work_end: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .default('18:00'),
  work_days: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'At least one work day required')
    .default([1, 2, 3, 4, 5]),
  grace_period_minutes: z.number().int().min(0).max(120).default(15),
  half_day_hours: z.number().min(1).max(12).default(4),
  leave_year_start: z
    .string()
    .regex(/^\d{2}-\d{2}$/, 'Invalid date format (MM-DD)')
    .default('01-01'),
  probation_period_days: z.number().int().min(0).max(365).default(180),
  notice_period_days: z.number().int().min(0).max(365).default(90),
  sla_hours: z.number().int().min(1).max(720).default(48),
  negative_balance: z.boolean().default(false),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

// ─── Balance Adjustment Validation ───────────────────────────────────────────

export const balanceAdjustmentSchema = z.object({
  emp_id: z.string().uuid('Invalid employee ID'),
  leave_type: z.string().min(1).max(10),
  adjustment: z.number().refine((val) => val !== 0, {
    message: 'Adjustment cannot be zero',
  }),
  reason: z.string().min(3, 'Reason is required').max(500),
});

export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>;

// ─── Approval Validation ─────────────────────────────────────────────────────

export const approvalSchema = z.object({
  comments: z.string().max(1000).optional().nullable(),
});

export const rejectionSchema = z.object({
  comments: z.string().min(3, 'Rejection reason is required').max(1000),
});

// ─── OTP Validation ──────────────────────────────────────────────────────────

export const otpVerifySchema = z.object({
  action: z.string().min(1),
  code: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// ─── Pagination / Query Validation ───────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── ID Parameter Validation ─────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Invalid ID format');

export const dateRangeSchema = z.object({
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  { message: 'Start date must be before or equal to end date', path: ['end_date'] }
);
