import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MarketingHeader } from "@/components/marketing-header";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Statement — how Propertoasty uses AI",
  description:
    "Where Propertoasty uses AI (floorplan vision, satellite roof reading, EPC interpretation), where we don't, and how to double-check the output.",
  alternates: { canonical: "https://www.propertoasty.com/ai-statement" },
  openGraph: {
    title: "AI Statement — how Propertoasty uses AI",
    description:
      "Where Propertoasty uses AI (floorplan vision, satellite roof reading, EPC interpretation), where we don't, and how to double-check the output.",
    type: "article",
    url: "https://www.propertoasty.com/ai-statement",
  },
};

export default function AIStatementPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-slate-900">
      <MarketingHeader />

      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          AI Statement
        </h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: 17 July 2026</p>

        <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4 prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-7 prose-li:text-slate-600 prose-li:my-2 prose-li:leading-[1.8] prose-ul:my-7 prose-ol:my-7 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline">

          {/* Caution banner */}
          <div className="not-prose rounded-xl border border-amber-200 bg-amber-50 p-5 mb-8">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  Our reports are a pre-survey indication, not an engineering assessment.
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  AI helps us read your floorplan and roof, but a certified installer&rsquo;s site visit is what confirms the design and price. Always verify with an MCS-certified installer before committing to an install.
                </p>
              </div>
            </div>
          </div>

          <p>
            Propertoasty (a trading name of <strong><a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer">Braemar, Brook &amp; New Limited</a></strong>, company no. 11591983) uses artificial intelligence in specific parts of the pre-survey report. We believe in being transparent about where AI is used, what it does, and its limitations.
          </p>

          <h2>Where we use AI</h2>
          <p>The pre-survey report uses AI (powered by Anthropic&apos;s Claude and Google&apos;s Solar API) in the following areas:</p>

          <h3>1. Floorplan analysis (machine vision)</h3>
          <p>
            When you upload a floorplan, Claude reads it as an image: identifying rooms, estimating floor area if the EPC record is missing, spotting where the current gas boiler is likely located, and flagging spaces that could realistically house a hot-water cylinder. The output is a structured description of your layout, validated against a strict schema — not free-form prose.
          </p>

          <h3>2. Satellite roof reading (Google Solar API)</h3>
          <p>
            For the solar pre-survey, we call Google&apos;s Solar API with your address. It returns per-segment roof geometry (pitch, azimuth, area) and modelled annual irradiance for your specific rooftop. We use that to estimate a realistic panel count, kWp system size, and expected annual generation. The API&apos;s data quality is graded HIGH / MEDIUM / LOW per address — we surface that grade in the report so you know how much weight to place on it.
          </p>

          <h3>3. EPC interpretation</h3>
          <p>
            We pull your home&apos;s Energy Performance Certificate directly from the GOV.UK EPC Register. AI is used to read the certificate&apos;s recommendations — e.g. &ldquo;loft insulation to 270mm&rdquo; — and translate them into the Boiler Upgrade Scheme (BUS) prerequisites that Ofgem expects to be cleared before a heat pump goes in. The rules engine that decides &ldquo;BUS-eligible&rdquo; vs &ldquo;insulation-first&rdquo; is a set of pure functions cited against Ofgem guidance — not AI.
          </p>

          <h3>4. Report generation</h3>
          <p>
            Once the property, EPC, solar, and floorplan data are stitched together, AI is used to compose the plain-English narrative that explains what it all means for your home — what heat-pump size fits, what roof segments are best for solar, what the BUS grant would be worth, and what to ask an installer. The underlying numbers come from deterministic calculations; the AI writes the words around them.
          </p>

          <h2>Where we do not use AI</h2>
          <p>Several parts of the report are direct data lookups or deterministic calculations — no AI interpretation:</p>
          <ul>
            <li><strong>EPC record lookup</strong> — direct API call to the GOV.UK EPC Register, keyed on your address (UPRN).</li>
            <li><strong>Address &amp; postcode resolution</strong> — direct calls to Google Places and Postcodes.io.</li>
            <li><strong>BUS eligibility rules</strong> — pure functions coded against Ofgem&apos;s published guidance, unit-tested and auditable.</li>
            <li><strong>Heat-pump running-cost model</strong> — deterministic maths: floor area × demand-per-m² × SCOP × tariff.</li>
            <li><strong>Solar yield</strong> — PVGIS v5.3, an EU Joint Research Centre model of solar irradiance. Numerical, not AI.</li>
            <li><strong>MCS installer directory</strong> — direct import of the official MCS-certified installers list.</li>
          </ul>

          <h2>Limitations of AI</h2>
          <p>AI technology, while powerful, has important limits you should be aware of:</p>
          <ul>
            <li><strong>Floorplan reading can miss detail</strong> — hand-drawn floorplans, low-resolution scans, or ambiguous room labels can produce misidentified rooms or misjudged floor area. Always sanity-check the extracted floor area against what you know.</li>
            <li><strong>Satellite roof data isn&apos;t universal</strong> — Google&apos;s Solar API has excellent coverage of English cities and much of Wales, but some rural addresses land at LOW quality or no coverage at all. We flag this in the report; a physical roof survey is the only way to confirm.</li>
            <li><strong>EPC records can be out of date</strong> — a 2011 EPC won&apos;t reflect insulation you added in 2023. We show the certificate&apos;s expiry date so you can judge.</li>
            <li><strong>Our report is a pre-survey indication, not a design</strong> — it&apos;s what an installer can use to give you a properly-priced quote without a two-hour first visit. It is not the final engineering assessment.</li>
          </ul>

          <h2>How to double-check the AI output</h2>
          <p>We encourage you to verify AI-generated parts of the report before committing to an install:</p>
          <ul>
            <li><strong>Review the extracted floorplan summary</strong> — the report lists the rooms and floor area we read from your upload. If it&rsquo;s wrong, tell us; we&rsquo;ll re-analyse.</li>
            <li><strong>Check the EPC record source</strong> — the report links directly to your certificate on <a href="https://find-energy-certificate.service.gov.uk/" target="_blank" rel="noopener noreferrer">find-energy-certificate.service.gov.uk</a>.</li>
            <li><strong>Check the roof coverage grade</strong> — the report displays the Google Solar API&apos;s per-address quality grade. LOW-grade addresses should be treated as directional; MEDIUM/HIGH are quote-ready.</li>
            <li><strong>Book a site visit with an MCS-certified installer</strong> — the report is designed so an installer can quote from it, but the final design and price come from a physical survey.</li>
          </ul>

          <h2>Our commitment</h2>
          <p>We are committed to:</p>
          <ul>
            <li><strong>Transparency</strong> — clearly indicating where AI is used in the report and where it isn&apos;t.</li>
            <li><strong>Accuracy</strong> — continuously improving our prompts, schema validation, and rules engines to reduce errors.</li>
            <li><strong>Human oversight</strong> — designing the report so a homeowner can sanity-check each section and an installer can override any AI-derived assumption on the site visit.</li>
            <li><strong>Data privacy</strong> — processing your data in accordance with our <Link href="/privacy">Privacy Policy</Link> and UK GDPR. Floorplans are stored in a private bucket with 90-day retention.</li>
          </ul>

          <h2>Contact us</h2>
          <p>
            If you have questions about our use of AI, or if you believe an AI-generated result is incorrect, please contact us:
          </p>
          <p>
            <strong><a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer">Braemar, Brook &amp; New Limited</a></strong><br />
            Trading as Propertoasty<br />
            Company no. 11591983 (registered office on Companies House)<br />
            Email: <strong>hello@propertoasty.com</strong>
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
              <Link href="/check" className="hover:text-slate-900 transition-colors">Check my home</Link>
              <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            </nav>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
            <p className="text-xs text-slate-400 leading-relaxed">
              &copy; {new Date().getFullYear()} Propertoasty. All
              rights reserved.
              <br />
              Illustrative examples for research purposes only — we
              are not a lender or a broker.
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
