import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HRSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Company configuration and preferences</p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Information</CardTitle>
            <button className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Company Name', value: '—' },
              { label: 'Industry', value: '—' },
              { label: 'Company Size', value: '—' },
              { label: 'Timezone', value: 'Asia/Kolkata' },
              { label: 'Country', value: 'India' },
              { label: 'Work Week', value: 'Mon–Fri' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm text-gray-900 mt-0.5 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Join Code */}
      <Card>
        <CardHeader>
          <CardTitle>Company Join Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            Share this code with employees so they can join your organization during sign-up.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Join Code</p>
              <p className="text-xl font-mono font-bold text-blue-700 tracking-widest">—</p>
            </div>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              📋 Copy
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Leave Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leave Policy</CardTitle>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Leave Year Start', value: 'January 1', editable: true },
              { label: 'SLA for Approvals', value: '48 hours', editable: true },
              { label: 'Negative Balance', value: 'Disabled', editable: true },
              { label: 'Probation Period', value: '180 days', editable: true },
              { label: 'Notice Period', value: '90 days', editable: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-gray-700">{item.label}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  {item.editable && (
                    <button className="text-xs text-blue-600 hover:underline">Edit</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Email notifications for leave requests', on: true },
              { label: 'Manager alerts for pending approvals', on: true },
              { label: 'Daily digest for HR team', on: true },
              { label: 'SLA breach alerts', on: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${item.on ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 mx-1 transition-transform ${item.on ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
