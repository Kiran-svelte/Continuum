import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Continuum Terms of Service - Rules and guidelines for using our platform.',
};

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using Continuum (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of the terms, you may not access the Service.
            </p>
            <p className="text-muted-foreground">
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              Continuum is an enterprise leave management platform that provides:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Leave request and approval workflows</li>
              <li>Attendance tracking and management</li>
              <li>Policy configuration and compliance tools</li>
              <li>Reporting and analytics features</li>
              <li>Integration with third-party services</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.1 Account Creation</h3>
            <p className="text-muted-foreground mb-4">
              To use certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.2 Account Security</h3>
            <p className="text-muted-foreground mb-4">
              You are responsible for safeguarding your password and for all activities under your account. You agree to notify us immediately of any unauthorized use.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.3 Account Termination</h3>
            <p className="text-muted-foreground">
              We reserve the right to terminate or suspend your account for violations of these Terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Subscription and Payment</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.1 Pricing</h3>
            <p className="text-muted-foreground mb-4">
              Continuum offers various subscription plans. Prices are subject to change with notice. Current pricing is available on our website.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.2 Payment Terms</h3>
            <p className="text-muted-foreground mb-4">
              Subscriptions are billed in advance on a monthly or annual basis. Payment is due upon invoice. Failure to pay may result in service suspension.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.3 Refunds</h3>
            <p className="text-muted-foreground">
              Refunds are handled on a case-by-case basis. Contact our support team for refund requests.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Transmit malware or harmful code</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Share your account credentials with unauthorized parties</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The Service and its original content, features, and functionality are owned by Continuum and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground">
              You may not copy, modify, distribute, sell, or lease any part of our Service without prior written consent.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. User Content</h2>
            <p className="text-muted-foreground mb-4">
              You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content for the purpose of operating and improving the Service.
            </p>
            <p className="text-muted-foreground">
              You are responsible for ensuring you have the right to share any content you submit.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Please review it to understand our data practices.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Service Availability</h2>
            <p className="text-muted-foreground mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be unavailable due to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Scheduled maintenance</li>
              <li>Emergency maintenance</li>
              <li>Technical failures</li>
              <li>Events beyond our control</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Check our <Link href="/status" className="text-primary hover:underline">Status Page</Link> for current service status.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONTINUUM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Loss of profits, data, or business opportunities</li>
              <li>Service interruptions</li>
              <li>Cost of procurement of substitute services</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Our total liability shall not exceed the amount paid by you for the Service in the twelve months preceding the claim.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless Continuum and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, India.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> legal@continuum.app</li>
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
