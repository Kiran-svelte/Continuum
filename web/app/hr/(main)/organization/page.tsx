'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';

interface DeptMember {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  status: string;
  joinDate: string | null;
}

interface Department {
  name: string;
  employeeCount: number;
  head: string | null;
  headRole: string | null;
  roles: string[];
  members: DeptMember[];
}

interface OrgData {
  company: { name: string; size: string | null; industry: string | null } | null;
  departments: Department[];
  totalEmployees: number;
  totalDepartments: number;
}

export default function OrganizationPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/hr/organization');
        if (!res.ok) throw new Error('Failed to fetch');
        setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleDept = (name: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'director': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'team_lead': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Organization</h1>
        <p className="text-muted-foreground mt-1">
          Company structure and department overview
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-xl font-bold">{loading ? '...' : data?.company?.name ?? 'N/A'}</p>
                {data?.company?.industry && (
                  <p className="text-xs text-muted-foreground">{data.company.industry}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{loading ? '...' : data?.totalDepartments ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{loading ? '...' : data?.totalEmployees ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data || data.departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No departments found</p>
            <p className="text-sm mt-1">Departments are derived from employee records. Add employees with departments to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.departments.map((dept) => (
            <Card key={dept.name} className="overflow-hidden">
              <button
                className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => toggleDept(dept.name)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">{dept.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                      {dept.head ? ` · Head: ${dept.head}` : ''}
                    </p>
                  </div>
                </div>
                {expandedDepts.has(dept.name) ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              {expandedDepts.has(dept.name) && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left py-2 px-4 text-sm font-medium">Name</th>
                          <th className="text-left py-2 px-4 text-sm font-medium">Role</th>
                          <th className="text-left py-2 px-4 text-sm font-medium">Designation</th>
                          <th className="text-left py-2 px-4 text-sm font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dept.members.map((member) => (
                          <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-sm font-medium">{member.name}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="default" className={getRoleBadgeColor(member.role)}>
                                {member.role}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-sm text-muted-foreground">{member.designation || '--'}</td>
                            <td className="py-2.5 px-4 text-sm text-muted-foreground">{member.joinDate || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
