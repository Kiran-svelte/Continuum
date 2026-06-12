import { LandingNav, LandingHero, LandingFeatures, LandingExperience, LandingFooter } from '@/components/marketing/landing-bento';

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--background)]">
      <div className="ambient-glow" aria-hidden />
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingExperience />
      <LandingFooter />
    </main>
  );
}
