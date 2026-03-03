'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STEPS = [
  { id: 1, label: 'Company Setup', icon: '🏢' },
  { id: 2, label: 'Leave Types', icon: '📋' },
  { id: 3, label: 'Constraint Rules', icon: '⚙️' },
  { id: 4, label: 'Holidays', icon: '🎉' },
  { id: 5, label: 'Notifications', icon: '🔔' },
  { id: 6, label: 'Complete', icon: '✅' },
];

// ─── Step data types ────────────────────────────────────────────────────────

interface CompanyData {
  companyName: string;
  industry: string;
  employeeCount: string;
  timezone: string;
}

interface LeaveTypeEntry {
  code: string;
  name: string;
  days: number;
  carryForward: boolean;
  enabled: boolean;
}

interface HolidayEntry {
  name: string;
  date: string;
  enabled: boolean;
}

interface NotifData {
  emailNotifications: boolean;
  managerAlerts: boolean;
  dailyDigest: boolean;
  slaAlerts: boolean;
}

// ─── Step components ─────────────────────────────────────────────────────────

function CompanySetupStep({
  data,
  onChange,
}: {
  data: CompanyData;
  onChange: (d: CompanyData) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input
          id="companyName"
          type="text"
          value={data.companyName}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Acme Corporation"
        />
      </div>
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
        <select
          id="industry"
          value={data.industry}
          onChange={(e) => onChange({ ...data, industry: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Select industry</option>
          <option value="technology">Technology</option>
          <option value="finance">Finance &amp; Banking</option>
          <option value="healthcare">Healthcare</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="retail">Retail</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label>
        <select
          id="employeeCount"
          value={data.employeeCount}
          onChange={(e) => onChange({ ...data, employeeCount: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Select range</option>
          <option value="1-50">1–50</option>
          <option value="51-200">51–200</option>
          <option value="201-1000">201–1,000</option>
          <option value="1001+">1,001+</option>
        </select>
      </div>
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <select
          id="timezone"
          value={data.timezone}
          onChange={(e) => onChange({ ...data, timezone: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
        </select>
      </div>
    </div>
  );
}

function LeaveTypesStep({
  data,
  onChange,
}: {
  data: LeaveTypeEntry[];
  onChange: (d: LeaveTypeEntry[]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure the leave types for your organization. You can customize these later.</p>
      <div className="space-y-3">
        {data.map((type, idx) => (
          <div key={type.code} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">{type.name}</p>
              <p className="text-xs text-gray-500">{type.days} days/year · {type.carryForward ? 'Carry forward enabled' : 'No carry forward'}</p>
            </div>
            <input
              type="checkbox"
              checked={type.enabled}
              onChange={(e) => {
                const updated = [...data];
                updated[idx] = { ...type, enabled: e.target.checked };
                onChange(updated);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConstraintRulesStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Default constraint rules have been configured for your organization. You can refine them from the HR portal after setup.</p>
      <div className="space-y-3">
        {[
          { rule: 'Minimum notice period', desc: 'Require advance notice for leave requests', defaultValue: '3 days' },
          { rule: 'Maximum consecutive days', desc: 'Limit consecutive leave days without approval', defaultValue: '5 days' },
          { rule: 'Team availability threshold', desc: 'Minimum team members required present', defaultValue: '60%' },
          { rule: 'Blackout periods', desc: 'Block leave during critical periods', defaultValue: 'None set' },
        ].map((item) => (
          <div key={item.rule} className="p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.rule}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{item.defaultValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HolidaysStep({
  data,
  onChange,
}: {
  data: HolidayEntry[];
  onChange: (d: HolidayEntry[]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select the holidays to include in your company calendar.</p>
      <div className="space-y-2 mt-4">
        {data.map((holiday, idx) => (
          <div key={holiday.name} className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={holiday.enabled}
                onChange={(e) => {
                  const updated = [...data];
                  updated[idx] = { ...holiday, enabled: e.target.checked };
                  onChange(updated);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">{holiday.name}</span>
            </div>
            <span className="text-xs text-gray-500">{holiday.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsStep({
  data,
  onChange,
}: {
  data: NotifData;
  onChange: (d: NotifData) => void;
}) {
  const items: { key: keyof NotifData; label: string }[] = [
    { key: 'emailNotifications', label: 'Email notifications for leave requests' },
    { key: 'managerAlerts', label: 'Manager alerts for pending approvals' },
    { key: 'dailyDigest', label: 'Daily digest for HR team' },
    { key: 'slaAlerts', label: 'SLA breach alerts' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure notification preferences.</p>
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-900">{label}</span>
            <input
              type="checkbox"
              checked={data[key]}
              onChange={(e) => onChange({ ...data, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompleteStep({ joinCode }: { joinCode: string }) {
  return (
    <div className="text-center py-8">
      <span className="text-6xl">🎉</span>
      <h2 className="text-2xl font-bold text-gray-900 mt-4">Setup Complete!</h2>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">
        Your organization is now configured and ready to use.
      </p>
      {joinCode && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-sm mx-auto">
          <p className="text-sm font-medium text-blue-900 mb-1">Company Join Code</p>
          <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{joinCode}</p>
          <p className="text-xs text-blue-600 mt-1">Share this with your employees so they can sign up.</p>
        </div>
      )}
      <div className="mt-8">
        <a
          href="/hr/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Go to HR Dashboard →
        </a>
      </div>
    </div>
  );
}

// ─── Default data ────────────────────────────────────────────────────────────

const DEFAULT_LEAVE_TYPES: LeaveTypeEntry[] = [
  { code: 'CL', name: 'Casual Leave', days: 12, carryForward: false, enabled: true },
  { code: 'SL', name: 'Sick Leave', days: 7, carryForward: false, enabled: true },
  { code: 'PL', name: 'Privilege Leave', days: 15, carryForward: true, enabled: true },
  { code: 'ML', name: 'Maternity Leave', days: 182, carryForward: false, enabled: true },
  { code: 'PTL', name: 'Paternity Leave', days: 15, carryForward: false, enabled: true },
];

const DEFAULT_HOLIDAYS: HolidayEntry[] = [
  { name: 'Republic Day', date: '2025-01-26', enabled: true },
  { name: 'Holi', date: '2025-03-14', enabled: true },
  { name: 'Independence Day', date: '2025-08-15', enabled: true },
  { name: 'Gandhi Jayanti', date: '2025-10-02', enabled: true },
  { name: 'Diwali', date: '2025-10-20', enabled: true },
  { name: 'Christmas', date: '2025-12-25', enabled: true },
];

// ─── Main page ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Per-step state
  const [companyData, setCompanyData] = useState<CompanyData>({
    companyName: '',
    industry: '',
    employeeCount: '',
    timezone: 'Asia/Kolkata',
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeEntry[]>(DEFAULT_LEAVE_TYPES);
  const [holidays, setHolidays] = useState<HolidayEntry[]>(DEFAULT_HOLIDAYS);
  const [notifData, setNotifData] = useState<NotifData>({
    emailNotifications: true,
    managerAlerts: true,
    dailyDigest: true,
    slaAlerts: true,
  });

  const isLastContentStep = currentStep === STEPS.length - 2; // step before "Complete"
  const isCompletionStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  async function handleNext() {
    if (isLastContentStep) {
      // Save all onboarding data to DB before showing Complete step
      setSaving(true);
      setError('');
      try {
        const payload = {
          company: {
            name: companyData.companyName || undefined,
            industry: companyData.industry || undefined,
            size: companyData.employeeCount || undefined,
            timezone: companyData.timezone,
          },
          leave_types: leaveTypes
            .filter((lt) => lt.enabled)
            .map((lt) => ({ code: lt.code, name: lt.name, days: lt.days, carry_forward: lt.carryForward })),
          holidays: holidays
            .filter((h) => h.enabled)
            .map((h) => ({ name: h.name, date: h.date })),
          notifications: {
            email_notifications: notifData.emailNotifications,
            manager_alerts: notifData.managerAlerts,
            daily_digest: notifData.dailyDigest,
            sla_alerts: notifData.slaAlerts,
          },
        };

        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to save onboarding data');
          return;
        }
        // Fetch the company's join code to display on the Complete step
        if (json.join_code) setJoinCode(json.join_code);
        setCurrentStep((s) => s + 1);
      } finally {
        setSaving(false);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 0:
        return <CompanySetupStep data={companyData} onChange={setCompanyData} />;
      case 1:
        return <LeaveTypesStep data={leaveTypes} onChange={setLeaveTypes} />;
      case 2:
        return <ConstraintRulesStep />;
      case 3:
        return <HolidaysStep data={holidays} onChange={setHolidays} />;
      case 4:
        return <NotificationsStep data={notifData} onChange={setNotifData} />;
      case 5:
        return <CompleteStep joinCode={joinCode} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Continuum</h1>
          <p className="text-gray-500 mt-2">Organization Setup</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>{step.icon}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${index < currentStep ? 'bg-blue-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {!isCompletionStep && (
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{STEPS[currentStep].label}</h2>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {renderStepContent()}

            {!isCompletionStep && (
              <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  disabled={isFirstStep || saving}
                >
                  ← Back
                </Button>
                <Button onClick={handleNext} disabled={saving}>
                  {saving ? 'Saving…' : isLastContentStep ? 'Finish Setup' : 'Next →'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
