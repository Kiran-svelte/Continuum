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

function CompanySetupStep() {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input id="companyName" type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Acme Corporation" />
      </div>
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
        <select id="industry" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
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
        <select id="employeeCount" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">Select range</option>
          <option value="1-50">1–50</option>
          <option value="51-200">51–200</option>
          <option value="201-1000">201–1,000</option>
          <option value="1001+">1,001+</option>
        </select>
      </div>
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <select id="timezone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
        </select>
      </div>
    </div>
  );
}

function LeaveTypesStep() {
  const defaultTypes = [
    { name: 'Casual Leave', days: 12, carryForward: false },
    { name: 'Sick Leave', days: 7, carryForward: false },
    { name: 'Privilege Leave', days: 15, carryForward: true },
    { name: 'Maternity Leave', days: 182, carryForward: false },
    { name: 'Paternity Leave', days: 15, carryForward: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure the leave types for your organization. You can customize these later.</p>
      <div className="space-y-3">
        {defaultTypes.map((type) => (
          <div key={type.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">{type.name}</p>
              <p className="text-xs text-gray-500">{type.days} days/year · {type.carryForward ? 'Carry forward enabled' : 'No carry forward'}</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConstraintRulesStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Set up constraint rules for leave approvals.</p>
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

function HolidaysStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select the holiday calendar for your organization.</p>
      <div>
        <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">Region</label>
        <select id="region" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="india">India (National Holidays)</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>
      <div className="space-y-2 mt-4">
        {[
          { name: 'Republic Day', date: 'Jan 26' },
          { name: 'Holi', date: 'Mar 14' },
          { name: 'Independence Day', date: 'Aug 15' },
          { name: 'Gandhi Jayanti', date: 'Oct 2' },
          { name: 'Diwali', date: 'Oct 20' },
          { name: 'Christmas', date: 'Dec 25' },
        ].map((holiday) => (
          <div key={holiday.name} className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-900">{holiday.name}</span>
            </div>
            <span className="text-xs text-gray-500">{holiday.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure notification preferences.</p>
      <div className="space-y-3">
        {[
          { label: 'Email notifications for leave requests', defaultOn: true },
          { label: 'Slack integration', defaultOn: false },
          { label: 'Manager alerts for pending approvals', defaultOn: true },
          { label: 'Daily digest for HR team', defaultOn: true },
          { label: 'SLA breach alerts', defaultOn: true },
        ].map((notif) => (
          <div key={notif.label} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-900">{notif.label}</span>
            <input type="checkbox" defaultChecked={notif.defaultOn} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="text-center py-8">
      <span className="text-6xl">🎉</span>
      <h2 className="text-2xl font-bold text-gray-900 mt-4">Setup Complete!</h2>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">
        Your organization is now configured and ready to use. You can always adjust these settings later from the HR portal.
      </p>
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

const STEP_COMPONENTS = [CompanySetupStep, LeaveTypesStep, ConstraintRulesStep, HolidaysStep, NotificationsStep, CompleteStep];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const StepComponent = STEP_COMPONENTS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

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
            {!isLastStep && (
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{STEPS[currentStep].label}</h2>
            )}
            <StepComponent />

            {!isLastStep && (
              <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  disabled={isFirstStep}
                >
                  ← Back
                </Button>
                <Button onClick={() => setCurrentStep((s) => s + 1)}>
                  Next →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
