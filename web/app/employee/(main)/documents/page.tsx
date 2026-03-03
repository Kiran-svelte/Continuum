import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DOCUMENTS = [
  { name: 'Offer Letter', type: 'PDF', date: 'Jun 1, 2023', category: 'Employment', verified: true },
  { name: 'Employment Contract', type: 'PDF', date: 'Jun 1, 2023', category: 'Employment', verified: true },
  { name: 'Payslip — Dec 2024', type: 'PDF', date: 'Jan 2, 2025', category: 'Payroll', verified: true },
  { name: 'Payslip — Nov 2024', type: 'PDF', date: 'Dec 2, 2024', category: 'Payroll', verified: true },
  { name: 'Form 16 (FY 2023-24)', type: 'PDF', date: 'Jun 15, 2024', category: 'Tax', verified: true },
  { name: 'Experience Certificate', type: 'PDF', date: 'On request', category: 'Employment', verified: false },
];

const CATEGORY_COLORS: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  Employment: 'info',
  Payroll: 'success',
  Tax: 'warning',
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Your employment documents and payslips</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENTS.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center text-xs font-bold text-red-600">
                    {doc.type}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={CATEGORY_COLORS[doc.category] ?? 'default'}>{doc.category}</Badge>
                  {doc.verified && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}
                  <button className="text-xs text-blue-600 hover:underline font-medium">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Need a document? Contact your HR team at hr@company.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
