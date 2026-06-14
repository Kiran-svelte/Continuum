/**
 * Indian Statutory Compliance Engine for Continuum HR.
 *
 * Calculates PF (Provident Fund), ESI (Employee State Insurance),
 * Professional Tax, and TDS (Tax Deducted at Source) as per
 * Indian labor law for the FY 2025–2026 brackets.
 *
 * These functions are designed to be consumed by the payroll engine
 * during payroll run calculations.
 *
 * References:
 * - PF: EPFO Act 1952 (12% employee + 12% employer on basic up to ₹15,000)
 * - ESI: ESIC Act 1948 (0.75% employee + 3.25% employer, wage ceiling ₹21,000/month)
 * - PT: State-specific (Karnataka schedule used as default)
 * - TDS: Income Tax Act, Section 192 (new regime FY 2025-26)
 *
 * @module lib/payroll/statutory-india
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** PF contribution rate for employee (percentage). */
const PF_EMPLOYEE_RATE_PERCENT = 12;

/** PF contribution rate for employer (percentage). */
const PF_EMPLOYER_RATE_PERCENT = 12;

/** Maximum basic salary for PF calculation (₹/month). */
const PF_WAGE_CEILING = 15000;

/** ESI employee contribution rate (percentage). */
const ESI_EMPLOYEE_RATE_PERCENT = 0.75;

/** ESI employer contribution rate (percentage). */
const ESI_EMPLOYER_RATE_PERCENT = 3.25;

/** ESI gross salary ceiling (₹/month). Employees above this are exempt. */
const ESI_WAGE_CEILING = 21000;

/** Professional Tax monthly slab (Karnataka default). */
const PROFESSIONAL_TAX_SLABS: ProfessionalTaxSlab[] = [
  { minGross: 0, maxGross: 15000, taxAmount: 0 },
  { minGross: 15001, maxGross: 25000, taxAmount: 150 },
  { minGross: 25001, maxGross: Infinity, taxAmount: 200 },
];

/** TDS — New Tax Regime FY 2025-26 annual slabs. */
const TDS_NEW_REGIME_SLABS: TdsSlab[] = [
  { minIncome: 0, maxIncome: 400000, ratePercent: 0 },
  { minIncome: 400001, maxIncome: 800000, ratePercent: 5 },
  { minIncome: 800001, maxIncome: 1200000, ratePercent: 10 },
  { minIncome: 1200001, maxIncome: 1600000, ratePercent: 15 },
  { minIncome: 1600001, maxIncome: 2000000, ratePercent: 20 },
  { minIncome: 2000001, maxIncome: 2400000, ratePercent: 25 },
  { minIncome: 2400001, maxIncome: Infinity, ratePercent: 30 },
];

/** Standard deduction under new regime (FY 2025-26). */
const STANDARD_DEDUCTION = 75000;

/** Education + health cess rate on tax (percentage). */
const CESS_RATE_PERCENT = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessionalTaxSlab {
  minGross: number;
  maxGross: number;
  taxAmount: number;
}

interface TdsSlab {
  minIncome: number;
  maxIncome: number;
  ratePercent: number;
}

export interface StatutoryBreakdown {
  /** PF deducted from employee salary (₹/month). */
  pfEmployee: number;
  /** PF contributed by employer (₹/month). Not deducted from salary. */
  pfEmployer: number;
  /** ESI deducted from employee salary (₹/month). 0 if above ceiling. */
  esiEmployee: number;
  /** ESI contributed by employer (₹/month). */
  esiEmployer: number;
  /** Professional Tax deducted (₹/month). */
  professionalTax: number;
  /** TDS deducted from salary (₹/month). */
  tdsMonthly: number;
  /** Total employee deductions (₹/month). */
  totalEmployeeDeductions: number;
  /** Total employer cost above gross (₹/month). */
  totalEmployerCost: number;
  /** Net salary after all deductions (₹/month). */
  netSalary: number;
}

