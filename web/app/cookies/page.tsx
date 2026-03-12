'use client';

import Link from 'next/link';
import { GlassPanel } from '@/components/glass-panel';
import { FadeIn, AmbientBackground, ScrollReveal } from '@/components/motion';

export default function CookiePolicyPage() {
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
            <h1 className="text-4xl font-bold text-white mb-2">Cookie Policy</h1>
            <p className="text-white/50 mb-10">
              Last updated: March 12, 2026
            </p>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">1. What Are Cookies?</h2>
                <p className="text-white/70 mb-4">
                  Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
                </p>
                <p className="text-white/70">
                  This Cookie Policy explains how Continuum uses cookies and similar technologies when you use our Service.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">2. Types of Cookies We Use</h2>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.1 Essential Cookies</h3>
                <p className="text-white/70 mb-4">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/80">Cookie Name</th>
                        <th className="text-left py-2 text-white/80">Purpose</th>
                        <th className="text-left py-2 text-white/80">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/60">
                      <tr className="border-b border-white/10">
                        <td className="py-2 font-mono text-xs">session_token</td>
                        <td className="py-2">Maintains user login session</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-2 font-mono text-xs">csrf_token</td>
                        <td className="py-2">Security protection against CSRF attacks</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">auth_state</td>
                        <td className="py-2">Authentication state management</td>
                        <td className="py-2">7 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.2 Preference Cookies</h3>
                <p className="text-white/70 mb-4">
                  These cookies remember your preferences and settings to enhance your experience.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/80">Cookie Name</th>
                        <th className="text-left py-2 text-white/80">Purpose</th>
                        <th className="text-left py-2 text-white/80">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/60">
                      <tr className="border-b border-white/10">
                        <td className="py-2 font-mono text-xs">continuum-theme</td>
                        <td className="py-2">Stores your theme preference (light/dark)</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">locale</td>
                        <td className="py-2">Stores language preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.3 Analytics Cookies</h3>
                <p className="text-white/70 mb-4">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/80">Cookie Name</th>
                        <th className="text-left py-2 text-white/80">Purpose</th>
                        <th className="text-left py-2 text-white/80">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/60">
                      <tr className="border-b border-white/10">
                        <td className="py-2 font-mono text-xs">_ga</td>
                        <td className="py-2">Google Analytics - distinguishes users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">_gid</td>
                        <td className="py-2">Google Analytics - distinguishes users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">2.4 Functional Cookies</h3>
                <p className="text-white/70">
                  These cookies enable enhanced functionality and personalization, such as remembering your tutorial progress or notification preferences.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">3. Third-Party Cookies</h2>
                <p className="text-white/70 mb-4">
                  Some cookies are placed by third-party services that appear on our pages. We use the following third-party services:
                </p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li><strong className="text-white/90">Google Analytics:</strong> For website traffic analysis</li>
                  <li><strong className="text-white/90">Supabase:</strong> For authentication services</li>
                  <li><strong className="text-white/90">Intercom:</strong> For customer support (if enabled)</li>
                </ul>
                <p className="text-white/70 mt-4">
                  These third parties may have their own privacy and cookie policies. We encourage you to review them.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">4. Managing Cookies</h2>
                <p className="text-white/70 mb-4">
                  You can control and manage cookies in several ways:
                </p>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">4.1 Browser Settings</h3>
                <p className="text-white/70 mb-4">
                  Most browsers allow you to refuse cookies or delete existing cookies. Here&apos;s how to manage cookies in popular browsers:
                </p>
                <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
                  <li><strong className="text-white/90">Chrome:</strong> Settings &rarr; Privacy and Security &rarr; Cookies</li>
                  <li><strong className="text-white/90">Firefox:</strong> Options &rarr; Privacy &amp; Security &rarr; Cookies</li>
                  <li><strong className="text-white/90">Safari:</strong> Preferences &rarr; Privacy &rarr; Cookies</li>
                  <li><strong className="text-white/90">Edge:</strong> Settings &rarr; Privacy, search, and services &rarr; Cookies</li>
                </ul>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                  Note: Disabling essential cookies may impact the functionality of our Service.
                </div>

                <h3 className="text-xl font-medium text-white/90 mt-6 mb-3">4.2 Cookie Preferences</h3>
                <p className="text-white/70">
                  You can update your cookie preferences at any time through the cookie consent banner or by contacting our support team.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">5. Similar Technologies</h2>
                <p className="text-white/70 mb-4">
                  In addition to cookies, we may use similar technologies:
                </p>
                <ul className="list-disc list-inside text-white/70 space-y-2">
                  <li><strong className="text-white/90">Local Storage:</strong> For storing preferences and session data in your browser</li>
                  <li><strong className="text-white/90">Session Storage:</strong> For temporary storage during your browsing session</li>
                  <li><strong className="text-white/90">Web Beacons:</strong> Small images that help us track email opens and link clicks</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">6. Updates to This Policy</h2>
                <p className="text-white/70">
                  We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-white mb-4">7. Contact Us</h2>
                <p className="text-white/70 mb-4">
                  If you have questions about our use of cookies, please contact us:
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
