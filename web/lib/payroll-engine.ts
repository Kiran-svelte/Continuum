/**
 * Server-side Payroll Engine for Continuum HR.
 *
 * Wraps the India Tax Engine with company-configurable settings.
 * Instead of hardcoded rates in the frontend autoCalc(), this engine
 * reads PayrollConfig from the database and applies company-specific overrides.
 *
 * Usage:
 *   1. Company admin configures rates via PayrollConfig
 *   2. Payroll generation calls computeEmployeePayroll() per employee
 *   3. Returns full breakdown with statutory deductions
 *
 * @module lib/payroll-engine
 */

import prisma from '@/lib/prisma';
import {
  computeMonthlyPayroll,
  type MonthlyPayrollInput,
  type MonthlyPayrollOutput,
} from '@/lib/india-tax-engine';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Paise per rupee — used for rupee↔paise conversion. */
const PAISE_PER_RUPEE = 100;

/** Default working days per month when no attendance data is available. */
const DEFAULT_WORKING_DAYS_PER_MONTH = 22;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Company payroll configuration loaded from DB. */
export interface PayrollConfigData {
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfWageCeiling: number;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiThreshold: number;
  basicPercentOfCtc: number;
  hraPercentOfBasic: number;
  daPercentOfBasic: number;
  state: string;
  taxRegime: 'old_regime' | 'new_regime';
  isPfEnabled: boolean;
  isEsiEnabled: boolean;
  isPtEnabled: boolean;
}

/** Input for computing a single employee's monthly payroll. */
export interface EmployeePayrollInput {
  employeeId: string;
  annualCtc: number;
  month: number;
  year: number;
  joiningMonth: number;
  isFirstYear: boolean;
  workingMonthsInFy: number;
  city: string;
  monthlyRentPaid: number;
  presentDays: number;
  workingDays: number;
  leaveDays: number;
  absentDays: number;
}

/** Full payroll computation result for one employee. */
export interface EmployeePayrollResult {
  employeeId: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  gross: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  lopDeduction: number;
  totalDeductions: number;
  netPay: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
}

// ─── Config Loading ──────────────────────────────────────────────────────────

/**
 * Loads payroll configuration for a company.
 * Falls back to statutory defaults if no company-specific config exists.
 *
 * @param companyId - The company ID
 * @returns Payroll configuration with all statutory rates
 */
export async function getPayrollConfig(
  companyId: string
): Promise<PayrollConfigData> {
  const config = await prisma.payrollConfig.findUnique({
    where: { company_id: companyId },
  });

  if (!config) {
    return getDefaultPayrollConfig();
  }

  return {
    pfEmployeeRate: config.pf_employee_rate,
    pfEmployerRate: config.pf_employer_rate,
    pfWageCeiling: config.pf_wage_ceiling,
    esiEmployeeRate: config.esi_employee_rate,
    esiEmployerRate: config.esi_employer_rate,
    esiThreshold: config.esi_threshold,
    basicPercentOfCtc: config.basic_percent_of_ctc,
    hraPercentOfBasic: config.hra_percent_of_basic,
    daPercentOfBasic: config.da_percent_of_basic,
    state: config.state,
    taxRegime: config.tax_regime,
    isPfEnabled: config.is_pf_enabled,
    isEsiEnabled: config.is_esi_enabled,
    isPtEnabled: config.is_pt_enabled,
  };
}

/**
 * Returns statutory default configuration.
 * Used when no company-specific config exists.
 */
function getDefaultPayrollConfig(): PayrollConfigData {
  return {
    pfEmployeeRate: 0.12,
    pfEmployerRate: 0.12,
    pfWageCeiling: 15_000_00,
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    esiThreshold: 21_000_00,
    basicPercentOfCtc: 0.40,
    hraPercentOfBasic: 0.50,
    daPercentOfBasic: 0,
    state: 'maharashtra',
    taxRegime: 'new_regime',
    isPfEnabled: true,
    isEsiEnabled: true,
    isPtEnabled: true,
  };
}

// ─── Computation ─────────────────────────────────────────────────────────────

/**
 * Computes monthly payroll for a single employee using company config.
 *
 * @param input - Employee-specific payroll inputs
 * @param config - Company payroll configuration
 * @returns Full payroll breakdown
 */
