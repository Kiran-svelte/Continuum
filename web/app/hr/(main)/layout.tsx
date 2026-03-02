import Link from 'next/link';

const HR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/hr/dashboard', icon: '📊' },
  { label: 'Employees', href: '/hr/employees', icon: '👥' },
  { label: 'Leave Requests', href: '/hr/leave-requests', icon: '📋' },
  { label: 'Approvals', href: '/hr/approvals', icon: '✅' },
  { label: 'Attendance', href: '/hr/attendance', icon: '🕐' },
  { label: 'Payroll', href: '/hr/payroll', icon: '💰' },
  { label: 'Policy Settings', href: '/hr/policy-settings', icon: '⚙️' },
  { label: 'Reports', href: '/hr/reports', icon: '📈' },
  { label: 'Organization', href: '/hr/organization', icon: '🏢' },
  { label: 'Settings', href: '/hr/settings', icon: '🔧' },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Continuum</h1>
          <p className="text-xs text-gray-500 mt-1">HR Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {HR_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
