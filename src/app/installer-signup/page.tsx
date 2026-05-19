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
import { Building2, Sparkles, ShieldCheck } from "lucide-react";
import { ClaimSignupForm } from "./signup-form";
import { ClaimSearch } from "./search";
import { ClaimAsSelfButton } from "./claim-button";
import { maskEmail } from "@/lib/installer-claim/email-mask";
import { INSTALLER_FREE_STARTER_CREDITS } from "@/lib/booking/credits";
import { verifyClaimToken } from "@/lib/outreach/claim-token";
import {
  primaryRegion,
  primaryTechBucket,
  previewTier,
  regionDisplayName,
  techBucketDisplayName,
  tierLabel,
  tierCredits,
  tierBreakdown,
  type Tier,
  type Region,
  type TechBucket,
} from "@/lib/outreach/tier-preview";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface PageProps {
  searchParams: Promise<{
    id?: string;
    email?: string;
    /** HMAC-signed token from an outreach email. Resolves to a
     *  recipient row that determines the live tier offer. */
    outreach?: string;
    /** Set by the no-slots installer email — UUID of the
     *  homeowner_leads row the signup should land on after claim
     *  completes. Threaded through claim-as-self + the signup
     *  form's auth-callback redirect. */
    lead?: string;
    /** Origin tag — currently just "no-slots". Used purely for
     *  analytics on the signup page; the redirect target carries
     *  it forward to the claim page. */
    source?: string;
    error?: "race_lost" | "email_mismatch" | "no_email" | string;
  }>;
}