export function computeEmployeePayroll(
  input: EmployeePayrollInput,
  config: PayrollConfigData
): EmployeePayrollResult {
  const annualCtcPaise = rupeesToPaise(input.annualCtc);
  const monthlyCtcPaise = Math.round(annualCtcPaise / 12);

  const salary = computeSalaryBreakdown(monthlyCtcPaise, config);
  const monthlyGrossPaise = salary.basic + salary.hra + salary.da + salary.specialAllowance;

  const taxEngineInput: MonthlyPayrollInput = {
    annualCtcPaise,
    monthlyBasicPaise: salary.basic,
    monthlyHraPaise: salary.hra,
    monthlyRentPaidPaise: rupeesToPaise(input.monthlyRentPaid),
    city: input.city,
    state: config.state,
    month: input.month,
    joiningMonth: input.joiningMonth,
    isFirstYear: input.isFirstYear,
    workingMonthsInFy: input.workingMonthsInFy,
    monthlyGrossPaise,
  };

  const taxResult = computeMonthlyPayroll(taxEngineInput);
  const lopDeduction = computeLopDeduction(monthlyGrossPaise, input);

  const adjustedResult = applyConfigOverrides(taxResult, config, monthlyGrossPaise);
  const totalDeductions =
    adjustedResult.pfEmployeePaise +
    adjustedResult.esiEmployeePaise +
    adjustedResult.professionalTaxPaise +
    adjustedResult.tdsMonthlyPaise +
    lopDeduction;

  const netPay = monthlyGrossPaise - totalDeductions;

  return {
    employeeId: input.employeeId,
    month: input.month,
    year: input.year,
    basic: paiseToRupees(salary.basic),
    hra: paiseToRupees(salary.hra),
    da: paiseToRupees(salary.da),
    specialAllowance: paiseToRupees(salary.specialAllowance),
    gross: paiseToRupees(monthlyGrossPaise),
    pfEmployee: paiseToRupees(adjustedResult.pfEmployeePaise),
    pfEmployer: paiseToRupees(adjustedResult.pfEmployerPaise),
    esiEmployee: paiseToRupees(adjustedResult.esiEmployeePaise),
    esiEmployer: paiseToRupees(adjustedResult.esiEmployerPaise),
    professionalTax: paiseToRupees(adjustedResult.professionalTaxPaise),
    tds: paiseToRupees(adjustedResult.tdsMonthlyPaise),
    lopDeduction: paiseToRupees(lopDeduction),
    totalDeductions: paiseToRupees(totalDeductions),
    netPay: paiseToRupees(netPay),
    workingDays: input.workingDays,
    presentDays: input.presentDays,
    leaveDays: input.leaveDays,
    absentDays: input.absentDays,
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

interface SalaryBreakdown {
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
}

/**
 * Computes salary component breakdown from monthly CTC using company config.
 * All values in paise.
 */
function computeSalaryBreakdown(
  monthlyCtcPaise: number,
  config: PayrollConfigData
): SalaryBreakdown {
  const basic = Math.round(monthlyCtcPaise * config.basicPercentOfCtc);
  const hra = Math.round(basic * config.hraPercentOfBasic);
  const da = Math.round(basic * config.daPercentOfBasic);
  const specialAllowance = Math.max(0, monthlyCtcPaise - basic - hra - da);

  return { basic, hra, da, specialAllowance };
}

/**
 * Computes Loss of Pay deduction based on absent days.
 * All values in paise.
 */
function computeLopDeduction(
  monthlyGrossPaise: number,
  input: EmployeePayrollInput
): number {
  const effectiveWorkingDays = input.workingDays || DEFAULT_WORKING_DAYS_PER_MONTH;

  if (input.absentDays <= 0) {
    return 0;
  }

  const dailyRate = Math.round(monthlyGrossPaise / effectiveWorkingDays);
  return dailyRate * input.absentDays;
}

/**
 * Applies company config overrides to tax engine results.
 * Zeroes out disabled deductions (PF, ESI, PT).
 */
function applyConfigOverrides(
  result: MonthlyPayrollOutput,
  config: PayrollConfigData,
  _monthlyGrossPaise: number
): MonthlyPayrollOutput {
  return {
    ...result,
    pfEmployeePaise: config.isPfEnabled ? result.pfEmployeePaise : 0,
    pfEmployerPaise: config.isPfEnabled ? result.pfEmployerPaise : 0,
    esiEmployeePaise: config.isEsiEnabled ? result.esiEmployeePaise : 0,
    esiEmployerPaise: config.isEsiEnabled ? result.esiEmployerPaise : 0,
    professionalTaxPaise: config.isPtEnabled ? result.professionalTaxPaise : 0,
  };
}

/**
 * Converts rupees to paise (integer).
 * Uses integer math to avoid floating-point issues.
 */
function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/**
 * Converts paise to rupees (2 decimal places).
 */
function paiseToRupees(paise: number): number {
  return Math.round(paise) / PAISE_PER_RUPEE;
}
