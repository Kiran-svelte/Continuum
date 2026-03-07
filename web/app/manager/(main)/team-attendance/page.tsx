'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonDashboard } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  status: string;
}

interface LeaveRequest {
  id: string;
  emp_id: string;
  start_date: string;
  end_date: string;
  status: string;
  leave_type: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
  };
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  department: string | null;
  designation: string | null;
  attendance: 'Present' | 'On Leave';
  leaveType: string | null;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function isOnLeaveToday(leave: LeaveRequest, todayStr: string): boolean {
  const start = leave.start_date.slice(0, 10);
  const end = leave.end_date.slice(0, 10);
  return todayStr >= start && todayStr <= end;
}
/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TeamAttendancePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [empRes, leaveRes] = await Promise.all([
          fetch('/api/employees?limit=50'),
          fetch('/api/leaves/list?status=approved&limit=100'),
        ]);

        if (!empRes.ok) throw new Error('Failed to load team members');
        if (!leaveRes.ok) throw new Error('Failed to load leave data');

        const empData = await empRes.json();
        const leaveData = await leaveRes.json();

        const employees: Employee[] = empData.employees ?? [];
        const leaves: LeaveRequest[] = leaveData.requests ?? [];

        const today = new Date().toISOString().slice(0, 10);

        // Build a map of emp_id -> active approved leave for today
        const onLeaveMap = new Map<string, LeaveRequest>();
        for (const leave of leaves) {
          if (isOnLeaveToday(leave, today)) {
            onLeaveMap.set(leave.emp_id, leave);
          }
        }

        const members: TeamMember[] = employees.map((emp) => {
          const activeLeave = onLeaveMap.get(emp.id);
          return {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            initials: getInitials(emp.first_name, emp.last_name),
            department: emp.department,
            designation: emp.designation,
            attendance: activeLeave ? 'On Leave' : 'Present',
            leaveType: activeLeave?.leave_type ?? null,
          };
        });

        setTeam(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">Loading today&apos;s availability...</p>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">Today&apos;s team availability overview</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (team.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">Today&apos;s team availability overview</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-foreground font-medium">No team members found</p>
              <p className="text-muted-foreground text-sm mt-1">
                Team members will appear here once employees are added to the system.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  /* ---- Computed stats ---- */
  const presentCount = team.filter((m) => m.attendance === 'Present').length;
  const onLeaveCount = team.filter((m) => m.attendance === 'On Leave').length;
  const totalCount = team.length;
  const availabilityPct = Math.round((presentCount / totalCount) * 100);

  const summaryCards = [
    { label: 'Present', value: String(presentCount), icon: '✅' },
    { label: 'On Leave', value: String(onLeaveCount), icon: '🏖️' },
    { label: 'Total', value: String(totalCount), icon: '👥' },
    { label: 'Availability', value: `${availabilityPct}%`, icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
        <p className="text-muted-foreground mt-1">Today&apos;s team availability overview</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryCards.map((item) => (
          <motion.div key={item.label} variants={cardVariants}>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span>{item.icon}</span>
                  <span className="text-2xl font-bold text-foreground">{item.value}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Team list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 22, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Team Status Today</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div
              className="space-y-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {team.map((member) => (
                <motion.div
                  key={member.id}
                  variants={itemVariants}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {member.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      {member.department && (
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={member.attendance === 'On Leave' ? 'warning' : 'success'}
                  >
                    {member.attendance}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
