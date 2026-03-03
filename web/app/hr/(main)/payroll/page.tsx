import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PAYROLL_RUNS = [
  { month: 'December 2024', status: 'processed', employees: 42, date: 'Jan 1, 2025', total: '₹18,42,500' },
  { month: 'November 2024', status: 'processed', employees: 41, date: 'Dec 1, 2024', total: '₹17,98,200' },
  { month: 'October 2024', status: 'processed', employees: 41, date: 'Nov 1, 2024', total: '₹17,90,100' },
];

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'info'> = {
  processed: 'success',
  pending: 'warning',
  draft: 'info',
};

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage monthly payroll runs</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            ▶️ Generate Payroll
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Current Month Gross', value: '₹18,42,500', detail: 'Dec 2024', icon: '💰' },
          { label: 'Employees on Payroll', value: '42', detail: '+1 from last month', icon: '👥' },
          { label: 'Next Payroll Date', value: 'Feb 1, 2025', detail: '29 days away', icon: '📅' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{item.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                </div>
                <span className="text-2xl">{item.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payroll History */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PAYROLL_RUNS.map((run) => (
              <div
                key={run.month}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{run.month}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Processed on {run.date} · {run.employees} employees
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-900">{run.total}</span>
                  <Badge variant={STATUS_BADGE[run.status]}>{run.status}</Badge>
                  <button className="text-xs text-blue-600 hover:underline font-medium">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
