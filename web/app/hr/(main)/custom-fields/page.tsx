'use client';

/**
 * Custom Fields HR Page — RALPH-20260630-017
 *
 * HR admin view: manage custom field definitions for entities.
 *
 * @module app/hr/(main)/custom-fields/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidersHorizontal, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface CustomField {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

const ENTITY_TYPES = ['employee', 'leave', 'expense', 'recruitment'];

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('employee');

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setLoading(true);
      const r = await fetch(`/api/custom-fields?entity_type=${entityType}`, { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setFields(d.fields ?? []);
      setLoading(false);
    })();
  }, [entityType]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Custom Fields"
        description="Add custom data fields to HR entities"
        icon={<SlidersHorizontal className="w-6 h-6" />}
        action={<Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Field</Button>}
      />

      <div className="flex gap-2">
        {ENTITY_TYPES.map((et) => (
          <Button
            key={et}
            size="sm"
            variant={entityType === et ? 'primary' : 'outline'}
            onClick={() => setEntityType(et)}
            className="capitalize"
          >
            {et}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : fields.length === 0 ? (
        <div className="card p-12 text-center">
          <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No custom fields for {entityType} yet.</p>
          <Button size="sm" className="mt-4 gap-2"><Plus className="w-4 h-4" />Add First Field</Button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {fields.map((f) => (
            <div key={f.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{f.field_label}</p>
                  <Badge variant="outline">{f.field_type}</Badge>
                  {f.is_required && <Badge variant="warning">Required</Badge>}
                  {!f.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">field_name: {f.field_name} · order: {f.sort_order}</p>
              </div>
              <Button size="sm" variant="outline">Edit</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
