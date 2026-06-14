import Link from 'next/link';
import { ArrowLeft, BookOpenText } from 'lucide-react';
import { AmbientBackground, FadeIn } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';

const POSTS = [
  {
    title: 'Designing Leave Workflows That Teams Actually Use',
    excerpt: 'A practical guide to reducing approval bottlenecks while keeping policy control strong.',
    date: 'March 2026',
  },
  {
    title: 'How Multi-Tenant HR Platforms Stay Fast at Scale',
    excerpt: 'Patterns for data isolation, performance, and operability in enterprise SaaS.',
    date: 'February 2026',
  },
  {
    title: 'From Static Rules to Smart Constraints',
    excerpt: 'Using confidence-based approvals to increase speed without losing trust.',
    date: 'January 2026',
  },
];

export default function BlogView() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AmbientBackground />

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10 space-y-8">
        <FadeIn direction="up">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mt-4">Continuum Blog</h1>
          <p className="text-muted-foreground mt-3">Product thinking, implementation notes, and scaling stories.</p>
        </FadeIn>

        <div className="space-y-4">
          {POSTS.map((post) => (
            <GlassPanel key={post.title} className="p-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <BookOpenText className="w-3.5 h-3.5" />
                {post.date}
              </div>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{post.excerpt}</p>
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  );
}
