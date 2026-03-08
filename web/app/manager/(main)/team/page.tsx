'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation: string | null;
  status: string;
  department: string | null;
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  onboarding: 'info',
  probation: 'warning',
  on_leave: 'warning',
  terminated: 'danger',
};

export default function ManagerTeamPage() {
  const [team, setTeam] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/employees?limit=50');
        const json = await res.json();
        if (res.ok) {
          setTeam(json.employees ?? []);
        } else {
          setError(json.error ?? 'Could not load team');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Team</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Loading…' : `${team.length} team member${team.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && team.length === 0 && !error && (
            <div className="py-12 text-center">
              <span className="text-4xl">👥</span>
              <p className="text-muted-foreground mt-3 text-sm">No direct reports found.</p>
            </div>
          )}
          {!loading && team.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.designation ?? member.email}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[member.status] ?? 'default'}>{member.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
