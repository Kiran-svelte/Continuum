'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { syncUser, createCompanyAndEmployee, joinCompanyAsEmployee } from '@/app/actions/auth';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';
import {
  Building2,
  ClipboardList,
  Settings,
  CalendarDays,
  Bell,
  CheckCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STEPS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Company Setup', icon: Building2 },
  { id: 2, label: 'Leave Types', icon: ClipboardList },
  { id: 3, label: 'Constraint Rules', icon: Settings },
  { id: 4, label: 'Holidays', icon: CalendarDays },
  { id: 5, label: 'Notifications', icon: Bell },
  { id: 6, label: 'Complete', icon: CheckCircle },
];

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:outline-none placeholder:text-white/30';

const labelClass = 'block text-sm font-medium text-white/90 mb-1';

// ─── Step data types ────────────────────────────────────────────────────────

interface CompanyData {
  companyName: string;
  industry: string;
  employeeCount: string;
  country: string;
  timezone: string;
  slaHours: number;
  negativeBal: boolean;
  probationDays: number;
  workStart?: string;
  workEnd?: string;
  gracePeriodMinutes?: number;
  halfDayHours?: number;
}

interface LeaveTypeEntry {
  code: string;
  name: string;
  days: number;
  carryForward: boolean;
  enabled: boolean;
}

interface BlackoutEntry {
  name: string;
  start: string;
  end: string;
}

interface ConstraintConfig {
  minCoveragePercent: number;
  maxConcurrent: number;
  blackoutDates: BlackoutEntry[];
  autoApprove: boolean;
  autoApproveThreshold: number;
}