export interface StatutoryInput {
  /** Monthly basic salary (₹). */
  basicMonthly: number;
  /** Monthly HRA (₹). */
  hraMonthly: number;
  /** Monthly gross salary (₹). Total of all components before deductions. */
  grossMonthly: number;
  /** Annual CTC for TDS calculation. If not provided, estimated from gross × 12. */
  annualCtc?: number;
  /** Whether PF should be calculated on actual basic or capped at ceiling. */
  isPfOnActualBasic?: boolean;
  /** Whether the employee is ESI-eligible (auto-computed from gross if not set). */
  isEsiEligible?: boolean;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Calculates all Indian statutory deductions for one employee for one month.
 *
 * @param input - Salary components for the employee.
 * @returns Full statutory breakdown with employee deductions and employer costs.
 */
export function calculateStatutoryDeductions(input: StatutoryInput): StatutoryBreakdown {
  const pfResult = calculatePf(input.basicMonthly, input.isPfOnActualBasic ?? false);
  const esiResult = calculateEsi(input.grossMonthly, input.isEsiEligible);
  const professionalTax = calculateProfessionalTax(input.grossMonthly);
  const tdsMonthly = calculateTdsMonthly(input.annualCtc ?? input.grossMonthly * 12);

  const totalEmployeeDeductions =
    pfResult.employeeContribution +
    esiResult.employeeContribution +
    professionalTax +
    tdsMonthly;

  const totalEmployerCost =
    pfResult.employerContribution +
    esiResult.employerContribution;

  const netSalary = Math.max(0, input.grossMonthly - totalEmployeeDeductions);

  return {
    pfEmployee: pfResult.employeeContribution,
    pfEmployer: pfResult.employerContribution,
    esiEmployee: esiResult.employeeContribution,
    esiEmployer: esiResult.employerContribution,
    professionalTax,
    tdsMonthly,
    totalEmployeeDeductions: Math.round(totalEmployeeDeductions),
    totalEmployerCost: Math.round(totalEmployerCost),
    netSalary: Math.round(netSalary),
  };
}

// ─── PF Calculation ───────────────────────────────────────────────────────────

/**
 * Calculates Provident Fund contributions.
 *
 * @param basicMonthly - Monthly basic salary.
 * @param isOnActualBasic - If true, PF is on full basic; if false, capped at ₹15,000.
 * @returns Employee and employer contribution amounts.
 */
function calculatePf(
  basicMonthly: number,
  isOnActualBasic: boolean
): { employeeContribution: number; employerContribution: number } {
  const pfBase = isOnActualBasic ? basicMonthly : Math.min(basicMonthly, PF_WAGE_CEILING);

  return {
    employeeContribution: Math.round((pfBase * PF_EMPLOYEE_RATE_PERCENT) / 100),
    employerContribution: Math.round((pfBase * PF_EMPLOYER_RATE_PERCENT) / 100),
  };
}

// ─── ESI Calculation ──────────────────────────────────────────────────────────

/**
 * Calculates Employee State Insurance contributions.
 * Employees earning above ₹21,000/month gross are ESI-exempt.
 *
 * @param grossMonthly - Monthly gross salary.
 * @param isEligibleOverride - Force eligibility if explicitly set.
 * @returns Employee and employer contribution amounts.
 */
function calculateEsi(
  grossMonthly: number,
  isEligibleOverride?: boolean
): { employeeContribution: number; employerContribution: number } {
  const isEligible = isEligibleOverride ?? grossMonthly <= ESI_WAGE_CEILING;

  if (!isEligible) {
    return { employeeContribution: 0, employerContribution: 0 };
  }

  return {
    employeeContribution: Math.round((grossMonthly * ESI_EMPLOYEE_RATE_PERCENT) / 100),
    employerContribution: Math.round((grossMonthly * ESI_EMPLOYER_RATE_PERCENT) / 100),
  };
}

// ─── Professional Tax ─────────────────────────────────────────────────────────

/**
 * Calculates Professional Tax based on monthly gross salary.
 * Uses Karnataka state slabs by default.
 *
 * @param grossMonthly - Monthly gross salary.
 * @returns Monthly professional tax amount.
 */
function calculateProfessionalTax(grossMonthly: number): number {
  for (const slab of PROFESSIONAL_TAX_SLABS) {
    if (grossMonthly >= slab.minGross && grossMonthly <= slab.maxGross) {
      return slab.taxAmount;
    }
  }
  return 0;
}

// ─── TDS (Income Tax) ─────────────────────────────────────────────────────────

/**
 * Calculates monthly TDS under the New Tax Regime (FY 2025-26).
 *
 * Steps:
 * 1. Subtract standard deduction from annual CTC.
 * 2. Apply slab rates progressively.
 * 3. Add 4% cess.
 * 4. Divide by 12 for monthly deduction.
 *
 * @param annualCtc - Annual cost to company.
 * @returns Monthly TDS amount.
 */
function calculateTdsMonthly(annualCtc: number): number {
  const taxableIncome = Math.max(0, annualCtc - STANDARD_DEDUCTION);

  let annualTax = 0;

  for (const slab of TDS_NEW_REGIME_SLABS) {
    if (taxableIncome <= 0) break;

    const slabWidth = slab.maxIncome === Infinity
      ? taxableIncome - slab.minIncome + 1
      : slab.maxIncome - slab.minIncome + 1;

    const taxableInSlab = Math.min(
      Math.max(0, taxableIncome - slab.minIncome + 1),
      slabWidth
    );

    annualTax += (taxableInSlab * slab.ratePercent) / 100;
  }

  const cessAmount = (annualTax * CESS_RATE_PERCENT) / 100;
  const totalAnnualTax = annualTax + cessAmount;

  return Math.round(totalAnnualTax / 12);
}

// ─── Bulk Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates statutory deductions for an entire payroll batch.
 *
 * @param employees - Array of salary inputs for each employee.
 * @returns Array of statutory breakdowns in the same order.
 */
export function calculateBatchStatutory(
  employees: StatutoryInput[]
): StatutoryBreakdown[] {
  return employees.map((input) => calculateStatutoryDeductions(input));
}
