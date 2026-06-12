import { LandingNav, LandingHero, LandingFeatures, LandingPricing, LandingFooter } from '@/components/marketing/landing-bento';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="ambient-glow" aria-hidden />
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </main>
  );
}
