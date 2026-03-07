'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonDashboard } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getNextPayrollDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDaysUntilNextPayroll(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = nextMonth.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCurrentMonthYear(): { month: number; year: number; label: string } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    success: boolean;
    message: string;
    data?: {
      total_gross: number;
      total_net: number;
      employee_count: number;
      status: string;
    };
  } | null>(null);

  const { month, year, label: currentMonthLabel } = getCurrentMonthYear();

  /* Fetch employee count on mount */
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees?limit=1');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load employees (${res.status})`);
        }
        const data = await res.json();
        setEmployeeCount(data.pagination?.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employee data');
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  /* Generate payroll handler */
  async function handleGeneratePayroll() {
    setGenerating(true);
    setGenerateResult(null);

    try {
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerateResult({
          success: false,
          message: data.error || `Payroll generation failed (${res.status})`,
        });
        return;
      }

      setGenerateResult({
        success: true,
        message: `Payroll generated for ${currentMonthLabel}`,
        data: {
          total_gross: data.total_gross,
          total_net: data.total_net,
          employee_count: data.employee_count,
          status: data.status,
        },
      });
    } catch (err) {
      setGenerateResult({
        success: false,
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setGenerating(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return <SkeletonDashboard />;
  }

  /* ---------------------------------------------------------------- */
  /*  Error state                                                      */
  /* ---------------------------------------------------------------- */

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="h-6 w-6 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Unable to Load Payroll</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  const daysUntil = getDaysUntilNextPayroll();

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">Manage monthly payroll runs</p>
        </div>
        <Button
          variant="primary"
          onClick={handleGeneratePayroll}
          loading={generating}
          disabled={generating}
        >
          Generate Payroll
        </Button>
      </motion.div>

      {/* Generation result banner */}
      {generateResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 260, damping: 20 }}
        >
          <Card
            className={
              generateResult.success
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-destructive/30 bg-destructive/5'
            }
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      generateResult.success
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {generateResult.success ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {generateResult.success ? 'Payroll Generated' : 'Generation Failed'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {generateResult.message}
                    </p>
                    {generateResult.data && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        <Badge variant="success">{generateResult.data.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {generateResult.data.employee_count} employees
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          Gross: {formatCurrency(generateResult.data.total_gross)}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          Net: {formatCurrency(generateResult.data.total_net)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setGenerateResult(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={itemVariants}>
        {/* Employees on payroll - real data */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employees on Payroll
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{employeeCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Active employees</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next payroll date - calculated */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Next Payroll Date
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{getNextPayrollDate()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {daysUntil} {daysUntil === 1 ? 'day' : 'days'} away
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current period */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Period
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{currentMonthLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Badge variant="info" size="sm">
                    Awaiting generation
                  </Badge>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payroll runs - empty state */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payroll Runs</CardTitle>
              <Badge variant="default" size="sm">
                {currentMonthLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Generate your first payroll run
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Click the button below to generate payroll for{' '}
                <span className="font-medium text-foreground">{currentMonthLabel}</span>. This will
                calculate salaries, deductions, and net pay for all{' '}
                <span className="font-medium text-foreground">{employeeCount}</span> active
                employees.
              </p>
              <Button
                variant="primary"
                className="mt-6"
                onClick={handleGeneratePayroll}
                loading={generating}
                disabled={generating}
              >
                Generate Payroll for {currentMonthLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
