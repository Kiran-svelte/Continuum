import Link from 'next/link';
import { ArrowLeft, Briefcase, Rocket } from 'lucide-react';
import { AmbientBackground, FadeIn } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';

const ROLES = [
  'Senior Full-Stack Engineer',
  'Product Designer (B2B SaaS)',
  'Developer Experience Engineer',
];

export default function CareersView() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AmbientBackground />

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10 space-y-8">
        <FadeIn direction="up">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mt-4">Careers at Continuum</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            We are building high-trust HR infrastructure with product quality that teams genuinely enjoy using.
          </p>
        </FadeIn>

        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Rocket className="w-5 h-5" />
            <span className="font-semibold">Open Roles</span>
          </div>
          <ul className="space-y-2">
            {ROLES.map((role) => (
              <li key={role} className="flex items-center gap-2 text-sm text-foreground">
                <Briefcase className="w-4 h-4 text-violet-600" />
                {role}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground mt-5">
            To apply, share your profile and relevant work samples at careers@continuum.app.
          </p>
        </GlassPanel>
      </div>
    </main>
  );
}
