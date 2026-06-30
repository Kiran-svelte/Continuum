'use client';

/**
 * Employee Skills Page — RALPH-20260630-009
 *
 * Employee view: see and update own skill proficiencies.
 *
 * @module app/employee/(main)/skills/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Star } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface EmployeeSkill {
  skill: { id: string; name: string; category: string | null };
  proficiency: number;
}

function Stars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= level ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function EmployeeSkillsPage() {
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      const r = await fetch(`/api/skills?empId=${me.id}`, { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setSkills(d.employeeSkills ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped: Record<string, EmployeeSkill[]> = {};
  for (const s of skills) {
    const cat = s.skill.category ?? 'General';
    grouped[cat] = [...(grouped[cat] ?? []), s];
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="My Skills"
        description="Your skill proficiency profile"
        icon={<Brain className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : skills.length === 0 ? (
        <div className="card p-12 text-center">
          <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No skills assigned yet. Contact HR to get your skill profile set up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([cat, catSkills]) => (
            <div key={cat} className="card p-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
              <div className="divide-y divide-[var(--border)]">
                {catSkills.map(({ skill, proficiency }) => (
                  <div key={skill.id} className="py-3 flex items-center justify-between">
                    <span className="font-medium">{skill.name}</span>
                    <div className="flex items-center gap-3">
                      <Stars level={proficiency} />
                      <Badge variant="outline" className="w-8 text-center">{proficiency}/5</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
