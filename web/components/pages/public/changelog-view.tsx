import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AmbientBackground, FadeIn } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';

const ENTRIES = [
  {
    version: 'v2.6.0',
    date: '2026-03-12',
    notes: ['Improved dashboard resilience with retry paths', 'Completed super-admin invite and credential mail flows', 'Fixed broken review and footer navigation actions'],
  },
  {
    version: 'v2.5.0',
    date: '2026-02-28',
    notes: ['Enhanced leave reporting exports', 'Refined role-based onboarding and policy wiring'],
  },
];

export default function ChangelogView() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AmbientBackground />

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10 space-y-8">
        <FadeIn direction="up">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mt-4">Changelog</h1>
          <p className="text-muted-foreground mt-3">A record of notable product and platform updates.</p>
        </FadeIn>

        <div className="space-y-4">
          {ENTRIES.map((entry) => (
            <GlassPanel key={entry.version} className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{entry.version}</h2>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {entry.notes.map((note) => (
                  <li key={note} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  );
}
