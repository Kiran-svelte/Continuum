import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-service';
import { getEmailVerificationState } from '@/lib/product-readiness';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employee = await prisma.employee.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  const state = await getEmailVerificationState(employee.id);
  return NextResponse.json(state);
}
