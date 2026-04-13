import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
        </nav>
      </div>
    </header>
  );
}

export default function AIStatementPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LegalHeader />

      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          AI Statement
        </h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: 14 April 2026</p>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline">

          {/* Caution banner */}
          <div className="not-prose rounded-xl border border-amber-200 bg-amber-50 p-5 mb-8">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  AI-generated content should be treated with caution
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  While we use AI to help analyse and present information, AI can make mistakes. Always verify important details independently before making financial decisions.
                </p>
              </div>
            </div>
          </div>

          <p>
            WhoAmIPaying (a trading name of <strong>Ebanking Integration Limited</strong>, company no. 06596920) uses artificial intelligence in specific parts of our service. We believe in being transparent about where AI is used, what it does, and its limitations.
          </p>

          <h2>Where we use AI</h2>
          <p>We currently use AI (powered by Anthropic&apos;s Claude) in the following areas:</p>

          <h3>1. Invoice data extraction</h3>
          <p>
            When you upload an invoice, estimate, or payment request, we use AI to automatically extract key details such as the payee name, company name, bank sort code, account number, VAT number, and payment amount. This saves you from manually entering this information.
          </p>

          <h3>2. Online review summarisation</h3>
          <p>
            As part of enhanced verification checks, we use AI to search for and summarise online reviews and reputation information about a payee. The AI analyses publicly available review data and presents a summary of findings.
          </p>

          <h3>3. Marketplace valuation</h3>
          <p>
            When you provide a Facebook Marketplace listing, we use AI to analyse the listing details and provide an estimated market valuation to help you assess whether the asking price is reasonable.
          </p>

          <h3>4. Risk assessment summaries</h3>
          <p>
            AI is used to compile the results of our various checks (bank verification, company status, VAT validation, reviews) into an overall risk summary with plain-English explanations.
          </p>

          <h2>Where we do not use AI</h2>
          <p>The following checks use direct data lookups and do not involve AI interpretation:</p>
          <ul>
            <li><strong>Confirmation of Payee</strong> — a direct check with the receiving bank to verify the account name</li>
            <li><strong>Companies House lookup</strong> — direct query of the Companies House register</li>
            <li><strong>HMRC VAT validation</strong> — direct verification with HMRC&apos;s VAT database</li>
          </ul>

          <h2>Limitations of AI</h2>
          <p>AI technology, while powerful, has important limitations that you should be aware of:</p>
          <ul>
            <li><strong>AI can make mistakes</strong> — extracted data from invoices may contain errors, especially with handwritten, scanned, or poorly formatted documents</li>
            <li><strong>AI can misinterpret context</strong> — review summaries may not fully capture nuance or may present outdated information</li>
            <li><strong>AI does not verify facts</strong> — when AI summarises reviews or analyses listings, it presents information as found; it cannot independently confirm whether reviews are genuine or listings are legitimate</li>
            <li><strong>AI outputs are not advice</strong> — our risk assessments are informational summaries, not financial or legal advice</li>
          </ul>

          <h2>How to double-check AI results</h2>
          <p>We encourage you to verify AI-generated information, especially before making large payments:</p>
          <ul>
            <li><strong>Review extracted invoice data</strong> — after AI extraction, you can review and edit all fields before submitting your check. Always compare against the original document.</li>
            <li><strong>Check the source data</strong> — our verification results link back to source data where possible (e.g., Companies House records, HMRC VAT checker)</li>
            <li><strong>Contact the payee directly</strong> — for large payments, call the payee on a known number to confirm bank details</li>
            <li><strong>Seek professional advice</strong> — if you are uncertain about a payment, consult your bank or a qualified advisor</li>
          </ul>

          <h2>Our commitment</h2>
          <p>We are committed to:</p>
          <ul>
            <li><strong>Transparency</strong> — clearly indicating where AI is used in our results</li>
            <li><strong>Accuracy</strong> — continuously improving our AI models and prompts to reduce errors</li>
            <li><strong>Human oversight</strong> — designing our service so that you always have the opportunity to review and verify AI-generated content before acting on it</li>
            <li><strong>Data privacy</strong> — processing your data in accordance with our <Link href="/privacy">Privacy Policy</Link> and UK GDPR</li>
          </ul>

          <h2>Contact us</h2>
          <p>
            If you have questions about our use of AI, or if you believe an AI-generated result is incorrect, please contact us:
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
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
              <Link href="/ai-statement" className="hover:text-slate-900 transition-colors">AI Statement</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} WhoAmIPaying is a trading name of Ebanking Integration Limited (company no. 06596920). All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
