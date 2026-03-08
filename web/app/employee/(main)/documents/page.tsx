import { Card, CardContent } from '@/components/ui/card';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground mt-1">Your employment documents and payslips</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            {/* Document icon */}
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-blue-500 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              Document management is coming soon
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              We are building a secure document management system for your workplace.
              Here is what you will be able to do:
            </p>

            <ul className="mt-6 space-y-3 text-sm text-muted-foreground text-left">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium">
                  1
                </span>
                <span>Upload and store employment documents securely</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium">
                  2
                </span>
                <span>Download payslips, offer letters, and tax forms</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium">
                  3
                </span>
                <span>Track document expiry dates and get renewal reminders</span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground mt-8">
              Need a document right now? Contact your HR team for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
