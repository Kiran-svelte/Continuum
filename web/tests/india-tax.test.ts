import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculatePF,
  calculateESI,
  calculateProfessionalTax,
  calculateLOP,
  calculateTDS,
  calculateNetPay,
} from '@/lib/india-tax';

describe('calculatePF', () => {
  it('calculates 12% employee PF on basic salary', () => {
    const result = calculatePF(20000);
    // PF wage capped at 15000, so 15000 * 0.12 = 1800
    assert.strictEqual(result.employeeContribution, 1800);
    assert.strictEqual(result.employerContribution, 1800);
  });

  it('does not cap when basic is below ceiling', () => {
    const result = calculatePF(10000);
    assert.strictEqual(result.employeeContribution, 1200);
    assert.strictEqual(result.employerContribution, 1200);
  });

  it('caps at ₹15,000 basic ceiling', () => {
    const result = calculatePF(50000);
    assert.strictEqual(result.employeeContribution, 1800);
  });

  it('calculates total PF as sum of employee + employer', () => {
    const result = calculatePF(15000);
    assert.strictEqual(result.totalPF, result.employeeContribution + result.employerContribution);
  });

  it('handles zero basic', () => {
    const result = calculatePF(0);
    assert.strictEqual(result.employeeContribution, 0);
    assert.strictEqual(result.totalPF, 0);
  });
});

describe('PF EPS split', () => {
  it('splits employer contribution into EPS (8.33%) and PF', () => {
    const result = calculatePF(15000);
    // EPS: 15000 * 0.0833 = 1249.5 → rounded = 1250 (at max)
    assert.ok(result.employerEPS <= 1250);
    assert.strictEqual(result.employerEPS + result.employerPF, result.employerContribution);
  });

  it('caps EPS at ₹1,250', () => {
    const result = calculatePF(20000);
    assert.ok(result.employerEPS <= 1250);
  });

  it('EPS is less than max for low basic', () => {
    const result = calculatePF(5000);
    // 5000 * 0.0833 = 416.5 → 417
    assert.strictEqual(result.employerEPS, 417);
    assert.ok(result.employerEPS < 1250);
  });
});

describe('calculateESI', () => {
  it('calculates 0.75% employee + 3.25% employer when gross ≤ ₹21,000', () => {
    const result = calculateESI(20000);
    assert.strictEqual(result.applicable, true);
    assert.strictEqual(result.employeeContribution, Math.round(20000 * 0.0075));
    assert.strictEqual(result.employerContribution, Math.round(20000 * 0.0325));
  });

  it('returns zero when gross > ₹21,000', () => {
    const result = calculateESI(25000);
    assert.strictEqual(result.applicable, false);
    assert.strictEqual(result.employeeContribution, 0);
    assert.strictEqual(result.employerContribution, 0);
    assert.strictEqual(result.totalESI, 0);
  });

  it('applies at exact ceiling of ₹21,000', () => {
    const result = calculateESI(21000);
    assert.strictEqual(result.applicable, true);
  });

  it('calculates totalESI as sum of employee + employer', () => {
    const result = calculateESI(18000);
    assert.strictEqual(result.totalESI, result.employeeContribution + result.employerContribution);
  });
});

describe('calculateProfessionalTax', () => {
  it('Maharashtra: ₹200 for salary > ₹10,000', () => {
    const result = calculateProfessionalTax(15000, 'maharashtra');
    assert.strictEqual(result.monthlyTax, 200);
    assert.strictEqual(result.annualTax, 2400);
  });

  it('Maharashtra: ₹175 for salary ₹7,501–₹10,000', () => {
    const result = calculateProfessionalTax(9000, 'maharashtra');
    assert.strictEqual(result.monthlyTax, 175);
  });

  it('Maharashtra: ₹0 for salary ≤ ₹7,500', () => {
    const result = calculateProfessionalTax(7000, 'maharashtra');
    assert.strictEqual(result.monthlyTax, 0);
  });

  it('Karnataka: ₹0 for salary ≤ ₹15,000', () => {
    const result = calculateProfessionalTax(14000, 'karnataka');
    assert.strictEqual(result.monthlyTax, 0);
  });

  it('Karnataka: ₹200 for salary > ₹15,000', () => {
    const result = calculateProfessionalTax(20000, 'karnataka');
    assert.strictEqual(result.monthlyTax, 200);
  });

  it('defaults to ₹200 for unsupported state', () => {
    const result = calculateProfessionalTax(50000, 'unknown_state');
    assert.strictEqual(result.monthlyTax, 200);
    assert.strictEqual(result.annualTax, 2400);
  });
});

describe('calculateLOP', () => {
  it('calculates (basic / workingDays) × absentDays', () => {
    const result = calculateLOP(30000, 22, 3);
    assert.strictEqual(result, Math.round((30000 / 22) * 3));
  });

  it('returns 0 when no absent days', () => {
    assert.strictEqual(calculateLOP(30000, 22, 0), 0);
  });

  it('returns 0 when working days is 0', () => {
    assert.strictEqual(calculateLOP(30000, 0, 3), 0);
  });
});

describe('calculateTDS', () => {
  it('returns zero tax for income below standard deduction + exemption', () => {
    const result = calculateTDS(300000, 'new');
    // Taxable: 300000 - 75000 = 225000, which is in 0% slab (0–300000)
    assert.strictEqual(result.annualTax, 0);
  });

  it('returns regime in result', () => {
    const result = calculateTDS(500000, 'old');
    assert.strictEqual(result.regime, 'old');
  });

  it('calculates monthly tax as annualTax / 12', () => {
    const result = calculateTDS(1200000, 'new');
    assert.strictEqual(result.monthlyTax, Math.round(result.annualTax / 12));
  });

  it('effective rate is 0 for zero income', () => {
    const result = calculateTDS(0, 'new');
    assert.strictEqual(result.effectiveRate, 0);
  });
});

describe('calculateNetPay', () => {
  it('computes gross as sum of components', () => {
    const result = calculateNetPay({
      basic: 25000,
      hra: 10000,
      da: 5000,
      specialAllowance: 5000,
      workingDays: 22,
      presentDays: 22,
      leaveDays: 0,
      absentDays: 0,
    });
    assert.strictEqual(result.gross, 45000);
  });

  it('netPay = gross - totalDeductions', () => {
    const result = calculateNetPay({
      basic: 20000,
      hra: 8000,
      da: 4000,
      specialAllowance: 3000,
      workingDays: 22,
      presentDays: 20,
      leaveDays: 0,
      absentDays: 2,
    });
    assert.strictEqual(result.netPay, result.gross - result.totalDeductions);
  });

  it('includes LOP deduction for absent days', () => {
    const result = calculateNetPay({
      basic: 30000,
      hra: 10000,
      da: 5000,
      specialAllowance: 5000,
      workingDays: 22,
      presentDays: 19,
      leaveDays: 0,
      absentDays: 3,
    });
    assert.ok(result.lopDeduction > 0);
    assert.strictEqual(result.lopDeduction, Math.round((30000 / 22) * 3));
  });

  it('totalDeductions includes PF + ESI + PT + TDS + LOP', () => {
    const result = calculateNetPay({
      basic: 10000,
      hra: 4000,
      da: 2000,
      specialAllowance: 2000,
      workingDays: 22,
      presentDays: 22,
      leaveDays: 0,
      absentDays: 0,
    });
    const expected =
      result.pf.employeeContribution +
      result.esi.employeeContribution +
      result.professionalTax.monthlyTax +
      result.tds.monthlyTax +
      result.lopDeduction;
    assert.strictEqual(result.totalDeductions, expected);
  });
});
