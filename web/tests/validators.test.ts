import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  leaveRequestSchema,
  employeeCreateSchema,
} from '@/lib/integrity/validators';

describe('leaveRequestSchema', () => {
  it('valid leave request passes validation', () => {
    const input = {
      leave_type: 'CL',
      start_date: '2025-03-01',
      end_date: '2025-03-03',
      reason: 'Personal work',
      is_half_day: false,
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  it('passes with minimal required fields', () => {
    const input = {
      leave_type: 'SL',
      start_date: '2025-04-01',
      end_date: '2025-04-01',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  it('fails when leave_type is missing', () => {
    const input = {
      start_date: '2025-03-01',
      end_date: '2025-03-03',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails when start_date is missing', () => {
    const input = {
      leave_type: 'CL',
      end_date: '2025-03-03',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails when end_date is missing', () => {
    const input = {
      leave_type: 'CL',
      start_date: '2025-03-01',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails with invalid date format', () => {
    const input = {
      leave_type: 'CL',
      start_date: 'not-a-date',
      end_date: '2025-03-03',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails when start_date is after end_date', () => {
    const input = {
      leave_type: 'CL',
      start_date: '2025-03-05',
      end_date: '2025-03-01',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails when leave_type exceeds max length', () => {
    const input = {
      leave_type: 'TOOLONGTYPE',
      start_date: '2025-03-01',
      end_date: '2025-03-03',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('fails when leave_type is empty', () => {
    const input = {
      leave_type: '',
      start_date: '2025-03-01',
      end_date: '2025-03-03',
    };
    const result = leaveRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });
});

describe('employeeCreateSchema - email validation', () => {
  const validEmployee = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    date_of_joining: '2025-01-15',
    gender: 'male' as const,
  };

  it('valid email passes', () => {
    const result = employeeCreateSchema.safeParse(validEmployee);
    assert.strictEqual(result.success, true);
  });

  it('invalid email fails', () => {
    const result = employeeCreateSchema.safeParse({
      ...validEmployee,
      email: 'not-an-email',
    });
    assert.strictEqual(result.success, false);
  });

  it('empty email fails', () => {
    const result = employeeCreateSchema.safeParse({
      ...validEmployee,
      email: '',
    });
    assert.strictEqual(result.success, false);
  });

  it('email without domain fails', () => {
    const result = employeeCreateSchema.safeParse({
      ...validEmployee,
      email: 'user@',
    });
    assert.strictEqual(result.success, false);
  });
});
