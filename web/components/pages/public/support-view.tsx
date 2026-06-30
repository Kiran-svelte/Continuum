'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, StaggerContainer, TiltCard, AmbientBackground } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MessageCircle, Phone, Search, ExternalLink, BookOpen, HelpCircle, FileText, Users, Settings } from 'lucide-react';

const SUPPORT_CATEGORIES = [
  {
    title: 'Getting Started',
    description: 'New to Continuum? Learn the basics',
    icon: BookOpen,
    href: '/help#getting-started',
  },
  {
    title: 'Leave Management',
    description: 'Submitting and managing leave requests',
    icon: FileText,
    href: '/help#leave-management',
  },
  {
    title: 'Account & Profile',
    description: 'Managing your account settings',
    icon: Users,
    href: '/help#account',
  },
  {
    title: 'HR Administration',
    description: 'For HR admins managing policies',
    icon: Settings,
    href: '/help#hr-admin',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I apply for leave?',
    answer: 'Navigate to your dashboard and click "Apply Leave". Select the leave type, dates, and provide any required details. Your manager will be notified automatically.',
  },
  {
    question: 'How long does approval take?',
    answer: 'Approval times depend on your organization\'s policies. Most requests are processed within 24-48 hours. Check your notifications for updates.',
  },
  {
    question: 'Can I cancel a leave request?',
    answer: 'Yes, you can cancel pending leave requests from your Leave History page. Approved leaves may require manager approval to cancel.',
  },
  {
    question: 'How do I view my leave balance?',
    answer: 'Your leave balance is displayed on your dashboard. You can see remaining days for each leave type along with a progress indicator.',
  },
  {
    question: 'What if I forgot my password?',
    answer: 'Click "Forgot Password" on the sign-in page. Enter your email address and follow the instructions sent to your inbox to reset your password.',
  },
];

export default function SupportView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const startChatRequest = () => {
    window.location.href = 'mailto:support@continuum.app?subject=Live%20chat%20request';
  };

  const filteredFaq = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AmbientBackground />

      {/* Header */}
      <header className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground relative z-10 backdrop-blur-sm">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Continuum
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/help" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
              Help Center
            </Link>
            <Link href="/sign-in" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </nav>

        <FadeIn>
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">How can we help you?</h1>
            <p className="text-xl opacity-90 mb-8">
              Search our help center or browse categories below
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] backdrop-blur-sm text-foreground border border-[var(--border)] placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.14)] focus:outline-none transition-all"
              />
            </div>
          </div>
        </FadeIn>
      </header>

      {/* Support Categories */}
      <section className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUPPORT_CATEGORIES.map((category) => (
            <FadeIn key={category.title}>
              <Link href={category.href}>
                <TiltCard>
                  <GlassPanel className="h-full cursor-pointer group">
                    <div className="p-6">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <category.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </GlassPanel>
                </TiltCard>
              </Link>
            </FadeIn>
          ))}
        </StaggerContainer>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {filteredFaq.map((item, index) => (
            <GlassPanel
              key={index}
              className={`overflow-hidden transition-all ${
                expandedFaq === index ? 'border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]' : ''
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full text-left"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-foreground">
                      {item.question}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedFaq === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </Button>
              <AnimatePresence>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-4">
                      <p className="text-muted-foreground">{item.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassPanel>
          ))}

          {filteredFaq.length === 0 && (
            <div className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No results found for &quot;{searchQuery}&quot;
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try different keywords or contact support
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/help">
            <Button variant="outline" className="gap-2">
              View All Articles
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            Still need help?
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Our support team is here to help you
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Email Support */}
            <TiltCard>
              <GlassPanel className="text-center">
                <div className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Email Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get help via email. We typically respond within 24 hours.
                  </p>
                  <a
                    href="mailto:support@continuum.app"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    support@continuum.app
                  </a>
                </div>
              </GlassPanel>
            </TiltCard>

            {/* Live Chat */}
            <TiltCard>
              <GlassPanel className="text-center">
                <div className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Live Chat</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chat with our support team during business hours.
                  </p>
                  <Button type="button" size="sm" className="gap-2" onClick={startChatRequest}>
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </Button>
                </div>
              </GlassPanel>
            </TiltCard>

            {/* Phone Support */}
            <TiltCard>
              <GlassPanel className="text-center">
                <div className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 rounded-full bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Phone Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    For enterprise customers with priority support.
                  </p>
                  <span className="text-sm text-muted-foreground">
                    Mon-Fri, 9am-6pm IST
                  </span>
                </div>
              </GlassPanel>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--accent)] backdrop-blur-xl border-t border-[var(--border)] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            <Link href="/status" className="hover:text-foreground transition-colors">System Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
