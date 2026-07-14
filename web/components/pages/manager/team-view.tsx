import React from 'react';
import Link from 'next/link';
import { Users, Filter, MessageSquare, Briefcase, ChevronDown } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from "@/lib/prisma";
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export default async function TeamView() {
  let manager;
  try {
    manager = await getAuthEmployee();
    requireRole(manager, 'manager', 'team_lead', 'admin', 'hr', 'director', 'super_admin');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/sign-in?redirect=/manager/team&error=auth_required');
    }
    throw err;
  }

  if (!manager.org_id) {
    redirect('/onboarding');
  }

  const teamMembers = await prisma.employee.findMany({
    where: {
      org_id: manager.org_id,
      manager_id: manager.id,
      deleted_at: null,
      status: { not: 'exited' },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      designation: true,
      status: true,
    },
    orderBy: { first_name: 'asc' },
  });

  const rawMembers = teamMembers.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`.trim(),
    email: e.email,
    role: e.designation || 'Employee',
    init: (e.first_name.charAt(0) + e.last_name.charAt(0)).toUpperCase(),
    status: e.status === 'active' ? 'Active' : 'Inactive',
  }));

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
            Direct Reports
          </h1>
          <p className="text-body mt-2 max-w-lg">Your team members who report directly to you.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link href="/manager/search" className="btn btn-secondary w-full sm:w-auto"><Filter className="w-4 h-4" /> Filter Views</Link>
          <Link href="/manager/reports" className="btn btn-primary w-full sm:w-auto"><Users className="w-4 h-4" /> Open Headcount</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)]">
          <span className="text-3xl font-black text-[var(--primary)]">{rawMembers.length}</span>
          <span className="text-xs uppercase font-bold text-[var(--muted-foreground)]">Total Reports</span>
        </div>
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)]">
          <span className="text-3xl font-black text-[var(--success)]">{rawMembers.filter(r => r.status === 'Active').length}</span>
          <span className="text-xs uppercase font-bold text-[var(--muted-foreground)]">Active Today</span>
        </div>
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)] border-[var(--border)]">
          <span className="text-3xl font-black text-[var(--foreground)]">0</span>
          <span className="text-xs uppercase font-bold text-[var(--primary)]">Pending Reviews</span>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="min-w-[900px]">
          {rawMembers.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
              No direct reports found. Employees can be assigned to report to you from the HR directory.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Team Member</th>
                  <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Position</th>
                  <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rawMembers.map((member) => (
                  <tr key={member.id} className="group hover:bg-[var(--muted)] transition-colors border-b border-[var(--border)] last:border-b-0">
                    <td className="py-4 px-6 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--muted-foreground)] to-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] text-sm font-bold shadow-md">
                        {member.init}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[var(--foreground)]">{member.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{member.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Briefcase className="w-4 h-4" /> {member.role}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        member.status === 'Active' ? 'bg-[var(--success-bg)] text-[var(--success)]'
                        : member.status === 'On Leave' ? 'bg-[var(--info-bg)] text-[var(--info)]'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/manager/search?q=${encodeURIComponent(member.email)}`} className="btn btn-secondary btn-sm px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                        <Link href={`/manager/team?member=${encodeURIComponent(member.email)}`} className="btn btn-secondary btn-sm px-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Manage <ChevronDown className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
