"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building } from 'lucide-react';
import { readOnboardingDraft, writeOnboardingDraft } from '@/lib/onboarding/client-payload';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function OnboardingCompanyView() {
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [size, setSize] = React.useState('1-50');
  const [timezone, setTimezone] = React.useState('Asia/Kolkata');
  const [casualQuota, setCasualQuota] = React.useState(12);
  const [sickQuota, setSickQuota] = React.useState(12);
  const [paidQuota, setPaidQuota] = React.useState(18);
  const [minCoveragePercent, setMinCoveragePercent] = React.useState(60);
  const [maxConcurrent, setMaxConcurrent] = React.useState(3);

  React.useEffect(() => {
    const draft = readOnboardingDraft();
    if (draft.company.name) setCompanyName(draft.company.name);
    if (draft.company.industry) setIndustry(draft.company.industry);
    setSize(draft.company.size || '1-50');
    setTimezone(draft.company.timezone || 'Asia/Kolkata');
    setCasualQuota(draft.quotas.casual);
    setSickQuota(draft.quotas.sick);
    setPaidQuota(draft.quotas.paid);
    setMinCoveragePercent(draft.constraints.minCoveragePercent);
    setMaxConcurrent(draft.constraints.maxConcurrent);
  }, []);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    const draft = writeOnboardingDraft({
      company: {
        name: companyName.trim(),
        industry: industry.trim(),
        size,
        timezone,
        workStart: '09:00',
        workEnd: '18:00',
        gracePeriodMinutes: 15,
        halfDayHours: 4,
      },
      quotas: {
        casual: casualQuota,
        sick: sickQuota,
        paid: paidQuota,
      },
      constraints: {
        minCoveragePercent,
        maxConcurrent,
      },
    });

    console.info('[ONBOARDING STEP 2] Draft persisted', {
      companyName: draft.company.name,
      timezone: draft.company.timezone,
      quotas: draft.quotas,
      constraints: draft.constraints,
    });

    router.push('/onboarding/invite-team');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col p-6 relative overflow-hidden">
      <div className="ambient-glow" />

      {/* Progress Header */}
      <header className="w-full max-w-4xl mx-auto py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="text-[var(--foreground)]">Continuum Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold px-3 py-1 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-full">Step 1 Complete</div>
          <div className="w-16 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="w-[50%] h-full bg-[var(--primary)]"></div>
          </div>
          <span className="text-xs font-bold text-[var(--muted-foreground)]">Step 2 of 3</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-6 mx-auto border border-[var(--border)] shadow-sm">
            <Building className="w-8 h-8" />
          </div>
          <h1 className="text-h1">The Organization Namespace</h1>
          <p className="text-body max-w-md mx-auto mt-2">What is the legal name of the entity you are configuring? This will generate your dedicated isolation tenant.</p>
        </div>

        <div className="card p-8 sm:p-10 w-full max-w-[560px] shadow-lg hoverable-off relative">
          <form className="relative z-10 space-y-5" onSubmit={handleContinue}>
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Legal Company Name</label>
              <Input
                id="companyName"
                type="text"
                className="input h-14 text-base focus:border-[var(--primary)] bg-[var(--background)] shadow-sm"
                placeholder="e.g. Acme Corporation Pvt Ltd"
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="industry" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] flex justify-between">
                <span>Industry Sector</span>
                <span className="text-normal font-normal opacity-70">Optional</span>
              </label>
              <Select
                id="industry"
                className="input h-14 text-base focus:border-[var(--primary)] bg-[var(--background)] shadow-sm cursor-pointer appearance-none"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
              >
                <option value="">Select an industry...</option>
                <option value="tech">Technology & IT Services</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="finance">Financial Services</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail & E-commerce</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Operating Region / Compliance Node</label>
              <Select
                id="timezone"
                className="input h-14 text-base focus:border-[var(--primary)] bg-[var(--background)] shadow-sm cursor-pointer appearance-none"
                required
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                <option value="America/New_York">United States (America/New_York)</option>
                <option value="Europe/Berlin">Europe (Europe/Berlin)</option>
              </Select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">This locks data residency and ensures correct labor law constraints.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="size" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Organization Size</label>
              <Select
                id="size"
                className="input h-14 text-base focus:border-[var(--primary)] bg-[var(--background)] shadow-sm cursor-pointer appearance-none"
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="1-50">1 - 50</option>
                <option value="51-200">51 - 200</option>
                <option value="201-1000">201 - 1000</option>
                <option value="1000+">1000+</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label htmlFor="casualQuota" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">CL Quota</label>
                <Input
                  id="casualQuota"
                  type="number"
                  min={0}
                  max={60}
                  className="input h-12"
                  value={casualQuota}
                  onChange={(event) => setCasualQuota(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="sickQuota" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">SL Quota</label>
                <Input
                  id="sickQuota"
                  type="number"
                  min={0}
                  max={60}
                  className="input h-12"
                  value={sickQuota}
                  onChange={(event) => setSickQuota(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="paidQuota" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">PL Quota</label>
                <Input
                  id="paidQuota"
                  type="number"
                  min={0}
                  max={90}
                  className="input h-12"
                  value={paidQuota}
                  onChange={(event) => setPaidQuota(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="minCoveragePercent" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Min Coverage %</label>
                <Input
                  id="minCoveragePercent"
                  type="number"
                  min={0}
                  max={100}
                  className="input h-12"
                  value={minCoveragePercent}
                  onChange={(event) => setMinCoveragePercent(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="maxConcurrent" className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Max Concurrent Leaves</label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  min={1}
                  max={20}
                  className="input h-12"
                  value={maxConcurrent}
                  onChange={(event) => setMaxConcurrent(Number(event.target.value))}
                />
              </div>
            </div>
            
            <div className="pt-6 mt-4">
              <Button type="submit" className="btn btn-primary w-full h-14 text-base font-semibold">
                Generate Tenant <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
