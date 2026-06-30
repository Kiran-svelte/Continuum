'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';

export default function NewJobPostingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
    location: '',
    employmentType: 'full_time',
    salaryMin: '',
    salaryMax: '',
    closesAt: '',
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/job-postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          department: form.department || undefined,
          location: form.location || undefined,
          employmentType: form.employmentType,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
          closesAt: form.closesAt || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error?.message || 'Could not create job posting');
      }

      router.push('/hr/recruitment/postings');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create job posting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <Link href="/hr/recruitment" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Recruitment
      </Link>
      <PageHeader title="Post a Job" description="Create a new recruitment opening" icon={<Briefcase className="w-6 h-6" />} />
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
        <Input label="Job title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        <Textarea label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
          <Input label="Location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
          <Select label="Employment type" value={form.employmentType} onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))}>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
            <option value="freelance">Freelance</option>
          </Select>
          <Input label="Closes at" type="date" value={form.closesAt} onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))} />
          <Input label="Minimum salary" type="number" min={0} value={form.salaryMin} onChange={(event) => setForm((current) => ({ ...current, salaryMin: event.target.value }))} />
          <Input label="Maximum salary" type="number" min={0} value={form.salaryMax} onChange={(event) => setForm((current) => ({ ...current, salaryMax: event.target.value }))} />
        </div>
        <div className="flex justify-end gap-3">
          <Link href="/hr/recruitment" className="btn btn-secondary">Cancel</Link>
          <Button type="submit" loading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            Create Posting
          </Button>
        </div>
      </form>
    </div>
  );
}
