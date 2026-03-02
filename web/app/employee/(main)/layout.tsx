import Link from 'next/link';

const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: '🏠' },
  { label: 'Request Leave', href: '/employee/request-leave', icon: '📝' },
  { label: 'Leave History', href: '/employee/leave-history', icon: '📅' },
  { label: 'Attendance', href: '/employee/attendance', icon: '🕐' },
  { label: 'Documents', href: '/employee/documents', icon: '📁' },
  { label: 'Profile', href: '/employee/profile', icon: '👤' },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Continuum</h1>
          <p className="text-xs text-gray-500 mt-1">Employee Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {EMPLOYEE_NAV_ITEMS.map((item) => (
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
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
              RS
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Rahul Sharma</p>
              <p className="text-xs text-gray-500">Engineering</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
