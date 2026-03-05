import Link from 'next/link';

const FEATURES = [
  { title: 'Config-Driven', description: 'Define leave policies, rules, and workflows through configuration — no code changes needed.', icon: '⚙️' },
  { title: 'Multi-Tenant', description: 'Serve multiple organizations from a single deployment with complete data isolation.', icon: '🏢' },
  { title: 'India-Compliant', description: 'Built-in support for Indian labor laws, state holidays, and statutory leave types.', icon: '🇮🇳' },
  { title: 'AI-Powered', description: 'Smart suggestions for leave planning, anomaly detection, and workforce analytics.', icon: '🤖' },
];

const PRICING_PLANS = [
  { name: 'Free', price: '₹0', period: 'forever', description: 'For small teams getting started', features: ['Up to 10 employees', 'Basic leave types', 'Email notifications', 'Standard reports'], cta: 'Get Started', highlighted: false },
  { name: 'Starter', price: '₹2,499', period: '/month', description: 'For growing teams', features: ['Up to 50 employees', 'Custom leave types', 'Slack & Teams integration', 'Advanced analytics', 'Priority support'], cta: 'Start Free Trial', highlighted: false },
  { name: 'Growth', price: '₹5,999', period: '/month', description: 'For mid-size companies', features: ['Up to 500 employees', 'Multi-location support', 'Constraint engine', 'Payroll integration', 'API access', 'SLA guarantees'], cta: 'Start Free Trial', highlighted: true },
  { name: 'Enterprise', price: '₹14,999', period: '/month', description: 'For large organizations', features: ['Unlimited employees', 'Multi-tenant setup', 'Custom workflows', 'Dedicated support', 'On-premise option', 'SSO & SCIM', 'Audit logs'], cta: 'Contact Sales', highlighted: false },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-white">Continuum</span>
          <div className="flex items-center gap-6">
            <Link href="/status" className="text-sm text-slate-300 hover:text-white transition-colors">Status</Link>
            <Link href="/support" className="text-sm text-slate-300 hover:text-white transition-colors">Support</Link>
            <Link href="/sign-in" className="text-sm text-slate-300 hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-medium text-blue-300">🚀 Now with AI-powered leave planning</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Enterprise Leave Management<br />
            <span className="text-blue-400">Made Simple</span>
          </h1>
          <p className="text-xl text-blue-200 mb-4 max-w-2xl mx-auto">
            Config-driven, multi-tenant, India-compliant HR platform that scales with your organization.
          </p>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
            From 10 employees to 10,000 — manage leave policies, approvals, and compliance effortlessly.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
            <Link href="/status" className="border border-slate-600 text-slate-300 px-8 py-3 rounded-lg text-base font-medium hover:bg-slate-800 transition-colors">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Built for Indian Enterprises</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Everything you need to manage employee leave at scale, with compliance built in.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all bg-card">
                <span className="text-4xl">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-foreground mt-4">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-3">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 ring-offset-background'
                    : 'bg-card border border-border'
                }`}
              >
                <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <div className="mt-3">
                  <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-muted-foreground'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${plan.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`text-sm flex items-center gap-2 ${plan.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      <span className={plan.highlighted ? 'text-blue-200' : 'text-green-500'}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full mt-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to streamline your leave management?</h2>
          <p className="text-slate-400 mb-8">Join hundreds of Indian companies already using Continuum.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
            <Link href="/sign-in" className="border border-slate-600 text-slate-300 px-8 py-3 rounded-lg text-base font-medium hover:bg-slate-800 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12">
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
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Continuum. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
