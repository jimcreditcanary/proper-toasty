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

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LegalHeader />

      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: 14 April 2026</p>

        <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4 prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-7 prose-li:text-slate-600 prose-li:my-2 prose-li:leading-[1.8] prose-ul:my-7 prose-ol:my-7 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline">

          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the WhoAmIPaying website and services at whoamipaying.co.uk (&ldquo;the Service&rdquo;). WhoAmIPaying is a trading name of <strong>Ebanking Integration Limited</strong> (company number 06596920), registered at Chapel Meadows, Sugar Lane, Adlington, Macclesfield, England, SK10 5SQ (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
          </p>
          <p>
            By using our Service, you agree to be bound by these Terms. If you do not agree, please do not use our Service.
          </p>

          <h2>1. About the Service</h2>
          <p>
            WhoAmIPaying provides payment verification checks to help individuals and businesses verify the identity and legitimacy of payees before making payments. Our checks may include Confirmation of Payee, Companies House lookups, HMRC VAT validation, online review analysis, and marketplace valuation.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and resident in the United Kingdom to use our Service. By creating an account, you confirm that you meet these requirements.
          </p>

          <h2>3. Account registration</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You agree to provide accurate and complete information when creating your account.</li>
            <li>You must notify us immediately if you suspect unauthorised access to your account.</li>
          </ul>

          <h2>4. Credits and payments</h2>
          <h3>Pay-as-you-go</h3>
          <ul>
            <li>Enhanced verification checks require credits, purchased through our website.</li>
            <li>Credits are non-refundable once purchased, except where required by law.</li>
            <li>Credits do not expire.</li>
            <li>Prices are displayed in GBP and inclusive of VAT where applicable.</li>
          </ul>
          <h3>Enterprise subscriptions</h3>
          <ul>
            <li>Enterprise subscriptions are billed monthly via Stripe.</li>
            <li>Unused credits from your monthly allowance roll over to subsequent months while your subscription is active.</li>
            <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
            <li>No refunds are provided for partial billing periods.</li>
          </ul>

          <h2>5. Free checks</h2>
          <p>
            We offer a free basic check (Confirmation of Payee) that does not require an account or payment. We reserve the right to modify or discontinue free checks at any time.
          </p>

          <h2>6. API access</h2>
          <p>
            Enterprise users may access our verification services via API. API access is subject to these Terms and any additional API-specific terms. You agree not to:
          </p>
          <ul>
            <li>Exceed reasonable usage limits or abuse the API</li>
            <li>Resell or redistribute API access without our written consent</li>
            <li>Use the API for any unlawful purpose</li>
            <li>Attempt to reverse-engineer or extract our underlying data sources</li>
          </ul>

          <h2>7. Accuracy and limitations</h2>
          <p>
            <strong>Important:</strong> Our verification checks are informational tools designed to help you make more informed decisions. They are not a guarantee of a payee&apos;s legitimacy or trustworthiness.
          </p>
          <ul>
            <li>Results are based on data from third-party sources (banks, Companies House, HMRC, public review sites) and may not be complete, current, or accurate.</li>
            <li>Some elements of our service use artificial intelligence to analyse and summarise data. AI-generated content should be treated as guidance, not fact (see our <Link href="/ai-statement">AI Statement</Link>).</li>
            <li>A &ldquo;low risk&rdquo; result does not guarantee that a payee is legitimate. A &ldquo;high risk&rdquo; result does not necessarily mean a payee is fraudulent.</li>
            <li>You remain solely responsible for your payment decisions.</li>
          </ul>

          <h2>8. Acceptable use</h2>
          <p>You agree not to use our Service to:</p>
          <ul>
            <li>Conduct any unlawful or fraudulent activity</li>
            <li>Harass, stalk, or obtain private information about individuals</li>
            <li>Submit false or misleading data</li>
            <li>Attempt to gain unauthorised access to our systems or other users&apos; accounts</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Scrape, crawl, or automatically collect data from our website without permission</li>
          </ul>

          <h2>9. Intellectual property</h2>
          <p>
            All content, branding, software, and design on our website are owned by Ebanking Integration Limited or our licensors and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written consent.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <ul>
            <li>Our Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or implied.</li>
            <li>We do not warrant that results will be accurate, complete, or error-free.</li>
            <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
            <li>Our total liability for any claim arising from or relating to the Service shall not exceed the amount you paid to us in the 12 months preceding the claim.</li>
          </ul>
          <p>
            Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded under English law.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Ebanking Integration Limited, its directors, employees, and agents from any claims, losses, damages, or expenses (including legal fees) arising from your use of the Service or breach of these Terms.
          </p>

          <h2>12. Termination</h2>
          <ul>
            <li>You may close your account at any time by contacting us.</li>
            <li>We may suspend or terminate your access if you breach these Terms or if we reasonably believe your use poses a risk to our Service or other users.</li>
            <li>Upon termination, your right to use the Service ceases immediately. Any unused credits are forfeited unless otherwise required by law.</li>
          </ul>

          <h2>13. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be notified via email or a prominent notice on our website. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
          </p>

          <h2>14. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of England and Wales. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>

          <h2>15. Contact us</h2>
          <p>
            If you have questions about these Terms, please contact:
          </p>
          <p>
            <strong>Ebanking Integration Limited</strong><br />
            Trading as WhoAmIPaying<br />
            Chapel Meadows, Sugar Lane<br />
            Adlington, Macclesfield<br />
            England, SK10 5SQ<br />
            Email: <strong>hello@whoamipaying.co.uk</strong>
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
              &copy; {new Date().getFullYear()} WhoAmIPaying is a trading name of Ebanking Integration Limited (company no. 06596920). All rights reserved.
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
