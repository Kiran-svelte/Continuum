type EmployeeOnboardingProfile = {
  phone?: string | null;
  current_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
};

const COMPANY_ONBOARDING_ROLES = new Set(['admin']);
const EMPLOYEE_ONBOARDING_ROLES = new Set(['employee']);

function hasText(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function requiresCompanyOnboarding(role?: string | null): boolean {
  const normalizedRole = (role || '').trim().toLowerCase();
  return COMPANY_ONBOARDING_ROLES.has(normalizedRole);
}

export function requiresEmployeeOnboarding(role?: string | null): boolean {
  const normalizedRole = (role || '').trim().toLowerCase();
  return EMPLOYEE_ONBOARDING_ROLES.has(normalizedRole);
}

export function isEmployeeOnboardingComplete(profile: EmployeeOnboardingProfile): boolean {
  return (
    hasText(profile.phone) &&
    hasText(profile.current_address)
  );
}