interface HolidayEntry {
  name: string;
  date: string;
  enabled: boolean;
  custom?: boolean;
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
        <label htmlFor="companyName" className={labelClass}>Company Name</label>
        <input
          id="companyName"
          type="text"
          value={data.companyName}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
          className={inputClass}
          placeholder="Acme Corporation"
        />
      </div>
      <div>
        <label htmlFor="industry" className={labelClass}>Industry</label>
        <select
          id="industry"
          value={data.industry}
          onChange={(e) => onChange({ ...data, industry: e.target.value })}
          className={inputClass}
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
        <label htmlFor="employeeCount" className={labelClass}>Employee Count</label>
        <select
          id="employeeCount"
          value={data.employeeCount}
          onChange={(e) => onChange({ ...data, employeeCount: e.target.value })}
          className={inputClass}
        >
          <option value="">Select range</option>
          <option value="1-50">1–50</option>
          <option value="51-200">51–200</option>
          <option value="201-1000">201–1,000</option>
          <option value="1001+">1,001+</option>
        </select>
      </div>
      <div>
        <label htmlFor="country" className={labelClass}>Country</label>
        <select
          id="country"
          value={data.country}
          onChange={(e) => onChange({ ...data, country: e.target.value })}
          className={inputClass}
        >
          <option value="">Select country</option>
          <option value="IN">India</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="JP">Japan</option>
          <option value="SG">Singapore</option>
          <option value="AE">United Arab Emirates</option>
          <option value="CN">China</option>
          <option value="BR">Brazil</option>
          <option value="ZA">South Africa</option>
          <option value="NL">Netherlands</option>
          <option value="SE">Sweden</option>
          <option value="MY">Malaysia</option>
          <option value="PH">Philippines</option>
          <option value="ID">Indonesia</option>
          <option value="KR">South Korea</option>
          <option value="MX">Mexico</option>
          <option value="IT">Italy</option>
          <option value="ES">Spain</option>
          <option value="NZ">New Zealand</option>
          <option value="IE">Ireland</option>
          <option value="SA">Saudi Arabia</option>
        </select>
      </div>
      <div>
        <select
          id="timezone"
          value={data.timezone}
          onChange={(e) => onChange({ ...data, timezone: e.target.value })}
          className={inputClass}
        >
          <option value="">Select timezone</option>
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="America/Chicago">America/Chicago (CST)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Europe/Berlin">Europe/Berlin (CET)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="slaHours" className={labelClass}>
            SLA for Approvals (hours)
          </label>
          <input
            id="slaHours"
            type="number"
            min={1}
            max={336}
            value={data.slaHours}
            onChange={(e) => onChange({ ...data, slaHours: parseInt(e.target.value) || 48 })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="probationDays" className={labelClass}>
            Probation Period (days)
          </label>
          <input
            id="probationDays"
            type="number"
            min={0}
            max={730}
            value={data.probationDays}
            onChange={(e) => onChange({ ...data, probationDays: parseInt(e.target.value) || 180 })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
        <div>
          <p className="text-sm font-medium text-white">Allow Negative Balance</p>
          <p className="text-xs text-white/60">Employees can take leave even when balance is zero</p>
        </div>
        <input
          type="checkbox"
          checked={data.negativeBal}
          onChange={(e) => onChange({ ...data, negativeBal: e.target.checked })}
          className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
          aria-label="Allow negative balance"
        />
      </div>

      {/* Work Schedule */}
      <div className="mt-6 border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Work Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Work Start Time</label>
            <input
              type="time"
              value={data.workStart || '09:00'}
              onChange={(e) => onChange({...data, workStart: e.target.value})}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Work End Time</label>
            <input
              type="time"
              value={data.workEnd || '18:00'}
              onChange={(e) => onChange({...data, workEnd: e.target.value})}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Grace Period (minutes)</label>
            <input
              type="number"
              min="0" max="120"
              value={data.gracePeriodMinutes ?? 15}
              onChange={(e) => onChange({...data, gracePeriodMinutes: parseInt(e.target.value) || 15})}
              className={inputClass}
            />
            <p className="text-xs text-white/60 mt-1">Minutes after work start before marking late</p>
          </div>
          <div>
            <label className={labelClass}>Half-Day Threshold (hours)</label>
            <input
              type="number"
              min="1" max="12" step="0.5"
              value={data.halfDayHours ?? 4}
              onChange={(e) => onChange({...data, halfDayHours: parseFloat(e.target.value) || 4})}
              className={inputClass}
            />
            <p className="text-xs text-white/60 mt-1">Hours below which attendance is marked as half-day</p>
          </div>
        </div>
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
      <p className="text-sm text-white/60">Select and configure the leave types for your organization. Choose at least one type.</p>
      {data.filter((t) => t.enabled).length === 0 && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-sm text-yellow-300">
          Please select at least one leave type to continue.
        </div>
      )}
      <div className="space-y-3">
        {data.map((type, idx) => (
          <div key={type.code} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
            <div>
              <p className="text-sm font-medium text-white">{type.name}</p>
              <p className="text-xs text-white/60">{type.days} days/year · {type.carryForward ? 'Carry forward enabled' : 'No carry forward'}</p>
            </div>
            <input
              type="checkbox"
              checked={type.enabled}
              onChange={(e) => {
                const updated = [...data];
                updated[idx] = { ...type, enabled: e.target.checked };
                onChange(updated);
              }}
              className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
              aria-label={`Enable ${type.name}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConstraintRulesStep({
  data,
  onChange,
}: {
  data: ConstraintConfig;
  onChange: (d: ConstraintConfig) => void;
}) {
  const [blackoutInput, setBlackoutInput] = useState({ name: '', start: '', end: '' });

  function addBlackout() {
    if (!blackoutInput.name || !blackoutInput.start || !blackoutInput.end) return;
    onChange({
      ...data,
      blackoutDates: [...data.blackoutDates, { ...blackoutInput }],
    });
    setBlackoutInput({ name: '', start: '', end: '' });
  }

  function removeBlackout(idx: number) {
    const updated = [...data.blackoutDates];
    updated.splice(idx, 1);
    onChange({ ...data, blackoutDates: updated });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        Configure how the constraint engine evaluates leave requests.
      </p>

      {/* Team Coverage */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Minimum Team Coverage</p>
            <p className="text-xs text-white/60">Minimum % of team that must be present</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={data.minCoveragePercent}
              onChange={(e) => onChange({ ...data, minCoveragePercent: parseInt(e.target.value) })}
              className="w-28 accent-primary"
              aria-label="Minimum team coverage percentage"
            />
            <span className="text-sm font-semibold text-white w-10 text-right">
              {data.minCoveragePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Max Concurrent */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Max Concurrent Leaves</p>
            <p className="text-xs text-white/60">Maximum employees on leave at same time</p>
          </div>
          <input
            type="number"
            min={1}
            max={50}
            value={data.maxConcurrent}
            onChange={(e) => onChange({ ...data, maxConcurrent: parseInt(e.target.value) || 2 })}
            className="w-16 bg-white/5 border border-white/10 text-white rounded-xl px-2 py-1 text-sm text-center focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:outline-none"
            aria-label="Maximum concurrent leaves"
          />
        </div>
      </div>

      {/* Blackout Dates */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div>
          <p className="text-sm font-medium text-white">Blackout Periods</p>
          <p className="text-xs text-white/60">Dates when leave is not allowed (except emergency)</p>
        </div>
        {data.blackoutDates.length > 0 && (
          <div className="space-y-2">
            {data.blackoutDates.map((bd, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-xs">
                <span className="font-medium text-white">{bd.name}</span>
                <span className="text-white/60">{bd.start} → {bd.end}</span>
                <button
                  type="button"
                  onClick={() => removeBlackout(idx)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Name (e.g. Q4 Freeze)"
            value={blackoutInput.name}
            onChange={(e) => setBlackoutInput({ ...blackoutInput, name: e.target.value })}
            className="col-span-3 sm:col-span-1 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-white/30"
          />
          <input
            type="date"
            value={blackoutInput.start}
            onChange={(e) => setBlackoutInput({ ...blackoutInput, start: e.target.value })}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            aria-label="Blackout start date"
          />
          <input
            type="date"
            value={blackoutInput.end}
            onChange={(e) => setBlackoutInput({ ...blackoutInput, end: e.target.value })}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            aria-label="Blackout end date"
          />
        </div>
        <button
          type="button"
          onClick={addBlackout}
          className="text-xs bg-white/10 hover:bg-white/15 text-white/80 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Blackout Period
        </button>
      </div>

      {/* Auto-Approve */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Auto-Approve</p>
            <p className="text-xs text-white/60">
              Auto-approve when constraint engine confidence meets threshold
            </p>
          </div>
          <input
            type="checkbox"
            checked={data.autoApprove}
            onChange={(e) => onChange({ ...data, autoApprove: e.target.checked })}
            className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
            aria-label="Enable auto-approve"
          />
        </div>
        {data.autoApprove && (
          <div className="flex items-center gap-3 mt-2">
            <label className="text-xs text-white/60 w-36">Confidence Threshold</label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={data.autoApproveThreshold}
              onChange={(e) => onChange({ ...data, autoApproveThreshold: parseFloat(e.target.value) })}
              className="w-28 accent-primary"
              aria-label="Auto-approve confidence threshold"
            />
            <span className="text-sm font-semibold text-white w-12">
              {(data.autoApproveThreshold * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HolidaysStep({
  data,
  onChange,
  country,
}: {
  data: HolidayEntry[];
  onChange: (d: HolidayEntry[]) => void;
  country: string;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [fetchingHolidays, setFetchingHolidays] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchedCountry, setFetchedCountry] = useState('');

  // Auto-fetch holidays from API Ninjas when country changes
  useEffect(() => {
    if (!country || country === fetchedCountry) return;

    async function fetchHolidays() {
      setFetchingHolidays(true);
      setFetchError('');
      try {
        const res = await fetch(`/api/holidays/fetch?country=${encodeURIComponent(country)}`);
        const json = await res.json();

        if (res.ok && json.holidays && json.holidays.length > 0) {
          const fetched: HolidayEntry[] = json.holidays.map((h: { name: string; date: string }) => ({
            name: h.name,
            date: h.date,
            enabled: true,
            custom: false,
          }));
          // Preserve any custom holidays the user already added
          const customHolidays = data.filter((h) => h.custom);
          onChange([...fetched, ...customHolidays]);
          setFetchedCountry(country);
        } else {
          setFetchError(json.error || 'No holidays found for this country');
        }
      } catch {
        setFetchError('Failed to fetch holidays');
      } finally {
        setFetchingHolidays(false);
      }
    }

    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  function addCustomHoliday() {
    if (!newHoliday.name.trim() || !newHoliday.date) return;
    onChange([...data, { name: newHoliday.name.trim(), date: newHoliday.date, enabled: true, custom: true }]);
    setNewHoliday({ name: '', date: '' });
    setShowAddForm(false);
  }

  function removeCustomHoliday(idx: number) {
    const updated = [...data];
    updated.splice(idx, 1);
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        {country
          ? 'Holidays loaded automatically for your country. Toggle or add custom ones.'
          : 'Select a country in Company Setup to auto-load holidays, or add them manually.'}
      </p>

      {fetchingHolidays && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-primary">Fetching holidays for {country}...</span>
        </div>
      )}

      {fetchError && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-sm text-yellow-300">
          {fetchError} — You can still add holidays manually.
        </div>
      )}

      <div className="space-y-2 mt-4">
        {data.map((holiday, idx) => (
          <div key={`${holiday.name}-${holiday.date}`} className="flex items-center justify-between py-2 px-3 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={holiday.enabled}
                onChange={(e) => {
                  const updated = [...data];
                  updated[idx] = { ...holiday, enabled: e.target.checked };
                  onChange(updated);
                }}
                className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
                aria-label={`Enable ${holiday.name}`}
              />
              <span className="text-sm text-white">{holiday.name}</span>
              {holiday.custom && (
                <span className="text-[10px] uppercase tracking-wide font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Custom</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">{holiday.date}</span>
              {holiday.custom && (
                <button
                  type="button"
                  onClick={() => removeCustomHoliday(idx)}
                  className="text-red-400 hover:text-red-300 ml-1"
                  aria-label={`Remove ${holiday.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Holiday */}
      {showAddForm ? (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
          <p className="text-sm font-medium text-white">Add Custom Holiday</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Holiday name"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className={inputClass}
              aria-label="Holiday date"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addCustomHoliday}
              disabled={!newHoliday.name.trim() || !newHoliday.date}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewHoliday({ name: '', date: '' }); }}
              className="text-xs bg-white/10 hover:bg-white/15 text-white/80 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="text-xs bg-white/10 hover:bg-white/15 text-white/80 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Holiday
        </button>
      )}
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
      <p className="text-sm text-white/60">Configure notification preferences.</p>
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm text-white">{label}</span>
            <input
              type="checkbox"
              checked={data[key]}
              onChange={(e) => onChange({ ...data, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
              aria-label={label}
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
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring' as const, stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-20 h-20 mx-auto rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 20, delay: 0.5 }}
        >
          <Check className="w-10 h-10 text-primary" strokeWidth={3} />
        </motion.div>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-2xl font-bold gradient-text mt-4"
      >
        Setup Complete!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-white/60 mt-2 max-w-md mx-auto"
      >
        Your organization is now configured and ready to use.
      </motion.p>
      {joinCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, type: 'spring' as const, stiffness: 200, damping: 20 }}
          className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-left max-w-sm mx-auto shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
        >
          <p className="text-sm font-medium text-primary mb-1">Company Join Code</p>
          <p className="text-2xl font-mono font-bold text-primary tracking-widest">{joinCode}</p>
          <p className="text-xs text-primary/80 mt-1">Share this with your employees so they can sign up.</p>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-8"
      >
        <a
          href="/hr/dashboard"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Go to HR Dashboard
        </a>
      </motion.div>
    </div>
  );
}

// ─── Default data ────────────────────────────────────────────────────────────

// All leave types from the catalog are shown in onboarding so admins can
// choose which ones to enable for their company.
// None are pre-enabled — the admin must explicitly select types for their company,
// ensuring a fully config-driven setup.
const DEFAULT_LEAVE_TYPES: LeaveTypeEntry[] = LEAVE_TYPE_CATALOG.map((lt) => ({
  code: lt.code,
  name: lt.name,
  days: lt.defaultQuota,
  carryForward: lt.carryForward,
  enabled: false,
}));

// Default holidays use the current year. These are common Indian national
// holidays shown as suggestions — the admin can toggle or add their own.
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_HOLIDAYS: HolidayEntry[] = [
  { name: 'Republic Day', date: `${CURRENT_YEAR}-01-26`, enabled: true },
  { name: 'Holi', date: `${CURRENT_YEAR}-03-14`, enabled: true },
  { name: 'Independence Day', date: `${CURRENT_YEAR}-08-15`, enabled: true },
  { name: 'Gandhi Jayanti', date: `${CURRENT_YEAR}-10-02`, enabled: true },
  { name: 'Diwali', date: `${CURRENT_YEAR}-10-20`, enabled: true },
  { name: 'Christmas', date: `${CURRENT_YEAR}-12-25`, enabled: true },
];

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <TiltCard rotationIntensity={8}>
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent
                      ? 'bg-primary/20 border-2 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]'
                      : isCompleted
                        ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                        : 'bg-white/5 border border-white/10 text-white/40'
                  }`}
                  animate={isCurrent ? {
                    boxShadow: [
                      '0 0 15px rgba(var(--primary-rgb),0.4)',
                      '0 0 25px rgba(var(--primary-rgb),0.6)',
                      '0 0 15px rgba(var(--primary-rgb),0.4)',
                    ],
                  } : {}}
                  transition={isCurrent ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  } : {}}
                >
                  <StepIcon className="w-4 h-4" />
                </motion.div>
              </TiltCard>
              <span className={`text-[10px] font-medium hidden sm:block ${
                isCurrent ? 'text-primary' : isCompleted ? 'text-white/70' : 'text-white/30'
              }`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-[2px] w-12 mx-1 transition-colors duration-300 ${
                isCompleted ? 'bg-primary' : 'bg-white/10'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Per-step state
  const [companyData, setCompanyData] = useState<CompanyData>({
    companyName: '',
    industry: '',
    employeeCount: '',
    country: '',
    timezone: '',
    slaHours: 48,
    negativeBal: false,
    probationDays: 180,
    workStart: '09:00',
    workEnd: '18:00',
    gracePeriodMinutes: 15,
    halfDayHours: 4,
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeEntry[]>(DEFAULT_LEAVE_TYPES);
  const [constraintConfig, setConstraintConfig] = useState<ConstraintConfig>({
    minCoveragePercent: 60,
    maxConcurrent: 2,
    blackoutDates: [],
    autoApprove: false,
    autoApproveThreshold: 0.9,
  });
  const [holidays, setHolidays] = useState<HolidayEntry[]>(DEFAULT_HOLIDAYS);
  const [notifData, setNotifData] = useState<NotifData>({
    emailNotifications: true,
    managerAlerts: true,
    dailyDigest: true,
    slaAlerts: true,
  });

  // Check authentication and sync user on mount
  useEffect(() => {
    async function checkAuth() {
      // Check if user has a valid session via the session API
      let isAuthenticated = false;
      try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          isAuthenticated = sessionData.status === 'authenticated';
        }
      } catch {
        // ignore
      }

      if (!isAuthenticated) {
        // Not authenticated - redirect to sign-up
        router.replace('/sign-up');
        return;
      }

      const intent = (searchParams.get('intent') || 'employee').toLowerCase();
      const companyCode = searchParams.get('companyCode') || '';
      const firstName = searchParams.get('firstName') || '';
      const lastName = searchParams.get('lastName') || '';

      // Pre-fill company name from URL params (passed from sign-up)
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        setCompanyData((prev) => ({
          ...prev,
          companyName: prev.companyName || `${fullName}'s Company`,
        }));
      }

      // Sync user to check if they have a Company/Employee record
      const syncResult = await syncUser();

      if (!syncResult.success) {
        setError(syncResult.error || 'Failed to load profile');
        setLoading(false);
        return;
      }

      if (syncResult.needsSetup) {
        // Employee intent: auto-join company by code and redirect
        if (intent === 'employee') {
          if (!companyCode) {
            setError('Company code is required to join as an employee.');
            setLoading(false);
            return;
          }

          const joinResult = await joinCompanyAsEmployee(companyCode);
          if (!joinResult.success) {
            setError(joinResult.error || 'Failed to join company');
            setLoading(false);
            return;
          }

          router.replace('/employee/dashboard');
          return;
        }

        // Admin/HR intent: show Company Setup wizard
        // Pre-fill name if available from sync
        if ('userName' in syncResult && syncResult.userName) {
          setCompanyData(prev => ({
            ...prev,
            companyName: prev.companyName || `${syncResult.userName}'s Company`
          }));
        }
        setLoading(false);
        return;
      }

      // User already has Company/Employee record
      if (syncResult.company) {
        setCompanyId(syncResult.company.id);
        if (syncResult.company.joinCode) {
          setJoinCode(syncResult.company.joinCode);
        }

        // If onboarding already completed, redirect to dashboard
        if (syncResult.company.onboardingCompleted) {
          const role = syncResult.employee?.primaryRole ?? 'employee';
          if (role === 'admin' || role === 'hr') {
            router.replace('/hr/dashboard');
          } else if (role === 'manager' || role === 'team_lead' || role === 'director') {
            router.replace('/manager/dashboard');
          } else {
            router.replace('/employee/dashboard');
          }
          return;
        }

        // User has a company but onboarding not complete - skip to step 1 (Leave Types)
        setCurrentStep(1);
      }

      setLoading(false);
    }

    checkAuth();
  }, [router, searchParams]);

  const isLastContentStep = currentStep === STEPS.length - 2; // step before "Complete"
  const isCompletionStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  async function handleNext() {
    setError('');
    setSaving(true);

    try {
      // Step 0: Company Setup - Create Company + Employee via server action
      if (currentStep === 0 && !companyId) {
        if (!companyData.companyName.trim()) {
          setError('Please enter a company name');
          setSaving(false);
          return;
        }
        if (!companyData.timezone) {
          setError('Please select a timezone');
          setSaving(false);
          return;
        }

        const result = await createCompanyAndEmployee({
          companyName: companyData.companyName,
          industry: companyData.industry || undefined,
          size: companyData.employeeCount || undefined,
          timezone: companyData.timezone,
          slaHours: companyData.slaHours,
          negativeBalance: companyData.negativeBal,
          probationDays: companyData.probationDays,
          primaryRole: (searchParams.get('intent') || '').toLowerCase() === 'hr' ? 'hr' : 'admin',
        });

        if (!result.success) {
          setError(result.error || 'Failed to create company');
          setSaving(false);
          return;
        }

        if (result.company) {
          setCompanyId(result.company.id);
          setJoinCode(result.company.joinCode || '');
        }

        setCurrentStep(1);
        setSaving(false);
        return;
      }

      // Step 1: Leave Types - require at least one type selected
      if (currentStep === 1) {
        const enabledCount = leaveTypes.filter((lt) => lt.enabled).length;
        if (enabledCount === 0) {
          setError('Please select at least one leave type for your organization');
          setSaving(false);
          return;
        }
      }

      // Last step before Complete: Save all remaining settings
      if (isLastContentStep) {
        const payload = {
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
          constraint_config: {
            min_coverage_percent: constraintConfig.minCoveragePercent,
            max_concurrent: constraintConfig.maxConcurrent,
            blackout_dates: constraintConfig.blackoutDates.map((bd) => ({
              name: bd.name,
              start: bd.start,
              end: bd.end,
            })),
            auto_approve: constraintConfig.autoApprove,
            auto_approve_threshold: constraintConfig.autoApproveThreshold,
          },
          work_start: companyData.workStart,
          work_end: companyData.workEnd,
          grace_period_minutes: companyData.gracePeriodMinutes,
          half_day_hours: companyData.halfDayHours,
        };

        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to save onboarding data');
          setSaving(false);
          return;
        }

        if (json.join_code) setJoinCode(json.join_code);
        setCurrentStep((s) => s + 1);
        setSaving(false);
        return;
      }

      // Normal next step
      setCurrentStep((s) => s + 1);
    } finally {
      setSaving(false);
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 0:
        return <CompanySetupStep data={companyData} onChange={setCompanyData} />;
      case 1:
        return <LeaveTypesStep data={leaveTypes} onChange={setLeaveTypes} />;
      case 2:
        return <ConstraintRulesStep data={constraintConfig} onChange={setConstraintConfig} />;
      case 3:
        return <HolidaysStep data={holidays} onChange={setHolidays} country={companyData.country} />;
      case 4:
        return <NotificationsStep data={notifData} onChange={setNotifData} />;
      case 5:
        return <CompleteStep joinCode={joinCode} />;
      default:
        return null;
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <StaggerContainer className="w-full max-w-2xl">
        <FadeIn>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold gradient-text">Continuum</h1>
            <p className="text-white/60 mt-2">Organization Setup</p>
          </div>
        </FadeIn>

        {/* Step Indicators */}
        <FadeIn delay={0.1}>
          <StepIndicator currentStep={currentStep} />
        </FadeIn>

        {/* Step Content */}
        <FadeIn delay={0.2}>
          <GlassPanel className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {!isCompletionStep && (
                  <h2 className="text-lg font-semibold text-white mb-4">{STEPS[currentStep].label}</h2>
                )}

                {error && (
                  <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {renderStepContent()}

                {!isCompletionStep && (
                  <div className="flex justify-between mt-8 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCurrentStep((s) => s - 1)}
                      disabled={isFirstStep || saving}
                      className="border border-white/20 text-white/80 rounded-xl px-6 py-2.5 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={saving}
                      className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 font-semibold hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : isLastContentStep ? 'Finish Setup' : 'Next →'}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </GlassPanel>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}
