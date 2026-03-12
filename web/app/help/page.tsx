'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, StaggerContainer, TiltCard, ScrollReveal } from '@/components/motion';
import { AmbientBackground } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  PlayCircle,
  Users,
  Settings,
  Calendar,
  CheckCircle,
  Clock,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Search
} from 'lucide-react';
import { StartTutorialButton, employeeTutorial, managerTutorial, hrTutorial } from '@/components/tutorial';

const HELP_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    articles: [
      { title: 'Creating your account', duration: '3 min read' },
      { title: 'Navigating the dashboard', duration: '5 min read' },
      { title: 'Setting up your profile', duration: '2 min read' },
      { title: 'Understanding your role', duration: '4 min read' },
    ],
  },
  {
    id: 'leave-management',
    title: 'Leave Management',
    icon: Calendar,
    articles: [
      { title: 'Applying for leave', duration: '3 min read' },
      { title: 'Types of leave explained', duration: '5 min read' },
      { title: 'Checking your leave balance', duration: '2 min read' },
      { title: 'Cancelling a leave request', duration: '2 min read' },
      { title: 'Understanding approval workflow', duration: '4 min read' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: Users,
    articles: [
      { title: 'Updating your personal information', duration: '2 min read' },
      { title: 'Changing your password', duration: '2 min read' },
      { title: 'Managing notification preferences', duration: '3 min read' },
      { title: 'Setting your theme preference', duration: '1 min read' },
    ],
  },
  {
    id: 'hr-admin',
    title: 'HR Administration',
    icon: Settings,
    articles: [
      { title: 'Adding employees to your organization', duration: '4 min read' },
      { title: 'Configuring leave policies', duration: '6 min read' },
      { title: 'Setting up approval workflows', duration: '5 min read' },
      { title: 'Managing leave balances', duration: '3 min read' },
      { title: 'Generating reports', duration: '4 min read' },
      { title: 'Configuring company settings', duration: '5 min read' },
    ],
  },
  {
    id: 'manager',
    title: 'For Managers',
    icon: CheckCircle,
    articles: [
      { title: 'Approving leave requests', duration: '3 min read' },
      { title: 'Viewing team availability', duration: '2 min read' },
      { title: 'Managing team attendance', duration: '3 min read' },
      { title: 'Team reports and analytics', duration: '4 min read' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    articles: [
      { title: 'Understanding notification types', duration: '2 min read' },
      { title: 'Email notifications setup', duration: '2 min read' },
      { title: 'Managing notification preferences', duration: '2 min read' },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    articles: [
      { title: 'Two-factor authentication', duration: '3 min read' },
      { title: 'Password best practices', duration: '2 min read' },
      { title: 'Understanding data privacy', duration: '4 min read' },
      { title: 'Audit logs explained', duration: '3 min read' },
    ],
  },
];

const VIDEO_TUTORIALS = [
  {
    title: 'Quick Start Guide',
    duration: '5:23',
    description: 'Learn the basics of using Continuum in 5 minutes',
    thumbnail: '/thumbnails/quick-start.png',
  },
  {
    title: 'Applying for Leave',
    duration: '3:15',
    description: 'Step-by-step guide to submitting leave requests',
    thumbnail: '/thumbnails/apply-leave.png',
  },
  {
    title: 'HR Admin Overview',
    duration: '8:42',
    description: 'Complete walkthrough of HR administration features',
    thumbnail: '/thumbnails/hr-admin.png',
  },
  {
    title: 'Manager Dashboard',
    duration: '4:30',
    description: 'How to manage your team effectively',
    thumbnail: '/thumbnails/manager.png',
  },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filteredSections = HELP_SECTIONS.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.articles.some((article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      <AmbientBackground />
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Continuum
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/support" className="text-sm text-white/60 hover:text-white transition-colors">
              Contact Support
            </Link>
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-16">
        <FadeIn>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Help Center</h1>
          <p className="text-xl text-white/60 mb-8">
            Everything you need to know about using Continuum
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm text-white border border-white/10 placeholder:text-white/40 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] focus:outline-none"
            />
          </div>
        </div>
        </FadeIn>
      </section>

      {/* Video Tutorials */}
      <ScrollReveal>
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Video Tutorials</h2>
            <p className="text-white/60 mt-1">Watch and learn at your own pace</p>
          </div>
          <Button variant="outline" className="gap-2">
            <PlayCircle className="w-4 h-4" />
            View All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {VIDEO_TUTORIALS.map((video) => (
            <TiltCard key={video.title}>
            <GlassPanel className="overflow-hidden cursor-pointer group">
              <div className="aspect-video bg-white/5 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1">{video.title}</h3>
                <p className="text-sm text-white/60">{video.description}</p>
              </div>
            </GlassPanel>
            </TiltCard>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* Help Articles */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-white mb-8">Browse by Topic</h2>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSections.map((section) => (
            <FadeIn key={section.id}>
            <TiltCard>
            <GlassPanel>
              <div id={section.id}>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                </div>
                <p className="text-sm text-white/50 mt-1.5">{section.articles.length} articles</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {section.articles.slice(0, activeSection === section.id ? undefined : 3).map((article) => (
                    <li key={article.title}>
                      <button className="w-full text-left group flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors">
                        <span className="text-sm text-white/80 group-hover:text-primary transition-colors">
                          {article.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.duration}
                          </span>
                          <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {section.articles.length > 3 && (
                  <button
                    onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    {activeSection === section.id ? 'Show less' : `View all ${section.articles.length} articles`}
                  </button>
                )}
              </div>
              </div>
            </GlassPanel>
            </TiltCard>
            </FadeIn>
          ))}
        </StaggerContainer>

        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <p className="text-white/50">
              No articles found for &quot;{searchQuery}&quot;
            </p>
            <p className="text-sm text-white/50 mt-2">
              Try different keywords or <Link href="/support" className="text-primary hover:underline">contact support</Link>
            </p>
          </div>
        )}
      </section>

      {/* Interactive Tutorials */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Interactive Tutorials</h2>
            <p className="text-white/60">
              Learn by doing with our step-by-step guided tours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <TiltCard>
            <GlassPanel className="text-center">
              <div className="p-8">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Employee Tour</h3>
                <p className="text-sm text-white/60 mb-4">
                  Learn to manage your leave requests and profile
                </p>
                <StartTutorialButton tutorial={employeeTutorial} variant="outline" className="text-xs px-3 py-1.5" />
              </div>
            </GlassPanel>
            </TiltCard>

            <TiltCard>
            <GlassPanel className="text-center">
              <div className="p-8">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Manager Tour</h3>
                <p className="text-sm text-white/60 mb-4">
                  Discover how to manage your team effectively
                </p>
                <StartTutorialButton tutorial={managerTutorial} variant="outline" className="text-xs px-3 py-1.5" />
              </div>
            </GlassPanel>
            </TiltCard>

            <TiltCard>
            <GlassPanel className="text-center">
              <div className="p-8">
                <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">HR Admin Tour</h3>
                <p className="text-sm text-white/60 mb-4">
                  Master the HR administration features
                </p>
                <StartTutorialButton tutorial={hrTutorial} variant="outline" className="text-xs px-3 py-1.5" />
              </div>
            </GlassPanel>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Can&apos;t find what you&apos;re looking for?
        </h2>
        <p className="text-white/60 mb-8">
          Our support team is always happy to help
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/support">
            <Button className="gap-2">
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </Button>
          </Link>
          <Link href="/status">
            <Button variant="outline" className="gap-2">
              Check System Status
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-xl border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
            <Link href="/status" className="hover:text-white transition-colors">System Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
