'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import type { CompanyProfile, ValidationError } from '@/lib/onboarding/types';
import {
  INDIAN_STATES,
  INDUSTRIES,
  COMPANY_SIZES,
  FISCAL_YEAR_MONTHS,
  INDIAN_TIMEZONES,
} from '@/lib/onboarding/constants';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';

interface Step1CompanyProps {
  initialData?: Partial<CompanyProfile>;
  onSave: (data: CompanyProfile) => Promise<void>;
  onNext: () => void;
  isLoading?: boolean;
}

const initialFormState: CompanyProfile = {
  companyName: '',
  industry: '',
  state: '',
  city: '',
  pincode: '',
  address: '',
  timezone: 'Asia/Kolkata',
  companySize: '11-50',
  fiscalYearStart: 'april',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  gstin: '',
  pan: '',
  tan: '',
  registrationNumber: '',
  website: '',
};

export default function Step1Company({
  initialData,
  onSave,
  onNext,
  isLoading = false,
}: Step1CompanyProps) {
  const [formData, setFormData] = useState<CompanyProfile>({
    ...initialFormState,
    ...initialData,
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true; // Optional field
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  };

  const validatePAN = (pan: string): boolean => {
    if (!pan) return true; // Optional field
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validatePincode = (pincode: string): boolean => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  };

  const validateForm = useCallback((): ValidationError[] => {
    const newErrors: ValidationError[] = [];

    if (!formData.companyName.trim()) {
      newErrors.push({ field: 'companyName', message: 'Company name is required' });
    } else if (formData.companyName.length < 3) {
      newErrors.push({ field: 'companyName', message: 'Company name must be at least 3 characters' });
    }

    if (!formData.industry) {
      newErrors.push({ field: 'industry', message: 'Please select an industry' });
    }

    if (!formData.state) {
      newErrors.push({ field: 'state', message: 'Please select a state' });
    }

    if (!formData.city.trim()) {
      newErrors.push({ field: 'city', message: 'City is required' });
    }

    if (!formData.pincode) {
      newErrors.push({ field: 'pincode', message: 'Pincode is required' });
    } else if (!validatePincode(formData.pincode)) {
      newErrors.push({ field: 'pincode', message: 'Please enter a valid 6-digit pincode' });
    }

    if (!formData.address.trim()) {
      newErrors.push({ field: 'address', message: 'Address is required' });
    }

    if (!formData.primaryContactName.trim()) {
      newErrors.push({ field: 'primaryContactName', message: 'Primary contact name is required' });
    }

    if (!formData.primaryContactEmail) {
      newErrors.push({ field: 'primaryContactEmail', message: 'Primary contact email is required' });
    } else if (!validateEmail(formData.primaryContactEmail)) {
      newErrors.push({ field: 'primaryContactEmail', message: 'Please enter a valid email address' });
    }

    if (!formData.primaryContactPhone) {
      newErrors.push({ field: 'primaryContactPhone', message: 'Primary contact phone is required' });
    } else if (!validatePhone(formData.primaryContactPhone)) {
      newErrors.push({ field: 'primaryContactPhone', message: 'Please enter a valid 10-digit mobile number' });
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.push({ field: 'gstin', message: 'Please enter a valid GSTIN' });
    }

    if (formData.pan && !validatePAN(formData.pan)) {
      newErrors.push({ field: 'pan', message: 'Please enter a valid PAN' });
    }

    return newErrors;
  }, [formData]);

  // Auto-save functionality
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (touched.size > 0 && errors.length === 0) {
        setAutoSaveStatus('saving');
        try {
          await onSave(formData);
          setAutoSaveStatus('saved');
          setLastSaved(new Date());
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch {
          setAutoSaveStatus('error');
        }
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [formData, touched, errors.length, onSave]);

  // Validate on change
  useEffect(() => {
    if (touched.size > 0) {
      const newErrors = validateForm();
      setErrors(newErrors);
    }
  }, [formData, touched, validateForm]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => new Set(prev).add(name));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => new Set(prev).add(name));
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find((e) => e.field === fieldName)?.message;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return touched.has(fieldName) && errors.some((e) => e.field === fieldName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all fields
    const allFields = Object.keys(formData);
    setTouched(new Set(allFields));

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      setIsSaving(true);
      try {
        await onSave(formData);
        onNext();
      } catch {
        setErrors([{ field: 'form', message: 'Failed to save. Please try again.' }]);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const inputClassName = (fieldName: string) => `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    bg-card backdrop-blur-sm
    ${
      hasFieldError(fieldName)
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-border focus:border-primary/50 focus:ring-primary/20'
    }
    focus:outline-none focus:ring-2
    text-foreground placeholder-white/40
  `;

  const labelClassName = 'block text-sm font-medium text-foreground/80 mb-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Company Profile</h2>
        </div>
        <p className="text-muted-foreground">
          Let&apos;s start by setting up your company details. This information will be used across
          the platform.
        </p>
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center justify-end gap-2 mb-4 h-6">
        {autoSaveStatus === 'saving' && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {autoSaveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Saved</span>
          </div>
        )}
        {autoSaveStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to save</span>
          </div>
        )}
        {lastSaved && autoSaveStatus === 'idle' && (
          <span className="text-muted-foreground text-sm">
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Information */}
        <div className="p-6 rounded-xl bg-card border border-border backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label htmlFor="companyName" className={labelClassName}>
                Company Name <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your company name"
                className={inputClassName('companyName')}
              />
              {hasFieldError('companyName') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('companyName')}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className={labelClassName}>
                Industry <span className="text-red-400">*</span>
              </label>
              <Select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClassName('industry')}
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.code} value={ind.code}>
                    {ind.name}
                  </option>
                ))}
              </Select>
              {hasFieldError('industry') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('industry')}</p>
              )}
            </div>

            {/* Company Size */}
            <div>
              <label htmlFor="companySize" className={labelClassName}>
                <Users className="w-4 h-4 inline mr-1" />
                Company Size <span className="text-red-400">*</span>
              </label>
              <Select
                id="companySize"
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClassName('companySize')}
              >
                {COMPANY_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Fiscal Year Start */}
            <div>
              <label htmlFor="fiscalYearStart" className={labelClassName}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Fiscal Year Start <span className="text-red-400">*</span>
              </label>
              <Select
                id="fiscalYearStart"
                name="fiscalYearStart"
                value={formData.fiscalYearStart}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClassName('fiscalYearStart')}
              >
                {FISCAL_YEAR_MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className={labelClassName}>
                <Globe className="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <Select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClassName('timezone')}
              >
                {INDIAN_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="p-6 rounded-xl bg-card border border-border backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Registered Address
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className={labelClassName}>
                Street Address <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={3}
                placeholder="Enter complete address"
                className={inputClassName('address')}
              />
              {hasFieldError('address') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('address')}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className={labelClassName}>
                City <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter city"
                className={inputClassName('city')}
              />
              {hasFieldError('city') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('city')}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className={labelClassName}>
                State <span className="text-red-400">*</span>
              </label>
              <Select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClassName('state')}
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </Select>
              {hasFieldError('state') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('state')}</p>
              )}
            </div>

            {/* Pincode */}
            <div>
              <label htmlFor="pincode" className={labelClassName}>
                Pincode <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="6-digit pincode"
                maxLength={6}
                className={inputClassName('pincode')}
              />
              {hasFieldError('pincode') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('pincode')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Primary Contact */}
        <div className="p-6 rounded-xl bg-card border border-border backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Primary Contact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Name */}
            <div className="md:col-span-2">
              <label htmlFor="primaryContactName" className={labelClassName}>
                Contact Person Name <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                id="primaryContactName"
                name="primaryContactName"
                value={formData.primaryContactName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Full name of the primary contact"
                className={inputClassName('primaryContactName')}
              />
              {hasFieldError('primaryContactName') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('primaryContactName')}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="primaryContactEmail" className={labelClassName}>
                <Mail className="w-4 h-4 inline mr-1" />
                Email <span className="text-red-400">*</span>
              </label>
              <Input
                type="email"
                id="primaryContactEmail"
                name="primaryContactEmail"
                value={formData.primaryContactEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="email@company.com"
                className={inputClassName('primaryContactEmail')}
              />
              {hasFieldError('primaryContactEmail') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('primaryContactEmail')}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="primaryContactPhone" className={labelClassName}>
                <Phone className="w-4 h-4 inline mr-1" />
                Phone <span className="text-red-400">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                  +91
                </span>
                <Input
                  type="tel"
                  id="primaryContactPhone"
                  name="primaryContactPhone"
                  value={formData.primaryContactPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={`${inputClassName('primaryContactPhone')} rounded-l-none`}
                />
              </div>
              {hasFieldError('primaryContactPhone') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('primaryContactPhone')}</p>
              )}
            </div>

            {/* Website */}
            <div className="md:col-span-2">
              <label htmlFor="website" className={labelClassName}>
                <Globe className="w-4 h-4 inline mr-1" />
                Website (Optional)
              </label>
              <Input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="https://www.company.com"
                className={inputClassName('website')}
              />
            </div>
          </div>
        </div>

        {/* Statutory Information */}
        <div className="p-6 rounded-xl bg-card border border-border backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Statutory Information (Optional)
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            These details are optional but recommended for payroll and compliance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GSTIN */}
            <div>
              <label htmlFor="gstin" className={labelClassName}>
                GSTIN
              </label>
              <Input
                type="text"
                id="gstin"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className={`${inputClassName('gstin')} uppercase`}
              />
              {hasFieldError('gstin') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('gstin')}</p>
              )}
            </div>

            {/* PAN */}
            <div>
              <label htmlFor="pan" className={labelClassName}>
                Company PAN
              </label>
              <Input
                type="text"
                id="pan"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="AAAAA0000A"
                maxLength={10}
                className={`${inputClassName('pan')} uppercase`}
              />
              {hasFieldError('pan') && (
                <p className="mt-1 text-sm text-red-400">{getFieldError('pan')}</p>
              )}
            </div>

            {/* TAN */}
            <div>
              <label htmlFor="tan" className={labelClassName}>
                TAN
              </label>
              <Input
                type="text"
                id="tan"
                name="tan"
                value={formData.tan}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="AAAA00000A"
                maxLength={10}
                className={`${inputClassName('tan')} uppercase`}
              />
            </div>

            {/* Registration Number */}
            <div>
              <label htmlFor="registrationNumber" className={labelClassName}>
                Company Registration Number
              </label>
              <Input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="CIN/LLPIN/Registration Number"
                className={inputClassName('registrationNumber')}
              />
            </div>
          </div>
        </div>

        {/* Form Error */}
        {errors.some((e) => e.field === 'form') && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.find((e) => e.field === 'form')?.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="submit"
            disabled={isSaving || isLoading}
            className="
              px-8 py-3 rounded-lg font-medium
              bg-primary hover:bg-primary/90
              text-foreground
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
