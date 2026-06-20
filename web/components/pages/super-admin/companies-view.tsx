'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Users, CheckCircle, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Company {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  size: string | null;
  onboardingStatus: string;
  onboardingStep: number;
  joinCode: string | null;
  createdAt: string;
  stats: {
    totalEmployees: number;
    totalLeaveRequests: number;
    totalAttendances: number;
  };
  owner: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    primary_role: string;
    status: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CompaniesView() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status: statusFilter,
      });

      const response = await fetch(`/api/super-admin/companies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies');
      }

      setCompanies(data.companies);
      setPagination(data.pagination);
      setSelectedCompanyIds(new Set());
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, search, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompanies();
  };

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = companies.map((company) => company.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCompanyIds.has(id));

    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const deleteCompany = async (company: Company) => {
    const confirmed = window.confirm(`Delete company "${company.name}"? This permanently removes the company and all associated users and data.`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/companies/${company.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete company');
      }

      await fetchCompanies();
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete company');
    }
  };

  const bulkDeleteCompanies = async () => {
    if (selectedCompanyIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedCompanyIds.size} selected compan${selectedCompanyIds.size > 1 ? 'ies' : 'y'}? This permanently removes ${selectedCompanyIds.size > 1 ? 'them' : 'it'} and all associated users and data.`
    );
    if (!confirmed) {
      return;
    }

    setBulkDeleting(true);
    setError(null);

    try {
      const targetIds = Array.from(selectedCompanyIds);
      const responses = await Promise.all(
        targetIds.map(async (id) => {
          const response = await fetch(`/api/super-admin/companies/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await response.json().catch(() => ({}));
          return { response, data, id };
        })
      );

      const failed = responses.filter((result) => !result.response.ok);
      if (failed.length > 0) {
        throw new Error(`Deleted ${targetIds.length - failed.length}/${targetIds.length}. ${failed[0].data?.error || 'Some deletions failed.'}`);
      }

      await fetchCompanies();
    } catch (bulkDeleteError: unknown) {
      setError(bulkDeleteError instanceof Error ? bulkDeleteError.message : 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-status-warning/15 text-status-warning border border-status-warning/20',
      in_progress: 'bg-status-info/15 text-status-info border border-status-info/20',
      completed: 'bg-status-success/15 text-status-success border border-status-success/20',
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      in_progress: <AlertCircle className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {icons[status as keyof typeof icons]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Companies</h1>
            <p className="text-muted-foreground mt-1">
              Manage all companies and their onboarding status
            </p>
          </div>
          <Button
            onClick={() => router.push('/super-admin/companies/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Company
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-semibold text-foreground">{pagination.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-status-warning/15 rounded-lg">
                <Clock className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-foreground">
                  {companies.filter(c => c.onboardingStatus === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-status-info/15 rounded-lg">
                <AlertCircle className="w-5 h-5 text-status-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-semibold text-foreground">
                  {companies.filter(c => c.onboardingStatus === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-status-success/15 rounded-lg">
                <CheckCircle className="w-5 h-5 text-status-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-semibold text-foreground">
                  {companies.filter(c => c.onboardingStatus === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
            <Button
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Search
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedCompanyIds.size} selected
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCompanyIds.size === 0 || bulkDeleting}
              className="inline-flex items-center gap-2"
              onClick={bulkDeleteCompanies}
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Companies List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try adjusting your search or filters' : 'Create your first company to get started'}
            </p>
            {!search && (
              <Button
                onClick={() => router.push('/super-admin/companies/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Create First Company
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">
                      <input
                        type="checkbox"
                        aria-label="Select all visible companies"
                        checked={companies.length > 0 && companies.every((company) => selectedCompanyIds.has(company.id))}
                        onChange={toggleSelectAllVisible}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Company</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Owner</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Stats</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Created</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${company.name}`}
                          checked={selectedCompanyIds.has(company.id)}
                          onChange={() => toggleCompanySelection(company.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{company.name}</p>
                          {company.legalName && (
                            <p className="text-sm text-muted-foreground">{company.legalName}</p>
                          )}
                          {company.joinCode && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              Code: {company.joinCode}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {company.owner ? (
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {company.owner.first_name} {company.owner.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{company.owner.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {company.owner.primary_role}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No owner</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(company.onboardingStatus)}
                        <p className="text-xs text-muted-foreground mt-1">
                          Step {company.onboardingStep}/8
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{company.stats.totalEmployees} employees</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {company.stats.totalLeaveRequests} requests
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/super-admin/companies/${company.id}`)}
                            className="text-sm text-primary hover:bg-primary/10 hover:underline font-medium"
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/super-admin/companies/${company.id}/settings`)}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:bg-primary/10 hover:underline font-medium"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCompany(company)}
                            className="inline-flex items-center gap-1 text-sm text-destructive hover:bg-destructive/10 hover:underline font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} companies
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


