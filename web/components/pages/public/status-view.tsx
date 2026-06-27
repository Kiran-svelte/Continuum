import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { checkHealth, getUptimeStats, type HealthStatus } from '@/lib/enterprise/health';

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

function toPublicStatus(status: HealthStatus): 'operational' | 'degraded' | 'outage' {
  if (status === 'healthy') return 'operational';
  if (status === 'degraded') return 'degraded';
  return 'outage';
}

export default async function StatusView() {
  const health = await checkHealth();
  const uptime = getUptimeStats();

  const services = [
    {
      name: 'Web Application',
      status: toPublicStatus(health.status),
      latency: `${Object.values(health.checks).map((check) => check.latency ?? 0).reduce((max, latency) => Math.max(max, latency), 0)}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
    {
      name: 'Constraint Engine',
      status: toPublicStatus(health.checks.constraintEngine?.status ?? 'degraded'),
      latency: `${health.checks.constraintEngine?.latency ?? 0}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
    {
      name: 'Database (PostgreSQL)',
      status: toPublicStatus(health.checks.database?.status ?? 'unhealthy'),
      latency: `${health.checks.database?.latency ?? 0}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
    {
      name: 'Redis Cache',
      status: toPublicStatus(health.checks.redis?.status ?? 'degraded'),
      latency: `${health.checks.redis?.latency ?? 0}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
    {
      name: 'Email Service',
      status: toPublicStatus(health.checks.email?.status ?? 'degraded'),
      latency: `${health.checks.email?.latency ?? 0}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
    {
      name: 'Upload Storage',
      status: toPublicStatus(health.checks.storage?.status ?? 'degraded'),
      latency: `${health.checks.storage?.latency ?? 0}ms`,
      uptime: `${uptime.uptimePercentage.toFixed(2)}%`,
    },
  ];

  const incidents = Object.entries(health.checks)
    .filter(([, check]) => check.status !== 'healthy')
    .map(([name, check]) => ({
      date: new Date(health.timestamp).toLocaleString(),
      title: `${name} ${check.status}`,
      status: check.status === 'unhealthy' ? 'investigating' : 'monitoring',
      description: check.message,
    }));

  const allOperational = services.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-[var(--muted)] text-foreground relative overflow-hidden">
      <AmbientBackground />

      {/* Navigation */}
      <nav className="bg-[var(--accent)] backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Continuum
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <FadeIn>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground">System Status</h1>
            <p className="text-muted-foreground mt-2">Real-time status of Continuum services</p>
          </div>
        </FadeIn>

        {/* Overall Status */}
        <FadeIn>
          <GlassPanel className="mb-8">
            <div className="py-6 px-6">
              <div className="flex items-center justify-center gap-3">
                <div className={`w-4 h-4 rounded-full ${allOperational ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'} animate-pulse`} />
                <p className="text-lg font-semibold text-foreground">
                  {allOperational ? 'All Systems Operational' : 'Partial System Degradation'}
                </p>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                Overall uptime: <span className="font-medium text-foreground">{uptime.uptimePercentage.toFixed(2)}%</span> since process start
              </p>
            </div>
          </GlassPanel>
        </FadeIn>

        {/* Service Status */}
        <GlassPanel className="mb-8">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-foreground">Service Status</h3>
          </div>
          <div className="p-6">
            <StaggerContainer className="space-y-4">
              {services.map((service) => (
                <FadeIn key={service.name}>
                  <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${service.status === 'operational' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : service.status === 'degraded' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                      <span className="text-sm font-medium text-foreground">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">Latency: {service.latency}</span>
                      <span className="text-xs text-muted-foreground">Uptime: {service.uptime}</span>
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
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-foreground">Recent Incidents</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {incidents.length === 0 && (
                <div className="text-sm text-muted-foreground">No active incidents. All monitored components are healthy.</div>
              )}
              {incidents.map((incident) => (
                <div key={incident.title} className="border-l-2 border-[var(--border)] pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-foreground">{incident.title}</p>
                    <Badge variant={INCIDENT_BADGE_MAP[incident.status]}>{incident.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{incident.date}</p>
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Footer */}
      <footer className="bg-[var(--accent)] backdrop-blur-xl border-t border-[var(--border)] py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
