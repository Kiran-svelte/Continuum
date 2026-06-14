'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Layers, Plus, Pencil, Trash2, ArrowRight, Users, ShieldCheck,
  AlertCircle, Search, ChevronsUpDown, Check, Loader2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/use-debounce';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { TabButton } from '@/components/tab-button';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
interface EmployeeSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ApprovalHierarchy {
  id: string;
  emp_id: string;
  level1_approver: string | null;
  level2_approver: string | null;
  level3_approver: string | null;
  level4_approver: string | null;
  hr_partner: string | null;
  employee: EmployeeSummary;
  level1: EmployeeSummary | null;
  level2: EmployeeSummary | null;
  level3: EmployeeSummary | null;
  level4: EmployeeSummary | null;
  hr: EmployeeSummary | null;
}

interface JobLevel {
  id: string;
  name: string;
  rank: number;
  description: string | null;
}

interface FormData<T> {
  data: T;
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  id: string | null;
}

const EMPTY_APPROVAL_FORM = {
  emp_id: '',
  level1_approver: '',
  level2_approver: '',
  level3_approver: '',
  level4_approver: '',
  hr_partner: '',
};

const EMPTY_JOB_LEVEL_FORM = {
  name: '',
  rank: '',
  description: '',
};

const APPROVAL_LEVELS = [1, 2, 3, 4] as const;
type ApprovalLevelField = 'level1_approver' | 'level2_approver' | 'level3_approver' | 'level4_approver';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  onAction: () => void;
  actionLabel: string;
}

interface ComboboxProps {
  options: EmployeeSummary[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

type ModalEditableItem = ApprovalHierarchy | JobLevel;

const getApproverField = (level: (typeof APPROVAL_LEVELS)[number]): ApprovalLevelField => {
  return `level${level}_approver` as ApprovalLevelField;
};

// --- Helper Components ---

const EmptyState = ({ icon: Icon, title, message, onAction, actionLabel }: EmptyStateProps) => (
  <GlassPanel className="text-center py-12">
    <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
    <h3 className="text-lg font-semibold text-foreground/90">{title}</h3>
    <p className="text-muted-foreground mb-4 text-sm">{message}</p>
    <Button onClick={onAction} variant="primary" size="sm">
      <Plus className="w-4 h-4 mr-1" />
      {actionLabel}
    </Button>
  </GlassPanel>
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <GlassPanel className="flex items-center gap-3 text-red-400 py-8 justify-center">
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </GlassPanel>
);

const LoadingSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full bg-[var(--accent)]" />
    ))}
  </div>
);

