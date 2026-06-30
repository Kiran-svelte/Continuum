'use client';

/**
 * Skill Matrix Page — RALPH-20260630-009
 *
 * HR view: company-wide skill inventory and coverage.
 * Employee view: own skill profile.
 *
 * @module app/hr/(main)/skill-matrix/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { Star, Plus, Brain, Users } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

interface EmployeeSkill {
  id: string;
  proficiency: number;
  years_exp: number | null;
  last_assessed: string | null;
  Skill: { name: string; category: string | null };
}

function ProficiencyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= level ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function SkillMatrixPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mySkills, setMySkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [myEmpId, setMyEmpId] = useState('');

  const load = useCallback(async () => {
    try {
      const me = await ensureMe();
      if (!me) return;
      const perms = (me.permissions ?? []) as string[];
      setCanManage(perms.includes('employee.edit_any'));
      setMyEmpId(me.id ?? '');

      const [skillsRes, mySkillsRes] = await Promise.all([
        fetch('/api/skills', { credentials: 'include' }),
        fetch(`/api/skills?empId=${me.id}`, { credentials: 'include' }),
      ]);

      const skillsData = await skillsRes.json().catch(() => ({}));
      const mySkillsData = await mySkillsRes.json().catch(() => ({}));
      setSkills(skillsData.skills ?? []);
      setMySkills(mySkillsData.employeeSkills ?? []);
    } catch {
      toast.error('Failed to load skill matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, []);

  const grouped = mySkills.reduce<Record<string, EmployeeSkill[]>>((acc, s) => {
    const cat = s.Skill.category ?? 'General';
    acc[cat] = [...(acc[cat] ?? []), s];
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Skill Matrix"
        description="Track employee competencies and skill coverage"
        icon={<Brain className="w-6 h-6" />}
        action={
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Skill
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill Catalog */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Skill Catalog
                <Badge variant="outline">{skills.length}</Badge>
              </h3>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills defined yet.</p>
              ) : (
                <div className="space-y-1">
                  {skills.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="text-sm">{s.name}</span>
                      {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Skills */}
          <div className="lg:col-span-2">
            <div className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Skills
                <Badge variant="outline">{mySkills.length}</Badge>
              </h3>
              {mySkills.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No skills added yet.</p>
                  <Button size="sm" className="mt-3 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your Skills
                  </Button>
                </div>
              ) : (
                Object.entries(grouped).map(([cat, catSkills]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
                    <div className="space-y-2">
                      {catSkills.map((es) => (
                        <div key={es.id} className="flex items-center justify-between">
                          <span className="text-sm">{es.Skill.name}</span>
                          <div className="flex items-center gap-3">
                            <ProficiencyStars level={es.proficiency} />
                            {es.years_exp && (
                              <span className="text-xs text-muted-foreground">{es.years_exp}y</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
