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
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { Building2 } from "lucide-react";
import { ClaimSignupForm } from "./signup-form";
import { ClaimSearch } from "./search";
import { ClaimAsSelfButton } from "./claim-button";
import { maskEmail } from "@/lib/installer-claim/email-mask";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface PageProps {
  searchParams: Promise<{
    id?: string;
    email?: string;
    error?: "race_lost" | "email_mismatch" | "no_email" | string;
  }>;
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
  /** The bound user_id (when claimed) so we can detect the case
   *  where the signed-in viewer IS the owner — e.g. they came back
   *  via the "sign in" CTA on the already-claimed view — and bounce
   *  them straight to /installer rather than show "claimed by
   *  someone else". */
  ownerUserId: string | null;
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
    ownerUserId: data.user_id ?? null,
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

  // Detect a signed-in user so we can short-circuit the F2 signup
  // form (which would create a duplicate account + send a confirm
  // email they don't need). The claim-as-self button binds their
  // existing user to the installer in one POST.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInEmail = user?.email ?? null;

  // Owner-recognition shortcut: if the signed-in viewer is the
  // installer's bound user, send them straight to the portal —
  // they're already done with the claim flow. Triggered when
  // someone clicks "sign in" from the already-claimed view, signs
  // in correctly, and would otherwise loop back into the same
  // already-claimed page.
  if (prefill && user && prefill.ownerUserId === user.id) {
    redirect("/installer");
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
            <PrefillView
              prefill={prefill}
              emailOverride={emailOverride}
              signedInEmail={signedInEmail}
              errorFlag={errorFlag}
            />
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
// which view to render. Order matters; earlier conditions win.
//
//   1. Already claimed by someone else → "claimed" note.
//   2. Signed-in user, but their email doesn't match the installer
//      record → mismatch refusal (security: stops cross-installer
//      claims).
//   3. Signed-in user, installer has no email on file → no-email
//      refusal (admin support route).
//   4. Signed-in user, email matches → one-click claim-as-self.
//   5. Anonymous → F2 signup form (creates the account + binds via
//      auth callback). The form ALSO enforces the email match, but
//      this server-side path stops the wrong account from getting
//      to the form in the first place.
function PrefillView({
  prefill,
  emailOverride,
  signedInEmail,
  errorFlag,
}: {
  prefill: PrefillData;
  emailOverride: string | undefined;
  signedInEmail: string | null;
  errorFlag: string | null;
}) {
  const installerEmail = prefill.email?.toLowerCase().trim() ?? null;
  const userEmail = signedInEmail?.toLowerCase().trim() ?? null;

  let body: React.ReactNode;
  if (prefill.alreadyClaimed) {
    body = (
      <AlreadyClaimedNote
        installerId={prefill.id}
        signedIn={!!signedInEmail}
      />
    );
  } else if (signedInEmail && !installerEmail) {
    body = <NoEmailOnFileNote companyName={prefill.companyName} />;
  } else if (signedInEmail && installerEmail !== userEmail) {
    body = (
      <EmailMismatchNote
        companyName={prefill.companyName}
        userEmail={signedInEmail}
        installerEmailHint={maskEmail(prefill.email)}
      />
    );
  } else if (signedInEmail) {
    body = (
      <ClaimAsSelfButton
        installerId={prefill.id}
        installerName={prefill.companyName}
        signedInEmail={signedInEmail}
      />
    );
  } else {
    body = (
      <UnauthenticatedClaimChoices
        installerId={prefill.id}
        installerName={prefill.companyName}
        defaultEmail={emailOverride ?? prefill.email ?? ""}
      />
    );
  }

  return (
    <>
      {/* Pre-prefill banners from the auth-callback redirect path
          (fires when a brand-new signup confirmed an email that
          turned out to mismatch the installer record). */}
      {errorFlag === "email_mismatch" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4 text-sm leading-relaxed">
          <p className="font-semibold text-red-900">
            Email didn&rsquo;t match
          </p>
          <p className="text-red-900 mt-1">
            For security we only let an installer be claimed by the
            email address on the directory record. Sign in with the
            right email, or get in touch if you need it updated.
          </p>
        </div>
      )}
      {errorFlag === "no_email" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm leading-relaxed">
          <p className="font-semibold text-amber-900">
            We can&rsquo;t auto-verify ownership
          </p>
          <p className="text-amber-900 mt-1">
            There&rsquo;s no email on file for this installer, so
            email <a href="mailto:hello@propertoasty.com" className="underline font-medium">hello@propertoasty.com</a>{" "}
            and we&rsquo;ll verify ownership manually.
          </p>
        </div>
      )}

      <CompanyCard prefill={prefill} />
      {body}
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

function NoEmailOnFileNote({ companyName }: { companyName: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
      <p className="font-semibold text-amber-900">
        We can&rsquo;t auto-verify ownership of {companyName}
      </p>
      <p className="text-amber-900 mt-1">
        There&rsquo;s no email on file for this installer, so we
        can&rsquo;t check you&rsquo;re the right person to claim it.
        Email{" "}
        <a
          href="mailto:hello@propertoasty.com"
          className="underline font-medium"
        >
          hello@propertoasty.com
        </a>{" "}
        and we&rsquo;ll sort the claim manually.
      </p>
    </div>
  );
}

function EmailMismatchNote({
  companyName,
  userEmail,
  installerEmailHint,
}: {
  companyName: string;
  userEmail: string;
  installerEmailHint: string | null;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed">
      <p className="font-semibold text-red-900">
        Wrong account for {companyName}
      </p>
      <p className="text-red-900 mt-1">
        You&rsquo;re signed in as{" "}
        <strong>{userEmail}</strong>, but {companyName}&rsquo;s
        profile is registered to{" "}
        <strong>{installerEmailHint ?? "a different email"}</strong>.
      </p>
      <p className="text-red-900 mt-2">
        Sign in with the correct email to claim, or email{" "}
        <a
          href="mailto:hello@propertoasty.com"
          className="underline font-medium"
        >
          hello@propertoasty.com
        </a>{" "}
        if the address on file is out of date and we&rsquo;ll update it
        for you.
      </p>
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center h-10 px-4 mt-3 rounded-full bg-white border border-red-200 hover:border-red-300 text-red-700 font-semibold text-xs transition-colors"
      >
        Sign in with a different email
      </Link>
    </div>
  );
}

// Two-path picker shown to anonymous users on /installer-signup
// when an installer is prefilled. Sign-in is offered first +
// prominently — most testers reaching this page already have an
// account from a prior session, and the previous "buried text
// link" UX made them think they had to start over.
function UnauthenticatedClaimChoices({
  installerId,
  installerName,
  defaultEmail,
}: {
  installerId: number;
  installerName: string;
  defaultEmail: string;
}) {
  const signInHref = `/auth/login?redirect=${encodeURIComponent(`/installer-signup?id=${installerId}`)}`;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral">
          Already on Propertoasty?
        </p>
        <p className="mt-1 text-sm text-navy leading-relaxed">
          Sign in and we&rsquo;ll bind {installerName} to your existing
          account in one click — no second password.
        </p>
        <Link
          href={signInHref}
          className="inline-flex items-center justify-center w-full h-12 mt-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Sign in to claim {installerName}
        </Link>
      </div>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-slate-200" />
        <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Or new here?
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      <div>
        <p className="text-sm font-semibold text-navy mb-3">
          Create your account
        </p>
        <ClaimSignupForm
          installerId={installerId}
          installerName={installerName}
          defaultEmail={defaultEmail}
        />
      </div>
    </div>
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

// "This profile is already claimed" — most often what the rightful
// owner sees when they've come back to /installer-signup after a
// previous claim. The dominant action should be "sign in" so they
// can get back into their portal in one click; the "wasn't me?" path
// stays available as a secondary support link.
//
// When the visitor IS signed in but still hitting this view, their
// account isn't the one bound to this installer (race-lost case) —
// we drop the sign-in CTA and lean on the support link, otherwise
// we'd point them at the page they came from.
function AlreadyClaimedNote({
  installerId,
  signedIn,
}: {
  installerId: number;
  signedIn: boolean;
}) {
  const signInHref = `/auth/login?redirect=${encodeURIComponent(`/installer-signup?id=${installerId}`)}`;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
        <p className="font-semibold text-amber-900">
          This profile is already claimed.
        </p>
        <p className="text-amber-900 mt-1">
          {signedIn
            ? "Your account isn't the one bound to this installer — somebody else has already claimed it."
            : "If that someone is you, sign in to get back to your installer portal."}
        </p>
      </div>

      {!signedIn && (
        <Link
          href={signInHref}
          className="w-full inline-flex items-center justify-center h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Sign in to your account
        </Link>
      )}

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        {signedIn ? "If that wasn't you, " : "Wasn't you? "}
        email{" "}
        <a
          href="mailto:hello@propertoasty.com"
          className="text-coral hover:text-coral-dark underline font-medium"
        >
          hello@propertoasty.com
        </a>{" "}
        and we&rsquo;ll sort it out.
      </p>
    </div>
  );
}
