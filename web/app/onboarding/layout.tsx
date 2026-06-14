import { redirect } from 'next/navigation';
import { getAuthEmployee } from '@/lib/auth-guard';
import { getDefaultPortalForRole } from '@/lib/auth-routing';
import {
  isEmployeeOnboardingComplete,
  requiresCompanyOnboarding,
  requiresEmployeeOnboarding,
} from '@/lib/employee-onboarding';
import prisma from '@/lib/prisma';

/**
 * Company onboarding wizard is admin-only. Invited employees must never render this tree.
 */
export default async function CompanyOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let employee;
  try {
    employee = await getAuthEmployee();
  } catch {
    redirect('/sign-in');
  }

  const role = (employee.primary_role || '').toLowerCase();

  if (requiresEmployeeOnboarding(role)) {
    const profile = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: {
        phone: true,
        current_address: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        tutorial_completed: true,
      },
    });

    const done = isEmployeeOnboardingComplete({
      phone: profile?.phone,
      current_address: profile?.current_address,
      emergency_contact_name: profile?.emergency_contact_name,
      emergency_contact_phone: profile?.emergency_contact_phone,
      emergency_contact_relationship: profile?.emergency_contact_relationship,
    });

    if (!done) {
      redirect('/employee/onboarding');
    }
    if (!profile?.tutorial_completed) {
      redirect('/employee/welcome');
    }
    redirect(getDefaultPortalForRole(role));
  }

  if (!requiresCompanyOnboarding(role)) {
    redirect(getDefaultPortalForRole(role));
  }

  return children;
}
