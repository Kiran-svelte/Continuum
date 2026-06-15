"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { Shield, BellRing, Clock, Save, Globe2, AlertTriangle, Building2, Loader2, Users, Layers, GitBranch, Network, AppWindow } from 'lucide-react';
import { fetchLiveCompanyState, updateSystemConfig } from '@/app/admin/(main)/company-settings/actions';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  OrgStructureStep,
  ApprovalMappingStep,
  ModuleEnablementStep,
  createDefaultOrgStructure,
  createDefaultApprovalChains,
  createDefaultModules,
  type OrgStructure,
  type ApprovalChain,
  type ModuleConfig,
} from '@/app/onboarding/onboarding-org-steps';

export default function CompanySettingsView() {
  const [activeTab, setActiveTab] = useState('general');
  const [isPending, startTransition] = useTransition();
  const [hierarchyPolicy, setHierarchyPolicy] = useState<{
    summary?: string[];
    roleLadder?: string[];
    creationTargetsByRole?: Record<string, string[]>;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region: 'IN',
    workStart: '09:00',
    workEnd: '18:00'
  });
  const [roleModel, setRoleModel] = useState<{
    currentModel: string;
    currentModelLabel: string;
    availableModels: { key: string; label: string; roles: string[]; isCurrent: boolean; isUpgrade: boolean }[];
  } | null>(null);
  const [isRoleModelSaving, setIsRoleModelSaving] = useState(false);

  // ─── Org config state (Org Structure, Approval Chains, Modules) ──────────
  const [orgStructure, setOrgStructure] = useState<OrgStructure>(createDefaultOrgStructure);
  const [approvalChains, setApprovalChains] = useState<ApprovalChain[]>(createDefaultApprovalChains);
  const [modules, setModules] = useState<ModuleConfig[]>(createDefaultModules);
  const [isOrgConfigLoading, setIsOrgConfigLoading] = useState(false);
  const [isOrgConfigSaving, setIsOrgConfigSaving] = useState(false);
  const [orgConfigError, setOrgConfigError] = useState('');
  const [orgConfigSuccess, setOrgConfigSuccess] = useState('');

  // Pull actual data from backend
  useEffect(() => {
     async function init() {
        const [res, policyRes] = await Promise.all([
          fetchLiveCompanyState(),
          fetch('/api/company/roles', { credentials: 'include' }),
        ]);
        if (res.success && res.data) {
          setFormData({
            name: res.data.name || '',
            region: res.data.country_code || 'IN',
            workStart: res.data.work_start || '09:00',
            workEnd: res.data.work_end || '18:00'
          });
        }
        if (policyRes.ok) {
          const policyData = await policyRes.json().catch(() => ({}));
          setHierarchyPolicy(policyData.hierarchyPolicy || null);
        }
     }
     init();
  }, []);

  // Load org config when the relevant tabs are first opened
  useEffect(() => {
    const orgTabs = new Set(['org-structure', 'approval-chains', 'modules']);
    if (!orgTabs.has(activeTab)) return;
    if (orgStructure.departments.length > 0 || approvalChains.length > 0) return; // already loaded
    loadOrgConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadOrgConfig() {
    setIsOrgConfigLoading(true);
    setOrgConfigError('');
    try {
      const res = await fetch('/api/admin/org-config', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        orgStructure: OrgStructure;
        approvalChains: ApprovalChain[];
        enabledModules: string[];
      };
      setOrgStructure(data.orgStructure);
      setApprovalChains(data.approvalChains);
      setModules((prev) => prev.map((m) => ({ ...m, isEnabled: data.enabledModules.includes(m.slug) })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load org config';
      setOrgConfigError(message);
      console.error('[CompanySettings] loadOrgConfig:', message);
    } finally {
      setIsOrgConfigLoading(false);
    }
  }

  async function saveOrgConfig(patch: {
    orgStructure?: OrgStructure;
    approvalChains?: ApprovalChain[];
    enabledModules?: string[];
  }) {
    setIsOrgConfigSaving(true);
    setOrgConfigError('');
    setOrgConfigSuccess('');
    try {
      const res = await fetch('/api/admin/org-config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
      setOrgConfigSuccess('Saved successfully.');
      setTimeout(() => setOrgConfigSuccess(''), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setOrgConfigError(message);
      console.error('[CompanySettings] saveOrgConfig:', message);
    } finally {
      setIsOrgConfigSaving(false);
    }
  }

  useEffect(() => {
    fetchRoleModel();
  }, []);

  async function fetchRoleModel() {
    try {
      const res = await fetch('/api/admin/role-model', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRoleModel(data);
      }
    } catch (err) {
      console.error('[Settings] Failed to fetch role model:', err);
    }
  }

  async function handleRoleModelUpgrade(modelKey: string) {
    setIsRoleModelSaving(true);
    try {
      const res = await fetch('/api/admin/role-model', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleModel: modelKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Role model updated: ' + data.message);
        fetchRoleModel();
      } else {
        alert('Error: ' + (data.error || 'Failed to update'));
      }
    } catch (err) {
      alert('Network error');
      console.error('[Settings] Role model update error:', err);
    } finally {
      setIsRoleModelSaving(false);
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSystemConfig(formData);
      alert(result.success ? "Success: " + result.message : "Error: " + result.error);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full p-4 md:p-8">
      <header className="mb-2">
        <h1 className="text-display flex items-center gap-3">
           System Settings 
           <span className="text-[10px] bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse">DB Live</span>
        </h1>
        <p className="text-body mt-2 max-w-2xl">Configure foundational policies, localized timezones, and enterprise access controls directly on the managed Postgres pipeline.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        
        {/* Vertical Tabs Navigation */}
        <div className="md:col-span-1 space-y-1 sticky top-24">
          <Button 
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'general' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <Building2 className="w-4 h-4" /> General Identity
          </Button>
          <Button 
            type="button"
            onClick={() => setActiveTab('time')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'time' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <Clock className="w-4 h-4" /> Time & Attendance
          </Button>
          <Button 
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'notifications' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <BellRing className="w-4 h-4" /> Notifications
          </Button>
          <Button 
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'roles' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <Users className="w-4 h-4" /> Role Model
          </Button>
          <Button 
            type="button"
            onClick={() => setActiveTab('capabilities')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'capabilities' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <Layers className="w-4 h-4" /> Capabilities
          </Button>
          {/* ─── New org-design tabs ─── */}
          <Button 
            type="button"
            id="settings-tab-org-structure"
            onClick={() => setActiveTab('org-structure')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'org-structure' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <Building2 className="w-4 h-4" /> Org Structure
          </Button>
          <Button 
            type="button"
            id="settings-tab-approval-chains"
            onClick={() => setActiveTab('approval-chains')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'approval-chains' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <GitBranch className="w-4 h-4" /> Approval Chains
          </Button>
          <Button 
            type="button"
            id="settings-tab-modules"
            onClick={() => setActiveTab('modules')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'modules' ? 'bg-[var(--accent)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            <AppWindow className="w-4 h-4" /> Active Modules
          </Button>
          <div className="my-2 border-t border-[var(--border)] mx-4"></div>
          <Button 
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
              activeTab === 'security' ? 'bg-[var(--danger)]/10 text-[var(--danger)] shadow-sm' : 'text-[var(--muted-foreground)] hover:bg-[var(--danger)]/5 hover:text-[var(--danger)]'
            }`}
          >
            <Shield className="w-4 h-4" /> Access & Security
          </Button>
        </div>

        {/* Dynamic Forms Panel */}
        <div className="md:col-span-3">
          <form className="card p-6 sm:p-8 shadow-lg hoverable-off" onSubmit={handleSave}>
            
            {/* TAB: GENERAL IDENTIIY */}
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">General Identity</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Foundational settings synced specifically to the prisma.company model.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Organizational Name</label>
                     <Input type="text" className="input h-11" value={formData.name} onChange={e => handleFieldChange("name", e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-[var(--primary)]" /> Core Operating Region
                  </label>
                  <Select className="input h-11 cursor-pointer" value={formData.region} onChange={e => handleFieldChange("region", e.target.value)}>
                    <option value="IN">India (Strict Compliant Node)</option>
                    <option value="US">United States (Default Node)</option>
                    <option value="UK">United Kingdom (GDPR Node)</option>
                  </Select>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Modifying the core region re-calculates default statutory compliance rules immediately.</p>
                </div>
              </div>
            )}

            {/* TAB: TIME & ATTENDANCE */}
            {activeTab === 'time' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">Time & Attendance Constraints</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Configure physical presence tracking limits and daily hours directly updating Prisma schemas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--primary)]" /> Postgres Work Start
                     </label>
                     <Input type="time" className="input h-11" value={formData.workStart} onChange={e => handleFieldChange("workStart", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--primary)]" /> Postgres Work End
                     </label>
                     <Input type="time" className="input h-11" value={formData.workEnd} onChange={e => handleFieldChange("workEnd", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--danger)]/20 pb-4">
                  <h2 className="text-h3 text-[var(--danger)] flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Modifying these settings alters global access patterns for all connected employees.</p>
                </div>

                {hierarchyPolicy && (
                  <div className="card border border-[var(--border)] bg-[var(--muted)]/20 p-5">
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Active hierarchy policy</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {hierarchyPolicy.summary?.join(' · ') || 'Company role ladder is active.'}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/80 p-3">
                        <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Role ladder</div>
                        <div className="mt-1 font-medium">{hierarchyPolicy.roleLadder?.join(' → ') || 'admin → hr → manager → employee'}</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/80 p-3 sm:col-span-2">
                        <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Creation path</div>
                        <div className="mt-1 text-sm text-[var(--foreground)]">
                          Admin: {hierarchyPolicy.creationTargetsByRole?.admin?.join(', ') || 'n/a'}<br />
                          HR: {hierarchyPolicy.creationTargetsByRole?.hr?.join(', ') || 'n/a'}<br />
                          Manager: {hierarchyPolicy.creationTargetsByRole?.manager?.join(', ') || 'n/a'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card border-[var(--danger)]/30 bg-[var(--danger)]/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hoverable-off p-5">
                  <div>
                    <h4 className="font-bold text-[var(--foreground)] text-sm">Force Global MFA (Multi-Factor)</h4>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">Require all roles (including employees) to register authenticator apps.</p>
                  </div>
                  <Button type="button" className="btn btn-sm shrink-0 border border-[var(--border)] bg-[var(--background)]">Enable Globally</Button>
                </div>
              </div>
            )}

            {/* TAB: ROLE MODEL */}
            {activeTab === 'roles' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">Organization Role Model</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Upgrade your org structure to unlock new roles. Downgrades are blocked if active employees use those roles.</p>
                </div>

                {roleModel ? (
                  <div className="space-y-4">
                    <div className="card border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Current Model</p>
                      <p className="text-lg font-bold text-[var(--foreground)] mt-1">{roleModel.currentModelLabel}</p>
                    </div>
                    <div className="grid gap-4">
                      {roleModel.availableModels.map((model) => (
                        <div key={model.key} className={`card p-4 border ${model.isCurrent ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)]'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">{model.label}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">Roles: {model.roles.join(', ')}</p>
                          </div>
                          {model.isCurrent ? (
                            <span className="text-xs font-bold uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full">Current</span>
                          ) : (
                            <Button
                              type="button"
                              disabled={isRoleModelSaving}
                              onClick={() => handleRoleModelUpgrade(model.key)}
                              className={`btn btn-sm ${model.isUpgrade ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              {isRoleModelSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : model.isUpgrade ? 'Upgrade' : 'Switch'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading role model...
                  </div>
                )}
              </div>
            )}

            {/* TAB: CAPABILITIES */}
            {activeTab === 'capabilities' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">Capability Ownership</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Define which roles own which platform capabilities. Changes take effect immediately.</p>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Capability ownership is configured via the <code className="text-[var(--primary)]">/api/admin/capability-owners</code> API.
                  A full drag-and-drop UI is planned for a future release.
                </p>
                <div className="card border border-[var(--border)] bg-[var(--muted)]/20 p-5">
                  <h3 className="font-semibold text-[var(--foreground)] mb-3">Current Capabilities</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span>Organization Governance</span>
                      <span className="font-medium text-[var(--primary)]">Admin</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span>People Operations</span>
                      <span className="font-medium text-[var(--primary)]">HR</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span>Approval Operations</span>
                      <span className="font-medium text-[var(--primary)]">Manager</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span>Employee Self-Service</span>
                      <span className="font-medium text-[var(--primary)]">Employee</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Security & Audit</span>
                      <span className="font-medium text-[var(--primary)]">Admin</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ORG STRUCTURE */}
            {activeTab === 'org-structure' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h3">Org Structure</h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Manage departments, office locations, cost centers, and your org hierarchy model.
                    </p>
                  </div>
                  {isOrgConfigLoading && <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)] shrink-0 mt-1" />}
                </div>
                {orgConfigError && <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/8 rounded-lg px-3 py-2">{orgConfigError}</p>}
                {orgConfigSuccess && <p className="text-sm text-[var(--success)] bg-[var(--success)]/8 rounded-lg px-3 py-2">{orgConfigSuccess}</p>}
                <OrgStructureStep value={orgStructure} onChange={setOrgStructure} />
                <div className="flex justify-end pt-2">
                  <Button type="button" id="save-org-structure" disabled={isOrgConfigSaving} onClick={() => saveOrgConfig({ orgStructure })} className="btn btn-primary min-w-[140px]">
                    {isOrgConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Org Structure</>}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: APPROVAL CHAINS */}
            {activeTab === 'approval-chains' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">Approval Chains</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Configure who approves leave, expenses, travel, and payroll advances at each level.
                    Level 2 is the escalation approver used when Level 1 misses the SLA.
                  </p>
                </div>
                {orgConfigError && <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/8 rounded-lg px-3 py-2">{orgConfigError}</p>}
                {orgConfigSuccess && <p className="text-sm text-[var(--success)] bg-[var(--success)]/8 rounded-lg px-3 py-2">{orgConfigSuccess}</p>}
                {isOrgConfigLoading
                  ? <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading approval chains...</div>
                  : <ApprovalMappingStep value={approvalChains} onChange={setApprovalChains} availableRoleSlugs={[]} />
                }
                <div className="flex justify-end pt-2">
                  <Button type="button" id="save-approval-chains" disabled={isOrgConfigSaving} onClick={() => saveOrgConfig({ approvalChains })} className="btn btn-primary min-w-[140px]">
                    {isOrgConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Approval Chains</>}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: ACTIVE MODULES */}
            {activeTab === 'modules' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="text-h3">Active Modules</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Enable or disable HR modules. Mandatory modules (Leave, Attendance) cannot be disabled.
                  </p>
                </div>
                {orgConfigError && <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/8 rounded-lg px-3 py-2">{orgConfigError}</p>}
                {orgConfigSuccess && <p className="text-sm text-[var(--success)] bg-[var(--success)]/8 rounded-lg px-3 py-2">{orgConfigSuccess}</p>}
                {isOrgConfigLoading
                  ? <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading modules...</div>
                  : <ModuleEnablementStep value={modules} onChange={setModules} />
                }
                <div className="flex justify-end pt-2">
                  <Button type="button" id="save-modules" disabled={isOrgConfigSaving} onClick={() => saveOrgConfig({ enabledModules: modules.filter((m) => m.isEnabled).map((m) => m.slug) })} className="btn btn-primary min-w-[140px]">
                    {isOrgConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Modules</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Form Footer — only shown for tabs that use the shared form submit */}
            {!['org-structure', 'approval-chains', 'modules'].includes(activeTab) && (
            <div className="mt-10 pt-6 border-t border-[var(--border)] flex justify-end gap-3 sticky bottom-0 bg-[var(--card)] z-10">
              <Button type="button" className="btn btn-secondary">Discard Changes</Button>
              <Button type="submit" disabled={isPending} className="btn btn-primary min-w-[140px] shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden">
                <span className={`flex items-center gap-2 ${isPending ? 'opacity-0' : 'opacity-100'}`}><Save className="w-4 h-4" /> Commit Configs</span>
                {isPending && <div className="absolute inset-0 flex items-center justify-center bg-[var(--primary)]"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>}
              </Button>
            </div>
            )}
            
          </form>
        </div>

      </div>
    </div>
  );
}

