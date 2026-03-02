// ─── Types ───────────────────────────────────────────────────────────────────

export interface PFResult {
  employeeContribution: number;
  employerContribution: number;
  employerEPS: number;
  employerPF: number;
  totalPF: number;
}

export interface ESIResult {
  employeeContribution: number;
  employerContribution: number;
  totalESI: number;
  applicable: boolean;
}

export interface ProfessionalTaxResult {
  monthlyTax: number;
  annualTax: number;
}

export interface TDSResult {
  annualTax: number;
  monthlyTax: number;
  effectiveRate: number;
  regime: 'old' | 'new';
}

export interface NetPayParams {
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  state?: string;
  annualIncome?: number;
  taxRegime?: 'old' | 'new';
}

export interface NetPayResult {
  gross: number;
  pf: PFResult;
  esi: ESIResult;
  professionalTax: ProfessionalTaxResult;
  tds: TDSResult;
  lopDeduction: number;
  totalDeductions: number;
  netPay: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PF_RATE = 0.12;
const PF_CEILING = 15000;
const EPS_RATE = 0.0833;
const EPS_MAX_CONTRIBUTION = 1250;
const ESI_EMPLOYEE_RATE = 0.0075;
const ESI_EMPLOYER_RATE = 0.0325;
const ESI_CEILING = 21000;

// ─── PF Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates Provident Fund:
 * - Employee: 12% of basic (capped at ₹15,000 wage ceiling)
 * - Employer: 12% of basic (capped at ₹15,000 wage ceiling)
 *   - Split: 8.33% to EPS (max ₹1,250) + remainder to PF
 */
export function calculatePF(basic: number): PFResult {
  const pfWage = Math.min(basic, PF_CEILING);

  const employeeContribution = Math.round(pfWage * PF_RATE);
  const totalEmployerContribution = Math.round(pfWage * PF_RATE);

  const employerEPS = Math.min(
    Math.round(pfWage * EPS_RATE),
    EPS_MAX_CONTRIBUTION
  );
  const employerPF = totalEmployerContribution - employerEPS;

  return {
    employeeContribution,
    employerContribution: totalEmployerContribution,
    employerEPS,
    employerPF,
    totalPF: employeeContribution + totalEmployerContribution,
  };
}

// ─── ESI Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates ESI:
 * - Employee: 0.75% of gross
 * - Employer: 3.25% of gross
 * - Only applicable if gross ≤ ₹21,000
 */
export function calculateESI(gross: number): ESIResult {
  if (gross > ESI_CEILING) {
    return {
      employeeContribution: 0,
      employerContribution: 0,
      totalESI: 0,
      applicable: false,
    };
  }

  const employeeContribution = Math.round(gross * ESI_EMPLOYEE_RATE);
  const employerContribution = Math.round(gross * ESI_EMPLOYER_RATE);

  return {
    employeeContribution,
    employerContribution,
    totalESI: employeeContribution + employerContribution,
    applicable: true,
  };
}

// ─── Professional Tax ────────────────────────────────────────────────────────

type SupportedState =
  | 'maharashtra'
  | 'karnataka'
  | 'telangana'
  | 'tamil_nadu'
  | 'west_bengal'
  | 'gujarat'
  | 'andhra_pradesh';

interface PTSlab {
  min: number;
  max: number;
  tax: number;
}

const PT_SLABS: Record<SupportedState, PTSlab[]> = {
  maharashtra: [
    { min: 0, max: 7500, tax: 0 },
    { min: 7501, max: 10000, tax: 175 },
    { min: 10001, max: Infinity, tax: 200 },
  ],
  karnataka: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 25000, tax: 200 },
    { min: 25001, max: Infinity, tax: 200 },
  ],
  telangana: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 20000, tax: 150 },
    { min: 20001, max: Infinity, tax: 200 },
  ],
  tamil_nadu: [
    { min: 0, max: 21000, tax: 0 },
    { min: 21001, max: 30000, tax: 100 },
    { min: 30001, max: 45000, tax: 235 },
    { min: 45001, max: 60000, tax: 510 },
    { min: 60001, max: 75000, tax: 760 },
    { min: 75001, max: Infinity, tax: 1095 },
  ],
  west_bengal: [
    { min: 0, max: 10000, tax: 0 },
    { min: 10001, max: 15000, tax: 110 },
    { min: 15001, max: 25000, tax: 130 },
    { min: 25001, max: 40000, tax: 150 },
    { min: 40001, max: Infinity, tax: 200 },
  ],
  gujarat: [
    { min: 0, max: 5999, tax: 0 },
    { min: 6000, max: 8999, tax: 80 },
    { min: 9000, max: 11999, tax: 150 },
    { min: 12000, max: Infinity, tax: 200 },
  ],
  andhra_pradesh: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 20000, tax: 150 },
    { min: 20001, max: Infinity, tax: 200 },
  ],
};

