import React from 'react';
import Link from 'next/link';
import { Users, Filter, MessageSquare, Briefcase, ChevronDown } from 'lucide-react';
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

type TeamMemberRow = {
  name: string;
  email: string;
  role: string;
  init: string;
  status: string;
  performance: string;
};

export default async function TeamView() {

  let rawMembers: TeamMemberRow[] = [];
  let dbActive = true;
  let hasTeamLoadError = false;

  try {
    const dbEmployees = await prisma.employee.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    });

    if (dbEmployees.length > 0) {
      rawMembers = dbEmployees.map(e => ({
        name: `${e.first_name} ${e.last_name}`,
        email: e.email,
        role: e.designation || "Employee",
        init: e.first_name.charAt(0) + e.last_name.charAt(0),
        status: e.status === 'active' ? 'Online' : 'Offline',
        performance: "Not Rated"
      }));
    } else {
      throw new Error("No team rows");
    }
  } catch {
    dbActive = false;
    hasTeamLoadError = true;
    rawMembers = [];
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
            Direct Reports
            {!dbActive && <span className="text-[10px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 px-2 rounded-full uppercase">DB Error Fallback</span>}
          </h1>
          <p className="text-body mt-2 max-w-lg">Live synchronized team status and performance monitoring interface.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link href="/manager/search" className="btn btn-secondary w-full sm:w-auto"><Filter className="w-4 h-4" /> Filter Views</Link>
          <Link href="/manager/reports" className="btn btn-primary w-full sm:w-auto"><Users className="w-4 h-4" /> Open Headcount</Link>
        </div>
      </header>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)]">
          <span className="text-3xl font-black text-[var(--primary)]">{rawMembers.length}</span>
          <span className="text-xs uppercase font-bold text-[var(--muted-foreground)]">Total Reports</span>
        </div>
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)]">
          <span className="text-3xl font-black text-[var(--success)]">{rawMembers.filter(r => r.status === 'Online').length}</span>
          <span className="text-xs uppercase font-bold text-[var(--muted-foreground)]">Present Today</span>
        </div>
        <div className="card p-4 flex flex-col justify-center items-center hoverable bg-[var(--background)] border-[var(--border)]">
          <span className="text-3xl font-black text-[var(--foreground)]">0</span>
          <span className="text-xs uppercase font-bold text-[var(--primary)]">Pending Reviews</span>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="min-w-[900px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Team Member</th>
                <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Position</th>
                <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Current Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)]">Q3 Performance</th>
                <th className="py-4 px-6 text-xs font-semibold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase bg-[var(--muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMembers.map((member, i) => (
                <tr key={i} className="group hover:bg-[var(--muted)] transition-colors border-b border-[var(--border)] last:border-b-0">
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
                    <div className="flex items-center gap-2">
                       <span className={`w-2.5 h-2.5 rounded-full ${member.status === 'Online' ? 'bg-[var(--success)] shadow-[0_0_10px_var(--success)]' : member.status === 'In Meeting' ? 'bg-[var(--status-warning)]' : member.status === 'On Leave' ? 'bg-[var(--primary)]' : 'bg-[var(--muted-foreground)]'}`}></span>
                       <span className="text-sm font-medium">{member.status}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-md border ${
                      member.performance.includes('Exceeds') ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20' 
                      : member.performance.includes('Review') ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                    }`}>
                      {member.performance}
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
          {hasTeamLoadError && (
            <div className="px-6 py-5 text-sm text-[var(--status-warning)] border-t border-[var(--border)] bg-[var(--status-warning-soft)]/40">
              Team data is temporarily unavailable. Showing no rows until the database is reachable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
