/**
 * Indian Payroll Tax Computation Engine.
 *
 * Implements statutory deduction calculations:
 * - TDS (Tax Deducted at Source) with mid-year proration
 * - HRA exemption (metro vs non-metro)
 * - PF (Provident Fund) with statutory wage ceiling
 * - Professional Tax (state-wise slabs)
 *
 * All monetary values are stored as integer paise (1/100 of ₹)
 * to avoid floating-point issues per Rule #78.
 *
 * @module lib/india-tax-engine
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** PF wage ceiling as per EPFO rules (₹15,000/month). */
const PF_WAGE_CEILING_MONTHLY_PAISE = 15_000_00;

/** PF employee contribution rate (12% of basic). */
const PF_EMPLOYEE_RATE = 0.12;

/** PF employer contribution rate (12% of basic). */
const PF_EMPLOYER_RATE = 0.12;

/** ESI threshold (₹21,000/month gross). */
const ESI_THRESHOLD_MONTHLY_PAISE = 21_000_00;

/** ESI employee rate (0.75% of gross). */
const ESI_EMPLOYEE_RATE = 0.0075;

/** ESI employer rate (3.25% of gross). */
const ESI_EMPLOYER_RATE = 0.0325;

/** Metro cities for HRA exemption calculation (50% vs 40%). */
const METRO_CITIES = ['mumbai', 'delhi', 'kolkata', 'chennai', 'new delhi', 'navi mumbai', 'thane'];

/** HRA metro rate (50% of basic). */
const HRA_METRO_RATE = 0.50;

/** HRA NON-METRO rate (40% of basic). */
const HRA_NON_METRO_RATE = 0.40;

// ─── New Tax Regime Slabs FY 2025-26 ────────────────────────────────────────