/** Calculates Professional Tax based on state-wise slabs */
export function calculateProfessionalTax(
  gross: number,
  state: string = 'maharashtra'
): ProfessionalTaxResult {
  const normalizedState = state.toLowerCase().replace(/\s+/g, '_') as SupportedState;
  const slabs = PT_SLABS[normalizedState];

  if (!slabs) {
    return { monthlyTax: 200, annualTax: 2400 };
  }

  let monthlyTax = 0;
  for (const slab of slabs) {
    if (gross >= slab.min && gross <= slab.max) {
      monthlyTax = slab.tax;
      break;
    }
  }

  return {
    monthlyTax,
    annualTax: monthlyTax * 12,
  };
}

// ─── TDS (Income Tax) ───────────────────────────────────────────────────────

interface TaxSlab {
  min: number;
  max: number;
  rate: number;
}

const OLD_REGIME_SLABS: TaxSlab[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250001, max: 500000, rate: 0.05 },
  { min: 500001, max: 1000000, rate: 0.2 },
  { min: 1000001, max: Infinity, rate: 0.3 },
];

const NEW_REGIME_SLABS: TaxSlab[] = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300001, max: 700000, rate: 0.05 },
  { min: 700001, max: 1000000, rate: 0.1 },
  { min: 1000001, max: 1200000, rate: 0.15 },
  { min: 1200001, max: 1500000, rate: 0.2 },
  { min: 1500001, max: Infinity, rate: 0.3 },
];

/** Calculates TDS based on annual income and chosen tax regime */
export function calculateTDS(
  annualIncome: number,
  regime: 'old' | 'new' = 'new'
): TDSResult {
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;

  // Standard deduction
  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);

  let annualTax = 0;

  for (const slab of slabs) {
    if (taxableIncome <= 0) break;

    const slabWidth = slab.max === Infinity
      ? Math.max(0, taxableIncome - slab.min + 1)
      : Math.min(slab.max - slab.min + 1, Math.max(0, taxableIncome - slab.min + 1));

    if (taxableIncome >= slab.min) {
      const taxableInSlab = Math.min(
        taxableIncome - slab.min + 1,
        slabWidth
      );
      annualTax += Math.round(taxableInSlab * slab.rate);
    }
  }

  // 4% cess
  annualTax = Math.round(annualTax * 1.04);

  const monthlyTax = Math.round(annualTax / 12);
  const effectiveRate = annualIncome > 0 ? (annualTax / annualIncome) * 100 : 0;

  return {
    annualTax,
    monthlyTax,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    regime,
  };
}

// ─── LOP Calculation ─────────────────────────────────────────────────────────

/** Calculates Loss of Pay deduction: (basic / workingDays) × absentDays */
export function calculateLOP(
  basic: number,
  workingDays: number,
  absentDays: number
): number {
  if (workingDays <= 0 || absentDays <= 0) return 0;
  return Math.round((basic / workingDays) * absentDays);
}

// ─── Full Net Pay Calculation ────────────────────────────────────────────────

/** Computes the complete monthly payroll for an employee */
export function calculateNetPay(params: NetPayParams): NetPayResult {
  const {
    basic,
    hra,
    da,
    specialAllowance,
    workingDays,
    presentDays: _presentDays,
    leaveDays: _leaveDays,
    absentDays,
    state = 'maharashtra',
    annualIncome,
    taxRegime = 'new',
  } = params;

  const gross = basic + hra + da + specialAllowance;

  const pf = calculatePF(basic);
  const esi = calculateESI(gross);
  const professionalTax = calculateProfessionalTax(gross, state);

  // Annual income: use provided value, or estimate from monthly gross
  const estimatedAnnualIncome = annualIncome ?? gross * 12;
  const tds = calculateTDS(estimatedAnnualIncome, taxRegime);

  const lopDeduction = calculateLOP(basic, workingDays, absentDays);

  const totalDeductions =
    pf.employeeContribution +
    esi.employeeContribution +
    professionalTax.monthlyTax +
    tds.monthlyTax +
    lopDeduction;

  const netPay = gross - totalDeductions;

  return {
    gross,
    pf,
    esi,
    professionalTax,
    tds,
    lopDeduction,
    totalDeductions,
    netPay,
  };
}
