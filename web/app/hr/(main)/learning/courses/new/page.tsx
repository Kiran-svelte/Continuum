'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/input';

export default function NewCoursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    contentType: 'document',
    contentUrl: '',
    durationMinutes: '',
    isMandatory: false,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          category: form.category || undefined,
          contentType: form.contentType,
          contentUrl: form.contentUrl || undefined,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
          isMandatory: form.isMandatory,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error?.message || 'Could not create course');
      }

      router.push('/hr/learning');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create course');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <Link href="/hr/learning" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Learning
      </Link>

      <PageHeader
        title="New Course"
        description="Create a draft course for the learning library"
        icon={<BookOpen className="w-6 h-6" />}
      />

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}

        <Input
          label="Course title"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <Select
            label="Content type"
            value={form.contentType}
            onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value }))}
          >
            <option value="document">Document</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="pptx">Slides</option>
            <option value="link">Link</option>
            <option value="zip">Bundle</option>
          </Select>
          <Input
            label="Content URL"
            value={form.contentUrl}
            onChange={(event) => setForm((current) => ({ ...current, contentUrl: event.target.value }))}
          />
          <Input
            label="Duration minutes"
            type="number"
            min={0}
            value={form.durationMinutes}
            onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
          />
        </div>
        <Checkbox
          label="Mandatory course"
          checked={form.isMandatory}
          onChange={(event) => setForm((current) => ({ ...current, isMandatory: event.target.checked }))}
        />

        <div className="flex justify-end gap-3">
          <Link href="/hr/learning" className="btn btn-secondary">Cancel</Link>
          <Button type="submit" loading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            Create Course
          </Button>
        </div>
      </form>
    </div>
  );
}
