import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
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
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground mt-2">Real-time status of Continuum services</p>
        </div>

        {/* Overall Status */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3">
              <div className={`w-4 h-4 rounded-full ${allOperational ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <p className="text-lg font-semibold text-foreground">
                {allOperational ? 'All Systems Operational' : 'Partial System Degradation'}
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Overall uptime: <span className="font-medium text-foreground">99.94%</span> over the last 90 days
            </p>
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {SERVICES.map((service) => (
                <div key={service.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">Latency: {service.latency}</span>
                    <span className="text-xs text-muted-foreground">Uptime: {service.uptime}</span>
                    <Badge variant={STATUS_BADGE_MAP[service.status]}>{service.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {RECENT_INCIDENTS.map((incident) => (
                <div key={incident.title} className="border-l-2 border-border pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-medium text-foreground">{incident.title}</p>
                    <Badge variant={INCIDENT_BADGE_MAP[incident.status]}>{incident.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{incident.date}</p>
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
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
