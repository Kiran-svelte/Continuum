'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';

const SERVICES = [
  { name: 'Web Application', status: 'operational', latency: '45ms', uptime: '99.98%' },
  { name: 'Constraint Engine', status: 'operational', latency: '12ms', uptime: '99.95%' },
  { name: 'Database (PostgreSQL)', status: 'operational', latency: '3ms', uptime: '99.99%' },
  { name: 'Redis Cache', status: 'operational', latency: '1ms', uptime: '99.99%' },
  { name: 'Email Service', status: 'degraded', latency: '250ms', uptime: '98.50%' },
];

const RECENT_INCIDENTS = [
  { date: 'Jan 10, 2025', title: 'Email delivery delays', status: 'monitoring', description: 'Increased latency in email delivery pipeline. Investigating root cause.' },
  { date: 'Jan 5, 2025', title: 'Database maintenance', status: 'resolved', description: 'Scheduled maintenance window for PostgreSQL upgrade. Completed successfully.' },
  { date: 'Dec 28, 2024', title: 'API rate limiting issue', status: 'resolved', description: 'Temporary increase in API errors due to misconfigured rate limits. Fixed within 30 minutes.' },
];

const STATUS_BADGE_MAP: Record<string, 'success' | 'warning' | 'danger'> = {
  operational: 'success',
  degraded: 'warning',
  outage: 'danger',
};

const INCIDENT_BADGE_MAP: Record<string, 'warning' | 'success' | 'danger'> = {
  monitoring: 'warning',
  resolved: 'success',
  investigating: 'danger',
};

export default function StatusPage() {
  const allOperational = SERVICES.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AmbientBackground />

      {/* Navigation */}
      <nav className="bg-black/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Continuum
          </Link>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <FadeIn>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white">System Status</h1>
            <p className="text-white/60 mt-2">Real-time status of Continuum services</p>
          </div>
        </FadeIn>

        {/* Overall Status */}
        <FadeIn>
          <GlassPanel className="mb-8">
            <div className="py-6 px-6">
              <div className="flex items-center justify-center gap-3">
                <div className={`w-4 h-4 rounded-full ${allOperational ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'} animate-pulse`} />
                <p className="text-lg font-semibold text-white">
                  {allOperational ? 'All Systems Operational' : 'Partial System Degradation'}
                </p>
              </div>
              <p className="text-center text-sm text-white/60 mt-2">
                Overall uptime: <span className="font-medium text-white">99.94%</span> over the last 90 days
              </p>
            </div>
          </GlassPanel>
        </FadeIn>

        {/* Service Status */}
        <GlassPanel className="mb-8">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Service Status</h3>
          </div>
          <div className="p-6">
            <StaggerContainer className="space-y-4">
              {SERVICES.map((service) => (
                <FadeIn key={service.name}>
                  <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${service.status === 'operational' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : service.status === 'degraded' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                      <span className="text-sm font-medium text-white">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-white/50">Latency: {service.latency}</span>
                      <span className="text-xs text-white/50">Uptime: {service.uptime}</span>
                      <Badge variant={STATUS_BADGE_MAP[service.status]}>{service.status}</Badge>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </StaggerContainer>
          </div>
        </GlassPanel>

        {/* Recent Incidents */}
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Recent Incidents</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {RECENT_INCIDENTS.map((incident) => (
                <div key={incident.title} className="border-l-2 border-white/20 pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-white">{incident.title}</p>
                    <Badge variant={INCIDENT_BADGE_MAP[incident.status]}>{incident.status}</Badge>
                  </div>
                  <p className="text-xs text-white/50 mb-1">{incident.date}</p>
                  <p className="text-sm text-white/50">{incident.description}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-xl border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
