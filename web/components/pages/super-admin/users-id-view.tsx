import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, Mail, Shield, UserCircle } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import UserCredentialsEditor from '@/components/super-admin/user-credentials-editor';

function formatDateTime(value: Date | null): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UsersIdView({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      primary_role: true,
      status: true,
      created_at: true,
      updated_at: true,
      invite_accepted_at: true,
      last_login_at: true,
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!employee) {
    return (
      <div className="space-y-6">
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>

        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt">
            <UserCircle className="h-6 w-6 text-muted" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">User not found</h1>
          <p className="mt-2 text-sm text-muted">
            The user you are looking for does not exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`.trim();

  return (
    <div className="space-y-6">
      <Link
        href="/super-admin/users"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{fullName}</h1>
            <p className="mt-1 text-sm text-muted">User ID: {employee.id}</p>
          </div>
          <span className="status-badge status-pending capitalize">{employee.status}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Account Details</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Email</p>
                <p className="font-medium text-foreground">{employee.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Role</p>
                <p className="font-medium text-foreground capitalize">{employee.primary_role}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Company</p>
                <p className="font-medium text-foreground">{employee.company?.name ?? 'No company assigned'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Timestamps</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Created At</p>
                <p className="font-medium text-foreground">{formatDateTime(employee.created_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Updated At</p>
                <p className="font-medium text-foreground">{formatDateTime(employee.updated_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Invite Accepted At</p>
                <p className="font-medium text-foreground">{formatDateTime(employee.invite_accepted_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted" />
              <div>
                <p className="text-muted">Last Login At</p>
                <p className="font-medium text-foreground">{formatDateTime(employee.last_login_at)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <UserCredentialsEditor userId={employee.id} initialEmail={employee.email} />
    </div>
  );
}