interface OutreachContext {
  recipientId: string;
  /** Token is passed through to the signup form / claim-as-self
   *  button so the post-auth side can call the claim RPC. */
  token: string;
  tier: Tier;
  region: Region;
  techBucket: TechBucket;
  founderSpotsRemaining: number;
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

/**
 * Resolve the outreach context for a token-bearing landing-page
 * hit: verify the HMAC, look up the recipient, check it hasn't
 * been used / expired / unsubscribed, derive the LIVE tier from
 * the current founder_claims state for the installer's region +
 * tech bucket.
 *
 * "Live" tier — the email may have been sent when the recipient
 * was tier=founder but the spot has since been claimed by someone
 * else. We surface the current offer (Phase 0 decision 10) rather
 * than the stale one.
 *
 * Returns null when the token's invalid, the recipient's already
 * claimed, or the linked installer doesn't match the URL's `id=`.
 */
async function loadOutreachContext(
  token: string,
  expectedInstallerId: number,
): Promise<OutreachContext | null> {
  const recipientId = verifyClaimToken(token);
  if (!recipientId) return null;

  const admin = createAdminClient();

  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, installer_id, signed_up_at, state")
    .eq("id", recipientId)
    .maybeSingle<{
      id: string;
      installer_id: number;
      signed_up_at: string | null;
      state: string;
    }>();
  if (!recipient) return null;
  // URL id must match the recipient's installer id — defends against
  // a malformed link with a swapped id.
  if (recipient.installer_id !== expectedInstallerId) return null;
  // Terminal states — don't render the outreach hero (they'll just
  // see the standard signup flow if they're not signed in).
  if (
    recipient.state === "unsubscribed" ||
    recipient.state === "complained" ||
    recipient.state === "bounced"
  ) {
    return null;
  }

  const { data: installer } = await admin
    .from("installers")
    .select("*")
    .eq("id", recipient.installer_id)
    .maybeSingle<InstallerRow>();
  if (!installer) return null;

  const region = primaryRegion(installer);
  const bucket = primaryTechBucket(installer);
  if (!region || !bucket) return null;

  const { data: claims } = await admin
    .from("outreach_founder_claims")
    .select("*")
    .eq("region", region)
    .eq("tech_bucket", bucket)
    .maybeSingle<
      Database["public"]["Tables"]["outreach_founder_claims"]["Row"]
    >();

  const tier = previewTier(claims ?? null);
  return {
    recipientId,
    token,
    tier,
    region,
    techBucket: bucket,
    founderSpotsRemaining: claims
      ? Math.max(0, 5 - claims.tier_2_claimed_count)
      : 5,
  };
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
  const outreachToken = params.outreach ?? null;
  const idNum = idRaw ? Number(idRaw) : null;
  // When the no-slots installer email kicks the user here, `lead`
  // holds the homeowner-leads UUID the post-claim landing should go
  // to. UUID-shape only — anything else is dropped to avoid open
  // redirect via the auth callback's `?next=`.
  const noSlotsLeadId =
    params.lead && /^[0-9a-f-]{36}$/i.test(params.lead) ? params.lead : null;
  const postClaimRedirect = noSlotsLeadId
    ? `/installer/leads/${noSlotsLeadId}/claim?source=no-slots`
    : null;

  // Resolve the installer if we got an id. Bad ids fall back to
  // search mode rather than 404 — saves a click for users who hit
  // a stale URL.
  let prefill: PrefillData | null = null;
  if (idNum && Number.isFinite(idNum) && idNum > 0) {
    prefill = await loadInstaller(idNum);
  }

  // Outreach context — only present when a recipient is landing here
  // via an outreach email's claim URL. Verified independently of the
  // installer prefill so a missing/expired token falls back to the
  // plain signup view without breaking anything.
  let outreach: OutreachContext | null = null;
  if (outreachToken && idNum) {
    outreach = await loadOutreachContext(outreachToken, idNum);
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
  //
  // When `postClaimRedirect` is set (no-slots installer email landed
  // them here with a lead in tow) skip the dashboard and land them
  // on the lead claim page instead — that's the whole reason they
  // were emailed.
  if (prefill && user && prefill.ownerUserId === user.id) {
    redirect(postClaimRedirect ?? "/installer");
  }

  return (
    <main className="min-h-screen bg-cream-deep px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* flex-col so each child sits on its own row. Was a plain
            text-center wrapper — Logo's <Link> is inline-block and
            the pill is inline-flex, so they flowed on the same line
            (pill hugging the logo's right side) instead of stacking. */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo size="md" variant="light" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-pale border border-coral/30 text-coral-dark text-[11px] font-bold uppercase tracking-wider mb-3">
            🎁 {INSTALLER_FREE_STARTER_CREDITS} free credits on signup
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
            {prefill
              ? `Claim ${prefill.companyName}`
              : "Find your MCS-listed company"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {prefill
              ? `Confirm this is your company, set a password, and ${INSTALLER_FREE_STARTER_CREDITS} credits land in your balance the moment you finish.`
              : `Search by company name or Companies House number — we'll match you to your existing MCS profile + grant ${INSTALLER_FREE_STARTER_CREDITS} starter credits when you claim.`}
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

        {outreach && prefill && (
          <OutreachHero
            outreach={outreach}
            companyName={prefill.companyName}
          />
        )}

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          {prefill ? (
            <PrefillView
              prefill={prefill}
              emailOverride={emailOverride}
              signedInEmail={signedInEmail}
              errorFlag={errorFlag}
              outreachToken={outreach?.token ?? null}
              postClaimRedirect={postClaimRedirect}
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
  outreachToken,
  postClaimRedirect,
}: {
  prefill: PrefillData;
  emailOverride: string | undefined;
  signedInEmail: string | null;
  errorFlag: string | null;
  /** Outreach claim token passed through to the signup form +
   *  claim-as-self button so the post-auth side can call the
   *  outreach_claim_founder_offer RPC. */
  outreachToken: string | null;
  /** Where to land the user once the claim completes. NULL = the
   *  standard /installer dashboard. Currently set by the no-slots
   *  installer email so the freshly-claimed installer lands on the
   *  lead they were emailed about. */
  postClaimRedirect: string | null;
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
        outreachToken={outreachToken}
        postClaimRedirect={postClaimRedirect}
      />
    );
  } else {
    body = (
      <UnauthenticatedClaimChoices
        installerId={prefill.id}
        installerName={prefill.companyName}
        defaultEmail={emailOverride ?? prefill.email ?? ""}
        outreachToken={outreachToken}
        postClaimRedirect={postClaimRedirect}
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
  outreachToken,
  postClaimRedirect,
}: {
  installerId: number;
  installerName: string;
  defaultEmail: string;
  outreachToken: string | null;
  postClaimRedirect: string | null;
}) {
  // Outreach claimants who sign in (rather than create an account)
  // come back to this exact page, so the redirect target preserves
  // the outreach token — otherwise the post-signin redirect would
  // drop the tier offer.
  const returnPath = outreachToken
    ? `/installer-signup?id=${installerId}&outreach=${encodeURIComponent(outreachToken)}`
    : `/installer-signup?id=${installerId}`;
  const signInHref = `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
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
          outreachToken={outreachToken}
          postClaimRedirect={postClaimRedirect}
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

// ─── Outreach hero ──────────────────────────────────────────────────
//
// Rendered above the standard signup card when the URL carries a
// valid outreach token. Mirrors the four trust beats from the Phase 4
// brief:
//
//   1. Personalised hero — "<First>, here's your <Tier> offer"
//   2. Live tier counter — only for founder + early_access (standard
//      doesn't have a "scarcity" angle)
//   3. Progressive unlocks — 4 asks with per-step credit amounts.
//      Standard tier hides the per-step badges (all zeros would
//      look demoralising).
//   4. Trust copy — reject any lead, no charge until value, etc.

function OutreachHero({
  outreach,
  companyName,
}: {
  outreach: OutreachContext;
  companyName: string;
}) {
  const breakdown = tierBreakdown(outreach.tier);
  const showCounter =
    outreach.tier === "founder" || outreach.tier === "early_access";
  const showCreditBadges = outreach.tier !== "standard";
  const headline =
    outreach.tier === "founder"
      ? `Founder offer for ${companyName}`
      : outreach.tier === "early_access"
        ? `Early access offer for ${companyName}`
        : `Welcome offer for ${companyName}`;
  const stepLabel: Record<typeof breakdown[number]["step"], string> = {
    signup: "Create your account",
    profile: "Complete your profile (logo, services, coverage, bio)",
    questions: "Answer 6 questions (becomes your installer-bylined blog post)",
    card: "Connect a card for future top-ups (no charge today)",
  };
  return (
    <section className="rounded-2xl border border-coral/40 bg-white shadow-sm p-6 sm:p-8 mb-6">
      <header className="flex items-start gap-3 mb-3">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-coral">
            {tierLabel(outreach.tier)} tier · up to {tierCredits(outreach.tier)} credits
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-navy leading-tight mt-1">
            {headline}
          </h2>
        </div>
      </header>

      {showCounter && (
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {outreach.tier === "founder"
            ? `You're the first ${techBucketDisplayName(outreach.techBucket)} installer we've offered the founder slot to in ${regionDisplayName(outreach.region)}. Claim it and you're our exclusive featured installer for this combo.`
            : `${outreach.founderSpotsRemaining} of 5 early access spots remain for ${techBucketDisplayName(outreach.techBucket)} installers in ${regionDisplayName(outreach.region)}.`}
        </p>
      )}

      <ol className="space-y-2 mb-5">
        {breakdown.map((step, i) => (
          <li
            key={step.step}
            className="flex items-start gap-3 text-sm leading-relaxed"
          >
            <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream border border-[var(--border)] text-[11px] font-bold text-navy mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-navy">{stepLabel[step.step]}</span>
              {showCreditBadges && step.credits > 0 && (
                <span className="inline-flex items-center text-[11px] font-bold text-coral-dark bg-coral-pale rounded-full px-2 py-0.5">
                  +{step.credits} credits
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      <ul className="space-y-1.5 mb-1 text-xs text-slate-600 leading-relaxed">
        <li className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>Reject any lead, one click, no charge.</span>
        </li>
        <li className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>No subscription. No minimum spend.</span>
        </li>
        <li className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>We don&rsquo;t charge a penny until you&rsquo;ve had value out of us.</span>
        </li>
      </ul>
    </section>
  );
}