/** Income tax slabs for the new regime (default from FY 2024-25 onwards). */
const NEW_REGIME_SLABS = [
  { upTo: 4_00_000_00, rate: 0 },
  { upTo: 8_00_000_00, rate: 0.05 },
  { upTo: 12_00_000_00, rate: 0.10 },
  { upTo: 16_00_000_00, rate: 0.15 },
  { upTo: 20_00_000_00, rate: 0.20 },
  { upTo: 24_00_000_00, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];

/** Standard deduction under new regime (₹75,000 from FY 2024-25). */
const STANDARD_DEDUCTION_NEW_PAISE = 75_000_00;

// ─── Professional Tax Slabs (State-wise) ─────────────────────────────────────

/** Monthly Professional Tax by state (in paise). */
const PROFESSIONAL_TAX_SLABS: Record<string, ProfessionalTaxSlab[]> = {
  maharashtra: [
    { upTo: 7500_00, tax: 0 },
    { upTo: 10000_00, tax: 175_00 },
    { upTo: Infinity, tax: 200_00 }, // ₹200/month (₹300 for Feb)
  ],
  karnataka: [
    { upTo: 25000_00, tax: 0 },
    { upTo: Infinity, tax: 200_00 },
  ],
  west_bengal: [
    { upTo: 10000_00, tax: 0 },
    { upTo: 15000_00, tax: 110_00 },
    { upTo: 25000_00, tax: 130_00 },
    { upTo: 40000_00, tax: 150_00 },
    { upTo: Infinity, tax: 200_00 },
  ],
  telangana: [
    { upTo: 15000_00, tax: 0 },
    { upTo: 20000_00, tax: 150_00 },
    { upTo: Infinity, tax: 200_00 },
  ],
  tamil_nadu: [
    { upTo: 21000_00, tax: 0 },
    { upTo: 30000_00, tax: 135_00 },
    { upTo: 45000_00, tax: 315_00 },
    { upTo: 60000_00, tax: 690_00 },
    { upTo: 75000_00, tax: 1025_00 },
    { upTo: Infinity, tax: 1250_00 },
  ],
  default: [
    { upTo: 15000_00, tax: 0 },
    { upTo: Infinity, tax: 200_00 },
  ],
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfessionalTaxSlab {
  upTo: number;
  tax: number;
}

/** Input for monthly payroll computation. */
export interface MonthlyPayrollInput {
  /** Annual CTC in paise. */
  annualCtcPaise: number;
  /** Monthly basic salary in paise. */
  monthlyBasicPaise: number;
  /** Monthly HRA component in paise. */
  monthlyHraPaise: number;
  /** Monthly rent paid by employee in paise. */
  monthlyRentPaidPaise: number;
  /** Employee's city of residence. */
  city: string;
  /** Employee's state for Professional Tax. */
  state: string;
  /** The current month (1-12). */
  month: number;
  /** The month the employee joined (1-12). Used for mid-year proration. */
  joiningMonth: number;
  /** Is this the employee's first year? */
  isFirstYear: boolean;
  /** Total months in the financial year the employee will work. */
  workingMonthsInFy: number;
  /** Gross salary for this month in paise (for ESI threshold check). */
  monthlyGrossPaise: number;
}

/** Output of monthly payroll computation. */
export interface MonthlyPayrollOutput {
  /** Employee PF contribution in paise. */
  pfEmployeePaise: number;
  /** Employer PF contribution in paise. */
  pfEmployerPaise: number;
  /** PF wage used (capped at ceiling) in paise. */
  pfWagePaise: number;
  /** ESI employee contribution in paise (0 if above threshold). */
  esiEmployeePaise: number;
  /** ESI employer contribution in paise (0 if above threshold). */
  esiEmployerPaise: number;
  /** HRA exemption for this month in paise. */
  hraExemptionPaise: number;
  /** Professional Tax for this month in paise. */
  professionalTaxPaise: number;
  /** TDS for this month in paise. */
  tdsMonthlyPaise: number;
  /** Estimated annual tax in paise (for reference). */
  annualTaxEstimatePaise: number;
  /** Total employee deductions in paise. */
  totalDeductionsPaise: number;
  /** Net pay in paise. */
  netPayPaise: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute monthly payroll deductions for an Indian employee.
 *
 * @param input - Monthly payroll parameters
 * @returns Computed deductions and net pay
 */
export function computeMonthlyPayroll(input: MonthlyPayrollInput): MonthlyPayrollOutput {
  const pf = computePf(input.monthlyBasicPaise);
  const esi = computeEsi(input.monthlyGrossPaise);
  const hraExemption = computeHraExemption(
    input.monthlyBasicPaise,
    input.monthlyHraPaise,
    input.monthlyRentPaidPaise,
    input.city
  );
  const professionalTax = computeProfessionalTax(input.monthlyGrossPaise, input.state);
  const { monthlyTds, annualTax } = computeTds(input);

  const totalDeductions =
    pf.employeePaise +
    esi.employeePaise +
    professionalTax +
    monthlyTds;

  const netPay = input.monthlyGrossPaise - totalDeductions;

  return {
    pfEmployeePaise: pf.employeePaise,
    pfEmployerPaise: pf.employerPaise,
    pfWagePaise: pf.wagePaise,
    esiEmployeePaise: esi.employeePaise,
    esiEmployerPaise: esi.employerPaise,
    hraExemptionPaise: hraExemption,
    professionalTaxPaise: professionalTax,
    tdsMonthlyPaise: monthlyTds,
    annualTaxEstimatePaise: annualTax,
    totalDeductionsPaise: totalDeductions,
    netPayPaise: netPay,
  };
}

// ─── PF Computation ──────────────────────────────────────────────────────────

/**
 * Compute PF contributions, capped at statutory wage ceiling.
 */
function computePf(monthlyBasicPaise: number): {
  employeePaise: number;
  employerPaise: number;
  wagePaise: number;
} {
  const pfWage = Math.min(monthlyBasicPaise, PF_WAGE_CEILING_MONTHLY_PAISE);
  return {
    employeePaise: Math.round(pfWage * PF_EMPLOYEE_RATE),
    employerPaise: Math.round(pfWage * PF_EMPLOYER_RATE),
    wagePaise: pfWage,
  };
}

// ─── ESI Computation ─────────────────────────────────────────────────────────

/**
 * Compute ESI contributions. Only applicable if gross <= threshold.
 */
function computeEsi(monthlyGrossPaise: number): {
  employeePaise: number;
  employerPaise: number;
} {
  if (monthlyGrossPaise > ESI_THRESHOLD_MONTHLY_PAISE) {
    return { employeePaise: 0, employerPaise: 0 };
  }
  return {
    employeePaise: Math.round(monthlyGrossPaise * ESI_EMPLOYEE_RATE),
    employerPaise: Math.round(monthlyGrossPaise * ESI_EMPLOYER_RATE),
  };
}

// ─── HRA Exemption ───────────────────────────────────────────────────────────

/**
 * Compute HRA exemption. Exempt amount is the minimum of:
 * 1. Actual HRA received
 * 2. Rent paid - 10% of basic
 * 3. 50% (metro) or 40% (non-metro) of basic
 */
function computeHraExemption(
  monthlyBasicPaise: number,
  monthlyHraPaise: number,
  monthlyRentPaidPaise: number,
  city: string
): number {
  if (monthlyRentPaidPaise <= 0 || monthlyHraPaise <= 0) {
    return 0;
  }

  const isMetro = METRO_CITIES.includes(city.toLowerCase().trim());
  const percentOfBasic = isMetro ? HRA_METRO_RATE : HRA_NON_METRO_RATE;

  const option1 = monthlyHraPaise;
  const option2 = Math.max(0, monthlyRentPaidPaise - Math.round(monthlyBasicPaise * 0.10));
  const option3 = Math.round(monthlyBasicPaise * percentOfBasic);

  return Math.min(option1, option2, option3);
}

// ─── Professional Tax ────────────────────────────────────────────────────────

/**
 * Compute monthly Professional Tax based on state slabs.
 */
function computeProfessionalTax(monthlyGrossPaise: number, state: string): number {
  const normalizedState = state.toLowerCase().replace(/\s+/g, '_').trim();
  const slabs = PROFESSIONAL_TAX_SLABS[normalizedState] || PROFESSIONAL_TAX_SLABS['default'];

  for (const slab of slabs) {
    if (monthlyGrossPaise <= slab.upTo) {
      return slab.tax;
    }
  }

  return slabs[slabs.length - 1].tax;
}

// ─── TDS Computation ─────────────────────────────────────────────────────────

/**
 * Compute monthly TDS with mid-year proration.
 * Prorates the annual tax liability across the remaining months
 * of the financial year for employees who joined mid-year.
 */
function computeTds(input: MonthlyPayrollInput): {
  monthlyTds: number;
  annualTax: number;
} {
  const annualGross = input.annualCtcPaise;
  const taxableIncome = Math.max(0, annualGross - STANDARD_DEDUCTION_NEW_PAISE);
  const annualTax = computeSlabTax(taxableIncome);
  const annualTaxWithCess = annualTax + Math.round(annualTax * 0.04); // 4% cess

  // Mid-year proration: spread annual tax over remaining months
  const remainingMonths = input.isFirstYear
    ? Math.max(1, 13 - input.joiningMonth)
    : 12;

  const monthlyTds = Math.round(annualTaxWithCess / remainingMonths);

  return { monthlyTds, annualTax: annualTaxWithCess };
}

/**
 * Compute tax using new regime slab rates.
 */
function computeSlabTax(taxableIncomePaise: number): number {
  let remainingIncome = taxableIncomePaise;
  let totalTax = 0;
  let previousLimit = 0;

  for (const slab of NEW_REGIME_SLABS) {
    const slabWidth = slab.upTo === Infinity
      ? remainingIncome
      : Math.min(remainingIncome, slab.upTo - previousLimit);

    if (slabWidth <= 0) break;

    totalTax += Math.round(slabWidth * slab.rate);
    remainingIncome -= slabWidth;
    previousLimit = slab.upTo;

    if (remainingIncome <= 0) break;
  }

  return totalTax;
}
