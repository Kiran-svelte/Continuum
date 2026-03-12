'use client';

import Link from 'next/link';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, AmbientBackground, ScrollReveal } from '@/components/motion';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
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

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        <FadeIn direction="up">
          <GlassPanel className="p-8 sm:p-12">
            <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-white/50 mb-10">
              Last updated: March 12, 2026
            </p>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
                <p className="text-white/70 mb-4">
                  Continuum (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our leave management platform.
                </p>
                <p className="text-white/70">
                  By using Continuum, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.1 Personal Information</h3>
                <p className="text-white/70 mb-4">We collect information that you provide directly to us:</p>
                <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
                  <li>Name, email address, and contact information</li>
                  <li>Employment information (employee ID, department, role, manager)</li>
                  <li>Leave records and attendance data</li>
                  <li>Profile information and preferences</li>
                </ul>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.2 Automatically Collected Information</h3>
                <p className="text-white/70 mb-4">We automatically collect certain information when you use our service:</p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address and location data</li>
                  <li>Usage patterns and interaction data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
                <p className="text-white/70 mb-4">We use the collected information for various purposes:</p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li>To provide and maintain our service</li>
                  <li>To process leave requests and approvals</li>
                  <li>To send notifications about your account and requests</li>
                  <li>To generate reports and analytics for your organization</li>
                  <li>To improve our service and user experience</li>
                  <li>To comply with legal obligations</li>
                  <li>To detect and prevent fraud or abuse</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
                <p className="text-white/70 mb-4">We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li><strong className="text-white/90">Within your organization:</strong> With managers, HR, and authorized personnel for leave management purposes</li>
                  <li><strong className="text-white/90">Service providers:</strong> With third-party vendors who assist in providing our service</li>
                  <li><strong className="text-white/90">Legal compliance:</strong> When required by law or to protect our rights</li>
                  <li><strong className="text-white/90">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
                <p className="text-white/70 mt-4">
                  We do not sell your personal information to third parties.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
                <p className="text-white/70 mb-4">
                  We implement appropriate technical and organizational measures to protect your data:
                </p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and audits</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response procedures</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
                <p className="text-white/70">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce our agreements. When data is no longer needed, we securely delete or anonymize it.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
                <p className="text-white/70 mb-4">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent</li>
                </ul>
                <p className="text-white/70 mt-4">
                  To exercise these rights, contact us at privacy@continuum.app or through your HR administrator.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
                <p className="text-white/70">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
                <p className="text-white/70">
                  Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
                <p className="text-white/70">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Significant changes will be communicated via email or through the platform.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
                <p className="text-white/70 mb-4">
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <ul className="list-none text-white/70 space-y-2">
                  <li><strong className="text-white/90">Email:</strong> privacy@continuum.app</li>
                  <li><strong className="text-white/90">Support:</strong> <Link href="/support" className="text-primary hover:underline">continuum.app/support</Link></li>
                </ul>
              </section>
            </ScrollReveal>
          </GlassPanel>
        </FadeIn>
      </article>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-xl border-t border-white/10 py-8 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
