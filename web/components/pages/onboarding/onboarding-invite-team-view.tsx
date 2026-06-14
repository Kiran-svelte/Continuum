"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, MailPlus, Trash2, ShieldCheck, ArrowRight, Loader2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { getDefaultPortalForRole, getDefaultPortalForRoles } from '@/lib/auth-routing';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  buildOnboardingCompletePayload,
  coerceInviteRole,
  clearOnboardingDraft,
  getAllowedInviteRoles,
  getDefaultInviteRole,
  InviteRoleSlug,
  RoleModel,
  readOnboardingDraft,
  writeOnboardingDraft,
} from '@/lib/onboarding/client-payload';

type PeopleOpsOwnerRole = 'admin' | 'hr' | 'manager' | 'employee';

const OWNER_OPTIONS_BY_ROLE_MODEL: Record<RoleModel, PeopleOpsOwnerRole[]> = {
  hr_employee: ['admin', 'hr', 'employee'],
  hr_manager_employee: ['admin', 'hr', 'manager', 'employee'],
  full_hierarchy: ['admin', 'hr', 'manager', 'employee'],
};

const INVITE_ROLE_LABELS: Record<InviteRoleSlug, string> = {
  hr: 'HR Admin',
  manager: 'Manager',
  employee: 'Employee',
};

const REQUEST_TIMEOUT_MS = 20_000;
const FINALIZE_REQUEST_TIMEOUT_MS = 120_000;

