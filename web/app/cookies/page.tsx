import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Continuum Cookie Policy - Learn how we use cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background">
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
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. What Are Cookies?</h2>
            <p className="text-muted-foreground mb-4">
              Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
            </p>
            <p className="text-muted-foreground">
              This Cookie Policy explains how Continuum uses cookies and similar technologies when you use our Service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Types of Cookies We Use</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.1 Essential Cookies</h3>
            <p className="text-muted-foreground mb-4">
              These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access.
            </p>
            <div className="bg-secondary/30 rounded-lg p-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-foreground">Cookie Name</th>
                    <th className="text-left py-2 text-foreground">Purpose</th>
                    <th className="text-left py-2 text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-2">session_token</td>
                    <td className="py-2">Maintains user login session</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2">csrf_token</td>
                    <td className="py-2">Security protection against CSRF attacks</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="py-2">auth_state</td>
                    <td className="py-2">Authentication state management</td>
                    <td className="py-2">7 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.2 Preference Cookies</h3>
            <p className="text-muted-foreground mb-4">
              These cookies remember your preferences and settings to enhance your experience.
            </p>
            <div className="bg-secondary/30 rounded-lg p-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-foreground">Cookie Name</th>
                    <th className="text-left py-2 text-foreground">Purpose</th>
                    <th className="text-left py-2 text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-2">continuum-theme</td>
                    <td className="py-2">Stores your theme preference (light/dark)</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-2">locale</td>
                    <td className="py-2">Stores language preference</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.3 Analytics Cookies</h3>
            <p className="text-muted-foreground mb-4">
              These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
            </p>
            <div className="bg-secondary/30 rounded-lg p-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-foreground">Cookie Name</th>
                    <th className="text-left py-2 text-foreground">Purpose</th>
                    <th className="text-left py-2 text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-2">_ga</td>
                    <td className="py-2">Google Analytics - distinguishes users</td>
                    <td className="py-2">2 years</td>
                  </tr>
                  <tr>
                    <td className="py-2">_gid</td>
                    <td className="py-2">Google Analytics - distinguishes users</td>
                    <td className="py-2">24 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.4 Functional Cookies</h3>
            <p className="text-muted-foreground">
              These cookies enable enhanced functionality and personalization, such as remembering your tutorial progress or notification preferences.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Some cookies are placed by third-party services that appear on our pages. We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Google Analytics:</strong> For website traffic analysis</li>
              <li><strong>Firebase:</strong> For authentication services</li>
              <li><strong>Intercom:</strong> For customer support (if enabled)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These third parties may have their own privacy and cookie policies. We encourage you to review them.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Managing Cookies</h2>
            <p className="text-muted-foreground mb-4">
              You can control and manage cookies in several ways:
            </p>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.1 Browser Settings</h3>
            <p className="text-muted-foreground mb-4">
              Most browsers allow you to refuse cookies or delete existing cookies. Here&apos;s how to manage cookies in popular browsers:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
            </ul>
            <p className="text-muted-foreground text-sm bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-lg">
              ⚠️ Note: Disabling essential cookies may impact the functionality of our Service.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.2 Cookie Preferences</h3>
            <p className="text-muted-foreground">
              You can update your cookie preferences at any time through the cookie consent banner or by contacting our support team.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Similar Technologies</h2>
            <p className="text-muted-foreground mb-4">
              In addition to cookies, we may use similar technologies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Local Storage:</strong> For storing preferences and session data in your browser</li>
              <li><strong>Session Storage:</strong> For temporary storage during your browsing session</li>
              <li><strong>Web Beacons:</strong> Small images that help us track email opens and link clicks</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> privacy@continuum.app</li>
              <li><strong>Support:</strong> <Link href="/support" className="text-primary hover:underline">continuum.app/support</Link></li>
            </ul>
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Continuum. All rights reserved.</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