const Combobox = ({ options, value, onChange, placeholder }: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredOptions = useMemo(() =>
    options.filter((option) =>
      `${option.first_name} ${option.last_name} ${option.email}`
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase())
    ), [options, debouncedSearchTerm]);

  const selectedOption = options.find((option) => option.id === value);

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left form-input flex items-center justify-between"
      >
        <span className="truncate">
          {selectedOption ? `${selectedOption.first_name} ${selectedOption.last_name}` : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-[var(--accent)] backdrop-blur-lg border border-[var(--border)] rounded-lg shadow-xl"
          >
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full form-input pl-9"
                />
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="p-2 text-sm rounded-md hover:bg-emerald-500/10 flex items-center justify-between cursor-pointer"
                >
                  <span>{option.first_name} {option.last_name} <span className="text-xs text-muted-foreground">{option.email}</span></span>
                  {value === option.id && <Check className="w-4 h-4 text-emerald-400" />}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- Main Page Component ---
export default function ApprovalConfigView() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'levels'>('approvals');
  const [hierarchies, setHierarchies] = useState<ApprovalHierarchy[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [hierarchyPolicy, setHierarchyPolicy] = useState<{
    summary?: string[];
    roleLadder?: string[];
    creationTargetsByRole?: Record<string, string[]>;
  } | null>(null);
  const [loading, setLoading] = useState({ h: true, j: true, e: true });
  const [error, setError] = useState({ h: '', j: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [approvalModal, setApprovalModal] = useState<FormData<typeof EMPTY_APPROVAL_FORM>>({
    data: EMPTY_APPROVAL_FORM, isOpen: false, isEditing: false, isSaving: false, id: null
  });
  const [levelModal, setLevelModal] = useState<FormData<typeof EMPTY_JOB_LEVEL_FORM>>({
    data: EMPTY_JOB_LEVEL_FORM, isOpen: false, isEditing: false, isSaving: false, id: null
  });

  const fetchData = useCallback(async (endpoint: string, key: 'h' | 'j' | 'e') => {
    try {
      setLoading(l => ({ ...l, [key]: true }));
      const res = await fetch(`/api/${endpoint}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load data from ${endpoint}`);
      const data: {
        hierarchies?: ApprovalHierarchy[];
        jobLevels?: JobLevel[];
        employees?: EmployeeSummary[];
      } = await res.json();
      
      if (key === 'h') setHierarchies(data.hierarchies ?? []);
      if (key === 'j') setJobLevels(data.jobLevels ?? []);
      if (key === 'e') {
        setEmployees(
          data.employees?.map((employeeSummary) => ({
            id: employeeSummary.id,
            first_name: employeeSummary.first_name,
            last_name: employeeSummary.last_name,
            email: employeeSummary.email,
          })) ?? []
        );
      }
      
      setError(e => ({ ...e, [key]: '' }));
    } catch (err: unknown) {
      setError(e => ({
        ...e,
        [key]: err instanceof Error ? err.message : 'Failed to load data',
      }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  }, []);

  useEffect(() => {
    fetchData('approval-hierarchy', 'h');
    fetchData('job-levels', 'j');
    fetchData('employees?limit=500', 'e');
    fetch('/api/company/roles', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHierarchyPolicy(data?.hierarchyPolicy || null))
      .catch(() => {});
  }, [fetchData]);

  const handleSave = async (type: 'approval' | 'level') => {
    const isApproval = type === 'approval';
    const modalState = isApproval ? approvalModal : levelModal;
    const endpoint = isApproval ? 'approval-hierarchy' : 'job-levels';
    const refreshData = isApproval ? () => fetchData('approval-hierarchy', 'h') : () => fetchData('job-levels', 'j');

    if (isApproval) {
      setApprovalModal(m => ({ ...m, isSaving: true }));
    } else {
      setLevelModal(m => ({ ...m, isSaving: true }));
    }

    try {
      let payload: Record<string, unknown>;

      if (isApproval) {
        const rest = Object.fromEntries(
          Object.entries(modalState.data as Record<string, unknown>).filter(([key]) => key !== 'emp_id')
        );
        payload = modalState.isEditing ? { id: modalState.id, ...rest } : modalState.data;
      } else {
        const { name, rank, description } = levelModal.data;
        if (!name.trim()) throw new Error('Name is required');
        const rankNum = parseInt(rank, 10);
        if (isNaN(rankNum)) throw new Error('Rank must be a number');
        payload = { name: name.trim(), rank: rankNum, description: description.trim() || null };
        if (levelModal.isEditing) payload.id = levelModal.id;
      }
      
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });

      const res = await fetch(`/api/${endpoint}`, {
        method: modalState.isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      if (isApproval) {
        setApprovalModal(m => ({ ...m, isOpen: false }));
      } else {
        setLevelModal(m => ({ ...m, isOpen: false }));
      }

      toast.success(modalState.isEditing ? 'Updated successfully' : 'Created successfully');
      refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      if (isApproval) {
        setApprovalModal(m => ({ ...m, isSaving: false }));
      } else {
        setLevelModal(m => ({ ...m, isSaving: false }));
      }
    }
  };

  const handleDelete = async (type: 'approval' | 'level', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    setDeletingId(id);
    const endpoint = type === 'approval' ? 'approval-hierarchy' : 'job-levels';
    const refreshData = type === 'approval' ? () => fetchData('approval-hierarchy', 'h') : () => fetchData('job-levels', 'j');
    
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted successfully');
      refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (type: 'approval' | 'level', isEditing = false, item: ModalEditableItem | null = null) => {
    if (type === 'approval') {
      const approvalItem = item as ApprovalHierarchy | null;
      setApprovalModal({
        isOpen: true,
        isEditing,
        isSaving: false,
        id: isEditing && approvalItem ? approvalItem.id : null,
        data: isEditing ? {
          emp_id: approvalItem?.emp_id ?? '',
          level1_approver: approvalItem?.level1_approver ?? '',
          level2_approver: approvalItem?.level2_approver ?? '',
          level3_approver: approvalItem?.level3_approver ?? '',
          level4_approver: approvalItem?.level4_approver ?? '',
          hr_partner: approvalItem?.hr_partner ?? '',
        } : EMPTY_APPROVAL_FORM,
      });
    } else {
      const levelItem = item as JobLevel | null;
      setLevelModal({
        isOpen: true,
        isEditing,
        isSaving: false,
        id: isEditing && levelItem ? levelItem.id : null,
        data: isEditing ? {
          name: levelItem?.name ?? '',
          rank: String(levelItem?.rank ?? ''),
          description: levelItem?.description ?? '',
        } : EMPTY_JOB_LEVEL_FORM,
      });
    }
  };

  const empName = (e: EmployeeSummary | null) => e ? `${e.first_name} ${e.last_name}` : <span className="text-muted-foreground">-</span>;

  return (
    <StaggerContainer>
      {hierarchyPolicy && (
        <FadeIn>
          <GlassPanel className="mb-4 border border-[var(--border)] bg-[var(--accent)]/30 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Company hierarchy policy</h2>
                <p className="text-sm text-muted-foreground">
                  {hierarchyPolicy.summary?.join(' · ') || 'Company-specific hierarchy is active.'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {hierarchyPolicy.roleLadder?.join(' → ') || 'admin → hr → manager → employee'}
              </div>
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      <FadeIn>
        <PageHeader
          title="Approval Configuration"
          description="Manage approval chains and job level grades for your organization."
        />
      </FadeIn>

      <FadeIn>
        <div className="flex border-b border-[var(--border)] mb-6">
          <TabButton
            active={activeTab === 'approvals'}
            onClick={() => setActiveTab('approvals')}
          >
            <GitBranch className="w-4 h-4" />
            Approval Chains
            <span className="ml-1 text-xs bg-[var(--accent)] px-2 py-0.5 rounded-full">{hierarchies.length}</span>
          </TabButton>
          <TabButton
            active={activeTab === 'levels'}
            onClick={() => setActiveTab('levels')}
          >
            <Layers className="w-4 h-4" />
            Job Levels
            <span className="ml-1 text-xs bg-[var(--accent)] px-2 py-0.5 rounded-full">{jobLevels.length}</span>
          </TabButton>
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Define who approves requests for each employee.
                </p>
                <Button size="sm" variant="primary" onClick={() => openModal('approval')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Chain
                </Button>
              </div>
              {loading.h ? <LoadingSkeleton /> : error.h ? <ErrorDisplay message={error.h} /> : hierarchies.length === 0 ? (
                <EmptyState icon={GitBranch} title="No Approval Chains" message="Create the first approval chain for your organization." onAction={() => openModal('approval')} actionLabel="Create First Chain" />
              ) : (
                <GlassPanel className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)]">
                      <tr>
                        {['Employee', 'L1 Approver', 'L2 Approver', 'L3 Approver', 'L4 Approver', 'HR Partner', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hierarchies.map((h) => (
                        <tr key={h.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-400" />
                              <div>
                                <p className="font-medium text-foreground">{empName(h.employee)}</p>
                                <p className="text-xs text-muted-foreground">{h.employee.email}</p>
                              </div>
                            </div>
                          </td>
                          {[h.level1, h.level2, h.level3, h.level4].map((approver, i) => (
                            <td key={i} className="px-4 py-3 text-foreground/90">
                              <div className="flex items-center gap-1.5">
                                {approver && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                                {empName(approver)}
                              </div>
                            </td>
                          ))}
                          <td className="px-4 py-3 text-foreground/90">
                            <div className="flex items-center gap-1.5">
                              {h.hr && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                              {empName(h.hr)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openModal('approval', true, h)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete('approval', h.id)} disabled={deletingId === h.id}>
                                {deletingId === h.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </GlassPanel>
              )}
            </div>
          )}

          {activeTab === 'levels' && (
             <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Define job level grades used across your organization.
                </p>
                <Button size="sm" variant="primary" onClick={() => openModal('level')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Level
                </Button>
              </div>
              {loading.j ? <LoadingSkeleton /> : error.j ? <ErrorDisplay message={error.j} /> : jobLevels.length === 0 ? (
                <EmptyState icon={Layers} title="No Job Levels" message="Define the first job level for your organization." onAction={() => openModal('level')} actionLabel="Create First Level" />
              ) : (
                <GlassPanel className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)]">
                      <tr>
                        {['Rank', 'Name', 'Description', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobLevels.sort((a, b) => a.rank - b.rank).map((jl) => (
                        <tr key={jl.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-emerald-900/50 text-emerald-300 rounded px-2 py-1">{jl.rank}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{jl.name}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{jl.description || <span className="text-muted-foreground">-</span>}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openModal('level', true, jl)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete('level', jl.id)} disabled={deletingId === jl.id}>
                                {deletingId === jl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </GlassPanel>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <Modal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal(m => ({ ...m, isOpen: false }))}
        title={approvalModal.isEditing ? 'Edit Approval Chain' : 'Add Approval Chain'}
        size="lg"
      >
        <div className="space-y-4">
          {approvalModal.isEditing ? (
            <div className="form-display-field">
              <label>Employee</label>
              <p>{empName(hierarchies.find(h => h.id === approvalModal.id)?.employee ?? null)}</p>
            </div>
          ) : (
            <div>
              <label className="form-label">Employee <span className="text-red-500">*</span></label>
              <Combobox
                options={employees.filter(e => !hierarchies.some(h => h.emp_id === e.id))}
                value={approvalModal.data.emp_id}
                onChange={(val: string) => setApprovalModal(m => ({ ...m, data: { ...m.data, emp_id: val } }))}
                placeholder="Select employee..."
              />
            </div>
          )}
          
          {APPROVAL_LEVELS.map(level => {
            const approverField = getApproverField(level);
            return (
            <div key={level}>
              <label className="form-label">{`Level ${level} Approver`}</label>
              <Combobox
                options={employees}
                value={approvalModal.data[approverField]}
                onChange={(val: string) => setApprovalModal(m => ({ ...m, data: { ...m.data, [approverField]: val } }))}
                placeholder="None"
              />
            </div>
            );
          })}

          <div>
            <label className="form-label">HR Partner</label>
            <Combobox
              options={employees}
              value={approvalModal.data.hr_partner}
              onChange={(val: string) => setApprovalModal(m => ({ ...m, data: { ...m.data, hr_partner: val } }))}
              placeholder="None"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setApprovalModal(m => ({ ...m, isOpen: false }))}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSave('approval')} loading={approvalModal.isSaving} disabled={!approvalModal.isEditing && !approvalModal.data.emp_id}>
            {approvalModal.isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={levelModal.isOpen}
        onClose={() => setLevelModal(m => ({ ...m, isOpen: false }))}
        title={levelModal.isEditing ? 'Edit Job Level' : 'Add Job Level'}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Name <span className="text-red-500">*</span></label>
            <Input
              type="text"
              value={levelModal.data.name}
              onChange={(e) => setLevelModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))}
              placeholder="e.g. Senior Engineer"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Rank <span className="text-red-500">*</span></label>
            <Input
              type="number"
              value={levelModal.data.rank}
              onChange={(e) => setLevelModal(m => ({ ...m, data: { ...m.data, rank: e.target.value } }))}
              placeholder="e.g. 5"
              className="form-input"
            />
            <p className="text-xs text-muted-foreground mt-1">Lower rank = higher seniority.</p>
          </div>
          <div>
            <label className="form-label">Description</label>
            <Textarea
              value={levelModal.data.description}
              onChange={(e) => setLevelModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))}
              rows={3}
              placeholder="Optional description..."
              className="form-input"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setLevelModal(m => ({ ...m, isOpen: false }))}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSave('level')} loading={levelModal.isSaving} disabled={!levelModal.data.name.trim() || !levelModal.data.rank}>
            {levelModal.isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
    </StaggerContainer>
  );
}


