'use client';

import { GitBranch, Clock, Info } from 'lucide-react';
import { GlassPanel } from '@/components/glass-panel';

/**
 * Explains how leave approval differs from attendance regularization approval.
 */
export function WorkflowExplainerPanel() {
  return (
    <GlassPanel className="mb-6 border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,var(--primary)_8%)] p-4">
      <div className="flex gap-3">
        <Info className="h-5 w-5 shrink-0 text-[var(--primary)] mt-0.5" aria-hidden />
        <div className="space-y-3 text-sm text-[var(--foreground)] readable-copy">
          <p className="font-semibold">Who approves what?</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-3">
              <p className="flex items-center gap-2 font-medium">
                <GitBranch className="h-4 w-4 text-[var(--primary)]" />
                Leave, expenses, travel, payroll advances
              </p>
              <ul className="mt-2 list-disc pl-5 text-[var(--muted-foreground)] space-y-1">
                <li>Configured under <strong>Approval Chains</strong> (per employee) and <strong>Company Settings → Approval Chains</strong> (role matrix).</li>
                <li>Assigned approver is stored on each request (<code>current_approver_id</code>).</li>
                <li>Only that approver (or HR/admin in the chain) can approve, unless escalated.</li>
                <li>Toggle capability via <strong>Admin → RBAC</strong> permissions <code>leave.approve_team</code> / <code>leave.approve_any</code>.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-3">
              <p className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-amber-500" />
                Attendance regularization
              </p>
              <ul className="mt-2 list-disc pl-5 text-[var(--muted-foreground)] space-y-1">
                <li><strong>Separate workflow</strong> — not the same chain as leave.</li>
                <li>Employee submits from <strong>My Attendance</strong>; manager approves only for <strong>direct reports</strong>.</li>
                <li>HR, director, and admin can approve any regularization in the company.</li>
                <li>Requires permission <code>attendance.regularize</code> (granted to manager, HR, admin by default).</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Company admins: use Approval Chains below for leave routing, and RBAC for yes/no on who may act. Regularization always follows manager → HR rules above.
          </p>
          <p className="text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-3">
            <strong>Delegation (roadmap):</strong> time-bound “approve on my behalf while I am away” rules are not fully automated yet.
            Per-employee chains and the company matrix cover most SMB needs today.
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