export default function OnboardingInviteTeamView() {
  const router = useRouter();
  const [roleModel, setRoleModel] = useState<RoleModel>('hr_manager_employee');
  const [peopleOpsOwnerRole, setPeopleOpsOwnerRole] = useState<PeopleOpsOwnerRole>('hr');
  const allowedInviteRoles = getAllowedInviteRoles(roleModel);
  const defaultInviteRole = getDefaultInviteRole(roleModel);
  const allowedOwnerRoles = OWNER_OPTIONS_BY_ROLE_MODEL[roleModel];

  const [invites, setInvites] = useState<Array<{ email: string; role: InviteRoleSlug }>>([
    { email: '', role: defaultInviteRole },
  ]);
  const [complete, setComplete] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fallbackDestination = getDefaultPortalForRole('employee');

  const resolvePostOnboardingDestination = React.useCallback(async (): Promise<string> => {
    try {
      const meResponse = await fetchWithTimeout('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      }, REQUEST_TIMEOUT_MS);

      if (!meResponse.ok) {
        return fallbackDestination;
      }

      const me = (await meResponse.json()) as {
        primary_role?: string | null;
        roles?: string[] | null;
        secondary_roles?: string[] | null;
      };

      const secondaryRoles = Array.isArray(me.secondary_roles)
        ? me.secondary_roles
        : Array.isArray(me.roles)
          ? me.roles
          : null;

      return getDefaultPortalForRoles(me.primary_role, secondaryRoles);
    } catch {
      return fallbackDestination;
    }
  }, [fallbackDestination]);

  React.useEffect(() => {
    const draft = readOnboardingDraft();
    setRoleModel(draft.profile.roleModel);

    const initialOptions = OWNER_OPTIONS_BY_ROLE_MODEL[draft.profile.roleModel];
    const preferred = draft.capabilityOwners?.peopleOperationsOwner as PeopleOpsOwnerRole | undefined;
    const fallbackOwner = (initialOptions.includes('hr') ? 'hr' : initialOptions[0]) as PeopleOpsOwnerRole;
    const nextOwner: PeopleOpsOwnerRole = preferred && initialOptions.includes(preferred) ? preferred : fallbackOwner;
    setPeopleOpsOwnerRole(nextOwner);
  }, []);

  React.useEffect(() => {
    setInvites((currentInvites) => {
      const nextInvites = currentInvites.map((invite) => ({
        ...invite,
        role: coerceInviteRole(roleModel, invite.role),
      }));

      return nextInvites;
    });
  }, [roleModel]);

  React.useEffect(() => {
    setPeopleOpsOwnerRole((current) => {
      if (allowedOwnerRoles.includes(current)) {
        return current;
      }
      return allowedOwnerRoles.includes('hr') ? 'hr' : allowedOwnerRoles[0];
    });
  }, [allowedOwnerRoles]);

  const addInvite = () => {
    if (invites.length < 5) {
      setInvites([...invites, { email: '', role: defaultInviteRole }]);
    }
  };

  const updateInvite = (index: number, field: 'email' | 'role', value: string) => {
    const newInvites = [...invites];
    if (field === 'role') {
      newInvites[index] = { ...newInvites[index], role: coerceInviteRole(roleModel, value) };
    } else {
      newInvites[index] = { ...newInvites[index], email: value };
    }
    setInvites(newInvites);
  };

  const removeInvite = (index: number) => {
    const newInvites = [...invites];
    newInvites.splice(index, 1);
    setInvites(newInvites);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const draft = readOnboardingDraft();
      if (!draft.company.name.trim()) {
        setError('Company details are missing. Please complete the organization step first.');
        return;
      }

      writeOnboardingDraft({
        notifications: {
          email: true,
          managerAlerts: true,
          dailyDigest: true,
          slaAlerts: true,
        },
        capabilityOwners: {
          peopleOperationsOwner: peopleOpsOwnerRole,
        },
      });

      const payload = buildOnboardingCompletePayload(readOnboardingDraft(), invites);
      console.info('[ONBOARDING INVITE] Submitting full onboarding payload', {
        inviteCount: payload.invite_preview.length,
        roleModel: payload.role_model,
      });

      const completeResp = await fetchWithTimeout('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      }, FINALIZE_REQUEST_TIMEOUT_MS);

      if (!completeResp.ok) {
        const errorPayload = await completeResp.json().catch(() => ({}));
        const message = typeof errorPayload?.error === 'string'
          ? errorPayload.error
          : 'Unable to finalize onboarding. Please try again.';
        setError(message);
        return;
      }

      clearOnboardingDraft();
      setComplete(true);
      setRedirectDestination(fallbackDestination);
      const destination = await resolvePostOnboardingDestination();
      setRedirectDestination(destination);
      router.replace(destination);
    } catch (submitError) {
      console.error('[ONBOARDING INVITE] Final submission failed', submitError);
      setError(mapFetchErrorMessage(submitError, 'Network error while finalizing onboarding. Please retry.'));
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
        <div className="ambient-glow" />
        <div className="w-24 h-24 rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 flex items-center justify-center mb-8 shadow-sm">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-display mb-4">Workspace Deployed</h1>
        <p className="text-xl text-[var(--muted-foreground)] max-w-md mx-auto mb-4">Your tenant has been compiled, and the initial invitation payloads have been securely dispatched.</p>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto mb-10">Redirecting you to your command center...</p>
        <Link href={redirectDestination || fallbackDestination} className="btn btn-primary btn-lg shadow-lg">
          Launch Command Center
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col p-6 relative overflow-hidden">
      <div className="ambient-glow" />

      <header className="w-full max-w-4xl mx-auto py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 font-semibold text-lg cursor-pointer">
          <span className="text-[var(--foreground)]">Continuum Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold px-3 py-1 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-full">Step 2 Complete</div>
          <div className="w-16 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="w-[100%] h-full bg-[var(--primary)]"></div>
          </div>
          <span className="text-xs font-bold text-[var(--primary)]">Final Step</span>
        </div>
      </header>

      <div className="flex-1 w-full max-w-4xl mx-auto z-10 mt-8 grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4 border border-[var(--border)] shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-h1">Seed the Directory</h1>
          <p className="text-body max-w-sm">Dispatch the first wave of encrypted invitations. Choose who owns People Operations if HR is not available.</p>

          <div className="card p-5 border-[var(--border)] bg-[var(--background)] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-[var(--success)]" /> Safe Distribution
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Delegates will receive a single-use token valid for 48 hours to bypass the main authentication gate.</p>
          </div>

          <Button className="btn btn-secondary w-full sm:w-auto mt-4 text-xs h-10 border-dashed" onClick={handleSubmit}>
            Skip this step for now <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="md:col-span-3 card p-6 md:p-8 hoverable-off shadow-lg">
          <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-4">
            <h2 className="text-h3">Core Team Invites</h2>
            <Button type="button" className="btn btn-sm btn-ghost hover:bg-[var(--accent)]" onClick={addInvite} disabled={invites.length >= 5}>
              <MailPlus className="w-4 h-4" /> Add Row
            </Button>
          </div>

          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              People Operations Owner Role
            </label>
            <Select
              className="input h-11"
              value={peopleOpsOwnerRole}
              onChange={(e) => setPeopleOpsOwnerRole(e.target.value as PeopleOpsOwnerRole)}
              aria-label="People Operations owner role"
            >
              {allowedOwnerRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {invites.map((invite, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    className="input h-12 w-full pl-4"
                    value={invite.email || ''}
                    onChange={(e) => updateInvite(index, 'email', e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select
                    className="input h-12 w-full sm:w-auto cursor-pointer"
                    value={invite.role}
                    onChange={(e) => updateInvite(index, 'role', e.target.value)}
                    aria-label={`Role for invite ${index + 1}`}
                  >
                    {allowedInviteRoles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {INVITE_ROLE_LABELS[roleOption]}
                      </option>
                    ))}
                  </Select>
                  {invites.length > 1 && (
                    <Button type="button" onClick={() => removeInvite(index)} title="Remove invite row" aria-label="Remove invite row" className="btn btn-secondary px-3 shrink-0 text-[var(--danger)] hover:bg-[var(--destructive)]/10 hover:border-[var(--destructive)]">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-6 mt-8">
              <Button type="submit" disabled={loading} className="btn btn-primary w-full h-14 text-base font-semibold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Mule Dispatch Commands <ArrowRight className="w-5 h-5 ml-1" /></>
                )}
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
                <LinkIcon className="w-3 h-3" /> Links will be signed via AWS SES
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
