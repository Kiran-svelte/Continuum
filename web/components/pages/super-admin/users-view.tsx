import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Users, Clock, CheckCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { sendSuperAdminUserInviteEmail } from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import { Button } from '@/components/ui/button';
import { ConfirmFormButton } from '@/components/ui/confirm-form-button';

async function resendInviteAction(formData: FormData) {
  'use server';

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const inviteId = String(formData.get('inviteId') || '').trim();
  if (!inviteId) {
    throw new Error('Invite ID is required.');
  }

  const invite = await prisma.userInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      email: true,
      first_name: true,
      role: true,
      status: true,
    },
  });

  if (!invite || invite.status !== 'pending') {
    throw new Error('Only pending invites can be resent.');
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: {
      token,
      expires_at: expiresAt,
      updated_at: new Date(),
    },
  });

  const inviteUrl = buildAppUrl(`/invite/accept/${token}`);
  const inviterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;

  const emailResult = await sendSuperAdminUserInviteEmail(
    invite.email,
    invite.first_name,
    inviterName,
    invite.role,
    inviteUrl,
    expiresAt
  );

  if (!emailResult.success) {
    throw new Error(emailResult.error || 'Failed to send invite email.');
  }

  revalidatePath('/super-admin/users');
}

async function revokeInviteAction(formData: FormData) {
  'use server';

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const inviteId = String(formData.get('inviteId') || '').trim();
  if (!inviteId) {
    throw new Error('Invite ID is required.');
  }

  await prisma.userInvite.update({
    where: { id: inviteId },
    data: {
      status: 'revoked',
      updated_at: new Date(),
    },
  });

  revalidatePath('/super-admin/users');
}

async function deactivateUserAction(formData: FormData) {
  'use server';

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const userId = String(formData.get('userId') || '').trim();
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const target = await prisma.employee.findFirst({
    where: {
      id: userId,
      invited_by_type: 'super_admin',
      deleted_at: null,
    },
    select: { id: true, status: true },
  });

  if (!target) {
    throw new Error('User not found.');
  }

  if (target.status === 'terminated' || target.status === 'exited') {
    throw new Error('User is already deactivated.');
  }

  await prisma.employee.update({
    where: { id: target.id },
    data: {
      status: 'terminated',
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  revalidatePath('/super-admin/users');
}

/**
 * Super Admin - Users List
 * 
 * Enterprise-grade user management with refined design system.
 * - Design tokens from globals.css
 * - Proper spacing, padding, and color hierarchy
 * - Light & dark theme support
 * - Optimized for all screen sizes
 */
export default async function UsersView() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const superAdminEmployees = await prisma.employee.findMany({
    where: { primary_role: 'super_admin' },
    select: { id: true },
  });
  const superAdminEmployeeIds = superAdminEmployees.map((employee) => employee.id);

  // Fetch all invites and employees created by super admin
  const [invites, employees] = await Promise.all([
    prisma.userInvite.findMany({
      where: {
        OR: [
          { invited_by_super_id: { not: null } },
          { invited_by_id: { in: superAdminEmployeeIds } },
        ],
      },
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { name: true } },
      },
    }),
    prisma.employee.findMany({
      where: { invited_by_type: 'super_admin' },
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { name: true } },
      },
    }),
  ]);

  const pendingInvites = invites.filter(i => i.status === 'pending');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Users</h1>
              <p className="text-muted-foreground mt-2">
                Manage platform users and invitations across all companies
              </p>
            </div>
            <Link
              href="/super-admin/users/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Link>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending Invites Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Pending Invites
                  </p>
                  <p className="text-3xl font-bold text-foreground">{pendingInvites.length}</p>
                </div>
                <div className="p-3 bg-status-warning/15 rounded-lg">
                  <Clock className="w-6 h-6 text-status-warning" />
                </div>
              </div>
            </div>

            {/* Active Users Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Active Users
                  </p>
                  <p className="text-3xl font-bold text-foreground">{employees.length}</p>
                </div>
                <div className="p-3 bg-status-success/15 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-status-success" />
                </div>
              </div>
            </div>

            {/* Total Invites Card */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Invites
                  </p>
                  <p className="text-3xl font-bold text-foreground">{invites.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Pending Invitations Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Pending Invitations</h2>
            </div>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {pendingInvites.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex p-3 bg-muted/30 rounded-full mb-4">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No pending invitations</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Email</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Role</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Expires</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendingInvites.map((invite) => (
                        <tr key={invite.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-foreground">{invite.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 inline-block rounded-full text-xs font-medium bg-status-warning/15 text-status-warning border border-status-warning/20">
                              {invite.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(invite.expires_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/super-admin/users/invites/${invite.id}`}
                                className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                              >
                                Edit
                              </Link>
                              <form action={resendInviteAction} className="inline">
                                <input type="hidden" name="inviteId" value={invite.id} />
                                <Button
                                  type="submit"
                                  className="px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded transition-colors"
                                  variant="ghost"
                                  size="sm"
                                >
                                  Resend
                                </Button>
                              </form>
                              <form action={revokeInviteAction} className="inline">
                                <input type="hidden" name="inviteId" value={invite.id} />
                                <ConfirmFormButton
                                  type="submit"
                                  confirmMessage={`Revoke invitation for ${invite.email}?`}
                                  className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  variant="ghost"
                                  size="sm"
                                >
                                  Revoke
                                </ConfirmFormButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Active Users Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Active Users</h2>
            </div>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {employees.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex p-3 bg-muted/30 rounded-full mb-4">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No users have accepted their invitations yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Name</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Email</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Role</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Company</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{emp.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 inline-block rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              {emp.primary_role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {emp.company?.name || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 inline-block rounded-full text-xs font-medium ${
                                emp.status === 'active'
                                  ? 'bg-status-success/15 text-status-success border border-status-success/20'
                                  : 'bg-status-warning/15 text-status-warning border border-status-warning/20'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/super-admin/users/${emp.id}`}
                                className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                              >
                                View
                              </Link>
                              <form action={deactivateUserAction} className="inline">
                                <input type="hidden" name="userId" value={emp.id} />
                                <ConfirmFormButton
                                  type="submit"
                                  confirmMessage={`Deactivate ${emp.first_name} ${emp.last_name}? They will lose platform access.`}
                                  className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  variant="ghost"
                                  size="sm"
                                >
                                  Deactivate
                                </ConfirmFormButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
