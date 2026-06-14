import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import InviteCredentialsEditor from '@/components/super-admin/invite-credentials-editor';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UsersInvitesIdView({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/admin/login');
  }

  const invite = await prisma.userInvite.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      status: true,
      expires_at: true,
    },
  });

  if (!invite || invite.status !== 'pending') {
    return (
      <div className="space-y-6">
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="card p-8 text-center text-muted">Pending invite not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/super-admin/users"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <div className="card p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Pending Invite</h1>
          <p className="text-sm text-muted mt-1">Update email and role before the user accepts.</p>
        </div>
        <div className="text-sm text-muted inline-flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Expires {new Date(invite.expires_at).toLocaleDateString()}
        </div>
      </div>

      <InviteCredentialsEditor
        inviteId={invite.id}
        initialEmail={invite.email}
        initialFirstName={invite.first_name}
        initialLastName={invite.last_name}
        initialRole={invite.role as 'admin' | 'hr' | 'director' | 'manager'}
      />
    </div>
  );
}
