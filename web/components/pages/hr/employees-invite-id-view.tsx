import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import HrInviteCredentialsEditor from '@/components/hr/invite-credentials-editor';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeesInviteIdView({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !['admin', 'hr', 'super_admin'].includes(user.role)) {
    redirect('/sign-in');
  }

  if (!user.orgId) {
    redirect('/hr/employees/invite');
  }

  const invite = await prisma.userInvite.findFirst({
    where: {
      id,
      company_id: user.orgId,
      status: 'pending',
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      department: true,
      expires_at: true,
    },
  });

  if (!invite) {
    return (
      <div className="space-y-6 p-6">
        <Link
          href="/hr/employees/invite"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invite Employees
        </Link>
        <div className="card p-8 text-center text-muted">Pending invite not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <Link
        href="/hr/employees/invite"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Invite Employees
      </Link>

      <div className="card p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Pending Invite</h1>
          <p className="text-sm text-muted mt-1">Adjust email and role before employee activation.</p>
        </div>
        <div className="text-sm text-muted inline-flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Expires {new Date(invite.expires_at).toLocaleDateString()}
        </div>
      </div>

      <HrInviteCredentialsEditor
        inviteId={invite.id}
        initialEmail={invite.email}
        initialFirstName={invite.first_name}
        initialLastName={invite.last_name}
        initialRole={invite.role as 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee'}
        initialDepartment={invite.department || ''}
      />
    </div>
  );
}
