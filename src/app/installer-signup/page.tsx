// /installer-signup — F2 entry point.
//
// Two modes, decided at request time by the presence of `?id=`:
//
//   1. id mode    — `?id=<installer_id>` jumps straight to the signup
//                   form, prefilled from that installer record. The
//                   pending-installer email's "Claim your profile"
//                   CTA points here.
//
//   2. search mode — no `?id=`. Renders a search box that hits
//                   /api/installer-signup/lookup. User picks one of
//                   up to 5 matches and clicks through to the signup
//                   form (which is the same component re-rendered
//                   with a chosen installer).
//
// Server component for the wrapper. The interactive bits (search +
// the actual sign-up form) live in client islands.
//
// We deliberately don't redirect already-claimed installers away —
// the user might be trying to claim a profile someone else has
// stolen. Showing them "this profile is claimed; if that's wrong,
// email support" is more useful than pretending the profile doesn't
// exist.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { Building2 } from "lucide-react";
import { ClaimSignupForm } from "./signup-form";
import { ClaimSearch } from "./search";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface PageProps {
  searchParams: Promise<{ id?: string; email?: string; error?: string }>;
}

interface PrefillData {
  id: number;
  companyName: string;
  companyNumber: string | null;
  postcode: string | null;
  county: string | null;
  certificationBody: string | null;
  certificationNumber: string | null;
  // Server-rendered, so we can safely include the unmasked email
  // here — the page itself is publicly accessible but it's only
  // useful to someone who already knows the installer ID.
  email: string | null;
  alreadyClaimed: boolean;
}

async function loadInstaller(id: number): Promise<PrefillData | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("installers")
    .select(
      "id, company_name, company_number, postcode, county, certification_body, certification_number, email, user_id",
    )
    .eq("id", id)
    .maybeSingle<
      Pick<
        InstallerRow,
        | "id"
        | "company_name"
        | "company_number"
        | "postcode"
        | "county"
        | "certification_body"
        | "certification_number"
        | "email"
        | "user_id"
      >
    >();
  if (error || !data) return null;
  return {
    id: data.id,
    companyName: data.company_name,
    companyNumber: data.company_number,
    postcode: data.postcode,
    county: data.county,
    certificationBody: data.certification_body,
    certificationNumber: data.certification_number,
    email: data.email,
    alreadyClaimed: data.user_id != null,
  };
}

export default async function InstallerSignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const idRaw = params.id;
  const emailOverride = params.email;
  const errorFlag = params.error ?? null;
  const idNum = idRaw ? Number(idRaw) : null;

  // Resolve the installer if we got an id. Bad ids fall back to
  // search mode rather than 404 — saves a click for users who hit
  // a stale URL.
  let prefill: PrefillData | null = null;
  if (idNum && Number.isFinite(idNum) && idNum > 0) {
    prefill = await loadInstaller(idNum);
  }

  return (
    <main className="min-h-screen bg-cream-deep px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo size="md" variant="light" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
            {prefill
              ? `Claim ${prefill.companyName}`
              : "Find your MCS-listed company"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {prefill
              ? "Confirm this is your company, set a password, and start accepting leads via Propertoasty."
              : "Search for your company by name or by Companies House number. We'll match it to your existing MCS profile."}
          </p>
        </div>

        {errorFlag === "race_lost" && !prefill && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 text-sm leading-relaxed">
            <p className="font-semibold text-amber-900">
              That profile was claimed by someone else just now.
            </p>
            <p className="text-amber-900 mt-1">
              Your account is still active. If you think this profile
              belongs to you, email{" "}
              <a
                href="mailto:hello@propertoasty.com"
                className="underline font-medium"
              >
                hello@propertoasty.com
              </a>{" "}
              and we&rsquo;ll sort it out.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          {prefill ? (
            <PrefillView prefill={prefill} emailOverride={emailOverride} />
          ) : (
            <ClaimSearch />
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-coral hover:text-coral-dark font-medium"
          >
            Sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

// Server-rendered — receives prefill from the parent and decides
// whether to show the signup form, the "claimed" message, or just
// the company card with a "back to search" link.
function PrefillView({
  prefill,
  emailOverride,
}: {
  prefill: PrefillData;
  emailOverride: string | undefined;
}) {
  return (
    <>
      <CompanyCard prefill={prefill} />
      {prefill.alreadyClaimed ? (
        <AlreadyClaimedNote />
      ) : (
        <ClaimSignupForm
          installerId={prefill.id}
          installerName={prefill.companyName}
          defaultEmail={emailOverride ?? prefill.email ?? ""}
        />
      )}
      <p className="mt-4 text-center text-xs text-slate-500">
        Not your company?{" "}
        <Link
          href="/installer-signup"
          className="text-coral hover:text-coral-dark font-medium"
        >
          Search again
        </Link>
        .
      </p>
    </>
  );
}

function CompanyCard({ prefill }: { prefill: PrefillData }) {
  const certLine = [prefill.certificationBody, prefill.certificationNumber]
    .filter((s): s is string => !!s && s.length > 0)
    .join(" · ");
  const locationLine = [prefill.postcode, prefill.county]
    .filter((s): s is string => !!s && s.length > 0)
    .join(" · ");
  return (
    <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4 mb-5 flex items-start gap-3">
      <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white text-coral border border-coral/30">
        <Building2 className="w-4 h-4" />
      </span>
      <div className="flex-1 text-sm leading-relaxed">
        <p className="font-semibold text-navy">{prefill.companyName}</p>
        {certLine && <p className="text-xs text-slate-600 mt-0.5">{certLine}</p>}
        {locationLine && (
          <p className="text-xs text-slate-500 mt-0.5">{locationLine}</p>
        )}
        {prefill.companyNumber && (
          <p className="text-[11px] text-slate-400 mt-1">
            Companies House #{prefill.companyNumber}
          </p>
        )}
      </div>
    </div>
  );
}

function AlreadyClaimedNote() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
      <p className="font-semibold text-amber-900">
        This profile has already been claimed.
      </p>
      <p className="text-amber-900 mt-1">
        Someone has already signed up under this MCS record. If that
        wasn&rsquo;t you, email{" "}
        <a
          href="mailto:hello@propertoasty.com"
          className="underline font-medium"
        >
          hello@propertoasty.com
        </a>{" "}
        and we&rsquo;ll sort it out.
      </p>
    </div>
  );
}
