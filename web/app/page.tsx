import Link from 'next/link';
import { Settings, Building2, Scale, Brain, Rocket, Check, ArrowRight, Zap, Shield, Key } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FadeIn, StaggerContainer } from '@/components/motion/fade-in';
import { TiltCard } from '@/components/motion/tilt-card';

const FEATURES: { title: string; description: string; icon: LucideIcon }[] = [
  { title: 'Config-Driven', description: 'Define leave policies, rules, and workflows through configuration — no code changes needed.', icon: Settings },
  { title: 'Multi-Tenant', description: 'Serve multiple organizations from a single deployment with complete data isolation.', icon: Building2 },
  { title: 'India-Compliant', description: 'Built-in support for Indian labor laws, state holidays, and statutory leave types.', icon: Scale },
  { title: 'AI-Powered', description: 'Smart suggestions for leave planning, anomaly detection, and workforce analytics.', icon: Brain },
];

const PRICING_PLANS = [
  { name: 'Free', price: '₹0', period: 'forever', description: 'For small teams getting started', features: ['Up to 10 employees', 'Basic leave types', 'Email notifications', 'Standard reports'], cta: 'Get Started', highlighted: false },
  { name: 'Starter', price: '₹2,499', period: '/month', description: 'For growing teams', features: ['Up to 50 employees', 'Custom leave types', 'Slack & Teams integration', 'Advanced analytics', 'Priority support'], cta: 'Start Free Trial', highlighted: false },
  { name: 'Growth', price: '₹5,999', period: '/month', description: 'For mid-size companies', features: ['Up to 500 employees', 'Multi-location support', 'Constraint engine', 'Payroll integration', 'API access', 'SLA guarantees'], cta: 'Start Free Trial', highlighted: true },
  { name: 'Enterprise', price: '₹14,999', period: '/month', description: 'For large organizations', features: ['Unlimited employees', 'Multi-tenant setup', 'Custom workflows', 'Dedicated support', 'On-premise option', 'SSO & SCIM', 'Audit logs'], cta: 'Contact Sales', highlighted: false },
];

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed w-full backdrop-blur-xl border-b border-white/10 bg-black/50 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary animate-gradient">
              Continuum
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/status" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Status</Link>
            <Link href="/support" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Support</Link>
            <Link href="/sign-in" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transform hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[90vh]">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        
        <StaggerContainer className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <FadeIn direction="up">
            <div className="inline-flex items-center gap-2 glass-panel border border-primary/30 rounded-full px-4 py-1.5 mb-8 shadow-[0_0_30px_rgba(0,255,255,0.15)]">
              <Rocket className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Now with AI-powered leave planning</span>
            </div>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
              Enterprise HR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient">
                Reimagined.
              </span>
            </h1>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.2}>
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
              Config-driven, multi-tenant, India-compliant platform with <strong className="text-white">3D motion tracking</strong>, glassmorphism, and enterprise-grade security.
            </p>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/sign-up" className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_40px_rgba(0,255,255,0.4)] hover:shadow-[0_0_60px_rgba(0,255,255,0.6)] transform hover:-translate-y-1 flex items-center gap-2 justify-center">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/status" className="w-full sm:w-auto glass-panel border border-white/20 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 justify-center">
                View System Status
              </Link>
            </div>
          </FadeIn>
        </StaggerContainer>
      </section>

      {/* Features Section */}
      <section className="relative py-32 z-10">
        <StaggerContainer className="max-w-7xl mx-auto px-6">
          <FadeIn direction="up" className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Designed for the Future</h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Everything you need to manage employee leave at scale, wrapped in a beautiful, highly responsive UI.
            </p>
          </FadeIn>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={feature.title} direction="up" delay={0.1 * index} className="h-full">
                  <TiltCard className="h-full">
                    <div className="h-full p-8 rounded-2xl glass-panel border border-white/10 hover:border-primary/50 transition-colors flex flex-col">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-inner">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-white/60 leading-relaxed flex-grow">{feature.description}</p>
                    </div>
                  </TiltCard>
                </FadeIn>
              );
            })}
          </div>
        </StaggerContainer>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <StaggerContainer className="relative max-w-7xl mx-auto px-6">
          <FadeIn direction="up" className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">Start free. Scale magically with our enterprise platform.</p>
          </FadeIn>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <FadeIn key={plan.name} direction="up" delay={0.1 * index} className="h-full">
                <TiltCard rotationIntensity={10} className="h-full">
                  <div
                    className={`h-full rounded-3xl p-8 flex flex-col relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
                      plan.highlighted
                        ? 'bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/50 shadow-[0_0_40px_rgba(0,255,255,0.2)]'
                        : 'glass-panel border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/50 text-primary text-xs font-bold tracking-wider uppercase">
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <h3 className={`text-2xl font-black mb-2 ${plan.highlighted ? 'text-primary' : 'text-white'}`}>
                      {plan.name}
                    </h3>
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white">{plan.price}</span>
                      <span className="text-white/60 font-medium text-lg">{plan.period}</span>
                    </div>
                    <p className="text-white/60 font-medium mb-8 leading-relaxed">
                      {plan.description}
                    </p>
                    <ul className="mb-10 space-y-4 flex-grow">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className={`mt-1 p-1 rounded-full ${plan.highlighted ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-white font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`w-full py-4 rounded-xl text-base font-bold transition-all shadow-lg transform hover:-translate-y-0.5 ${
                        plan.highlighted
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)]'
                          : 'glass-panel text-white border border-white/20 hover:bg-white/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </TiltCard>
              </FadeIn>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        <FadeIn direction="up">
          <div className="max-w-5xl mx-auto px-6 text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-primary/20 blur-[100px] rounded-full -z-10" />
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8">Ready to stream your workflow?</h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto font-medium">Join hundreds of cutting-edge Indian companies already using Continuum to automate their HR.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/sign-up" className="w-full sm:w-auto bg-primary text-primary-foreground px-10 py-5 rounded-full text-xl font-bold hover:bg-primary/90 transition-all shadow-[0_0_40px_rgba(0,255,255,0.4)] hover:shadow-[0_0_60px_rgba(0,255,255,0.6)] transform hover:-translate-y-1 flex items-center gap-2 justify-center">
                Get Started for Free <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="bg-black/60 backdrop-blur-xl border-t border-white/10 text-white/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">System Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Continuum. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
