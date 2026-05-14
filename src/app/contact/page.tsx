// /contact — public contact page.
//
// Three audience-specific paths: homeowners with property questions,
// installers looking to join the directory, and press / research.
// No form (yet) — direct email keeps the surface low-effort and
// avoids spam-form maintenance. Add a form when we have a volume
// reason to.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Home, Hammer, FileSearch } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/contact";

export const metadata: Metadata = {
  title: "Contact Propertoasty — homeowner, installer + press enquiries",
  description:
    "How to reach Propertoasty. Homeowner questions about your suitability report, installer onboarding for the directory, press + research enquiries.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Contact Propertoasty",
    description:
      "Reach us for homeowner support, installer enquiries, or press + research.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
  },
};

export default function ContactPage() {
  return (
    <AEOPage
      headline="Contact Propertoasty"
      description="How to reach Propertoasty for homeowner, installer, and press enquiries."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Contact"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Contact" },
      ]}
      directAnswer="Reach Propertoasty by email for any homeowner support, installer directory enquiry, or press / research question. We aim to respond within one working day. For property-specific eligibility questions, the fastest path is our free 5-minute property check — it produces the report you'd otherwise be asking us about."
      tldr={[
        "General enquiries: hello@propertoasty.com",
        "Installer directory + onboarding: installers@propertoasty.com",
        "Press + research: press@propertoasty.com",
        "Response target: within one working day.",
        "Property-specific eligibility questions: run the free check at /check.",
      ]}
      sources={[
        {
          name: "Propertoasty — privacy policy",
          url: "https://www.propertoasty.com/privacy",
          accessedDate: "May 2026",
        },
        {
          name: "Propertoasty — terms",
          url: "https://www.propertoasty.com/terms",
          accessedDate: "May 2026",
        },
      ]}
    >
      <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ContactCard
          icon={<Home className="w-5 h-5 text-coral" aria-hidden />}
          audience="Homeowner enquiries"
          email="hello@propertoasty.com"
          description="Questions about your suitability report, the property check, or anything Propertoasty-related as a homeowner."
          cta={{ href: "/check", label: "Or run the free check" }}
        />
        <ContactCard
          icon={<Hammer className="w-5 h-5 text-coral" aria-hidden />}
          audience="Installer enquiries"
          email="installers@propertoasty.com"
          description="MCS-certified installers wanting to claim their directory listing, update details, or join the lead-share programme."
          cta={{ href: "/installer-signup", label: "Or apply directly" }}
        />
        <ContactCard
          icon={<FileSearch className="w-5 h-5 text-coral" aria-hidden />}
          audience="Press + research"
          email="press@propertoasty.com"
          description="Journalists, researchers, and policy analysts requesting data, interviews, or pre-publication briefings."
          cta={{ href: "/research", label: "See published research" }}
        />
      </div>

      <h2>Response time</h2>
      <p>
        We aim to respond to all enquiries within one working day
        (Monday to Friday, UK business hours). Complex installer
        directory queries (claiming listings, updating capability
        flags, MCS verification) may take 2–3 working days while we
        confirm against the MCS register.
      </p>

      <h2>Before you email</h2>
      <p>
        Three things that resolve most questions without email:
      </p>
      <ul>
        <li>
          <strong>Property-specific suitability question.</strong>{" "}
          Run the free check at{" "}
          <Link href="/check">propertoasty.com/check</Link> — it
          generates the report you&rsquo;d otherwise be asking us
          for.
        </li>
        <li>
          <strong>Looking for an installer.</strong> Browse the{" "}
          <Link href="/installers">installer directory</Link> by
          area, or run the free check to get a postcode-level
          installer match.
        </li>
        <li>
          <strong>BUS grant / MCS process question.</strong> The{" "}
          <Link href="/guides">guides section</Link> covers BUS
          application, MCS site visits, fabric-first retrofit,
          hot-water planning, and smart-tariff setup.
        </li>
      </ul>

      <h2>Postal address</h2>
      <p>
        Propertoasty is operated by Credit Canary Ltd. For postal
        correspondence — only required for formal data-rights
        requests under UK GDPR — contact us by email first and
        we&rsquo;ll provide a registered office address.
      </p>

      <h2>Data rights</h2>
      <p>
        Under UK GDPR, you have rights of access, rectification,
        erasure, and portability over your personal data. To
        exercise any of these, email{" "}
        <a href="mailto:privacy@propertoasty.com">
          privacy@propertoasty.com
        </a>{" "}
        with the subject line &ldquo;Data rights request&rdquo;.
        We respond within 30 days as required by law. Full details
        in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Reporting a security issue</h2>
      <p>
        Found a security vulnerability or data leak? Email{" "}
        <a href="mailto:security@propertoasty.com">
          security@propertoasty.com
        </a>{" "}
        with reproduction steps. Please don&rsquo;t share publicly
        until we&rsquo;ve had a chance to investigate (responsible
        disclosure). We acknowledge within 48 hours.
      </p>
    </AEOPage>
  );
}

interface ContactCardProps {
  icon: React.ReactNode;
  audience: string;
  email: string;
  description: string;
  cta: { href: string; label: string };
}

function ContactCard({ icon, audience, email, description, cta }: ContactCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-base font-semibold text-navy m-0">{audience}</h3>
      </div>
      <p className="text-sm text-slate-600 mb-3 leading-relaxed flex-1">
        {description}
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-coral hover:text-coral-dark transition-colors mb-2"
      >
        <Mail className="w-4 h-4" aria-hidden />
        {email}
      </a>
      <Link
        href={cta.href}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-coral transition-colors"
      >
        {cta.label}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
