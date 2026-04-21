import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

function LegalHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/enterprise" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Enterprise
          </Link>
          <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Blog
          </Link>
        </nav>
        <nav className="flex items-center gap-3">
          <Button
            className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg shadow-sm hover:shadow-md transition-all"
            render={<Link href="/verify" />}
          >
            Make a check
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            render={<Link href="/auth/login" />}
          >
            Sign in
          </Button>
        </nav>
      </div>
    </header>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LegalHeader />

      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: 14 April 2026</p>

        <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4 prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-7 prose-li:text-slate-600 prose-li:my-2 prose-li:leading-[1.8] prose-ul:my-7 prose-ol:my-7 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline">

          <p>
            Propertoasty is a trading name of <strong><a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer">Braemar, Brook &amp; New Limited</a></strong> (company number 11591983). See Companies House for our registered office and filing history.
          </p>
          <p>
            We are committed to protecting your privacy and handling your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>

          <h2>1. Information we collect</h2>
          <p>We may collect the following personal data when you use our service:</p>
          <ul>
            <li><strong>Account information</strong> — email address and password when you create an account</li>
            <li><strong>Verification data</strong> — payee names, bank sort codes and account numbers, company names, VAT numbers, and invoice details that you submit for verification checks</li>
            <li><strong>Payment information</strong> — processed securely by Stripe; we do not store your full card details</li>
            <li><strong>Usage data</strong> — pages visited, features used, browser type, device information, and IP address</li>
            <li><strong>Communication data</strong> — if you contact us, we retain your correspondence</li>
          </ul>

          <h2>2. How we use your information</h2>
          <p>We use your personal data to:</p>
          <ul>
            <li>Provide verification checks against bank records, Companies House, HMRC, and other data sources</li>
            <li>Create and manage your account</li>
            <li>Process payments for credit purchases and subscriptions</li>
            <li>Send you verification results and service updates</li>
            <li>Improve our service and develop new features</li>
            <li>Detect and prevent fraud or misuse of our platform</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>3. Legal basis for processing</h2>
          <p>We process your data under the following legal bases:</p>
          <ul>
            <li><strong>Contract</strong> — to provide the verification services you have requested</li>
            <li><strong>Legitimate interests</strong> — to improve our service, prevent fraud, and ensure security</li>
            <li><strong>Consent</strong> — for marketing communications and non-essential cookies (you can withdraw consent at any time)</li>
            <li><strong>Legal obligation</strong> — to comply with applicable laws and regulations</li>
          </ul>

          <h2>4. Cookies</h2>
          <p>We use cookies and similar technologies on our website. Cookies are small text files placed on your device that help us provide and improve our service.</p>

          <h3>Essential cookies</h3>
          <p>These are necessary for the website to function and cannot be switched off. They include:</p>
          <ul>
            <li>Authentication cookies to keep you signed in</li>
            <li>Security cookies to protect against fraud</li>
            <li>Session cookies to remember your preferences during a visit</li>
          </ul>

          <h3>Analytics cookies</h3>
          <p>These help us understand how visitors use our website, so we can improve it. We may use services such as Google Analytics or similar tools. These cookies collect anonymised data about page visits, time spent on site, and navigation patterns.</p>

          <h3>Functional cookies</h3>
          <p>These enable enhanced functionality such as remembering your preferences, wizard progress, and display settings.</p>

          <h3>Managing cookies</h3>
          <p>
            You can control and delete cookies through your browser settings. Most browsers allow you to refuse cookies or alert you when a cookie is being set. Please note that disabling essential cookies may affect the functionality of our service.
          </p>
          <p>
            For more information about cookies, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">allaboutcookies.org</a>.
          </p>

          <h2>5. Data sharing</h2>
          <p>We may share your data with:</p>
          <ul>
            <li><strong>Third-party verification providers</strong> — including banks (for Confirmation of Payee), Companies House, and HMRC (for VAT checks), to perform the verification services you request</li>
            <li><strong>Payment processors</strong> — Stripe processes your payment information securely</li>
            <li><strong>Hosting and infrastructure</strong> — Vercel (hosting) and Supabase (database) process data on our behalf</li>
            <li><strong>AI services</strong> — Anthropic (Claude) processes invoice data for extraction purposes (see our <Link href="/ai-statement">AI Statement</Link>)</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>

          <h2>6. Data retention</h2>
          <p>We retain your personal data for as long as necessary to provide our services and fulfil the purposes described in this policy. Specifically:</p>
          <ul>
            <li><strong>Account data</strong> — retained while your account is active, and for up to 12 months after deletion</li>
            <li><strong>Verification results</strong> — retained for up to 24 months to allow you to access your history</li>
            <li><strong>Payment records</strong> — retained for 7 years as required by UK tax law</li>
            <li><strong>Usage and analytics data</strong> — retained in anonymised form for up to 24 months</li>
          </ul>

          <h2>7. Your rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
            <li><strong>Erasure</strong> — ask us to delete your data (subject to legal retention requirements)</li>
            <li><strong>Restriction</strong> — ask us to limit how we use your data</li>
            <li><strong>Portability</strong> — request your data in a structured, machine-readable format</li>
            <li><strong>Object</strong> — object to processing based on legitimate interests</li>
            <li><strong>Withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time</li>
          </ul>
          <p>To exercise any of these rights, contact us at <strong>privacy@propertoasty.com</strong>.</p>

          <h2>8. Data security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your personal data, including encryption in transit (TLS/HTTPS), encryption at rest, access controls, and regular security reviews.
          </p>

          <h2>9. International transfers</h2>
          <p>
            Some of our service providers may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses or adequacy decisions.
          </p>

          <h2>10. Children</h2>
          <p>
            Our service is not intended for individuals under the age of 18. We do not knowingly collect personal data from children.
          </p>

          <h2>11. Changes to this policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of material changes by posting the updated policy on our website with a revised &ldquo;last updated&rdquo; date.
          </p>

          <h2>12. Contact us</h2>
          <p>
            If you have questions about this privacy policy or wish to exercise your data rights, please contact:
          </p>
          <p>
            <strong><a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer">Braemar, Brook &amp; New Limited</a></strong><br />
            Trading as Propertoasty<br />
            Company no. 11591983 (registered office on Companies House)<br />
            Email: <strong>privacy@propertoasty.com</strong>
          </p>
          <p>
            You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
          </p>
        </div>
      </article>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="light" showTagline />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors">How it works</Link>
              <Link href="/enterprise" className="hover:text-slate-900 transition-colors">Enterprise</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link href="/verify" className="hover:text-slate-900 transition-colors">Make a check</Link>
              <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            </nav>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Propertoasty is a trading name of <a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer">Braemar, Brook &amp; New Limited</a> (company no. 11591983). All rights reserved.
            </p>
            <nav className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-1 text-xs text-slate-400">
              <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
              <Link href="/ai-statement" className="hover:text-slate-600 transition-colors">AI Statement</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
