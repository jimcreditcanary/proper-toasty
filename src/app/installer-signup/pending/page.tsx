// Confirmation page after the signup form submits — "we sent you an
// email, click the link to finish".
//
// The actual claim binding doesn't happen here. It happens in
// src/app/auth/callback once the user confirms their email — that's
// the only point we know they actually own the address.

import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ email?: string; installer?: string }>;
}

export default async function InstallerSignupPendingPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const email = params.email ?? null;
  const installer = params.installer ?? null;

  return (
    <main className="min-h-screen bg-cream-deep px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-block mb-6">
          <Logo size="md" variant="light" />
        </Link>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="mx-auto mb-5 flex w-14 h-14 items-center justify-center rounded-full bg-coral/10">
            <Mail className="w-6 h-6 text-coral" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
            Check your email
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            We&rsquo;ve sent a confirmation link to{" "}
            <strong className="text-navy">
              {email ?? "the address you signed up with"}
            </strong>
            . Click it to finish claiming
            {installer ? ` ${installer}` : " your profile"}.
          </p>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-left text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-navy text-[13px] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-coral" />
              What happens next
            </p>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>You confirm the link in that email.</li>
              <li>
                We bind your account to your MCS profile so leads come
                through.
              </li>
              <li>
                You land in the installer portal — buy credits, set
                availability, and start accepting leads.
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Didn&rsquo;t see it? Check spam, or{" "}
            <Link
              href="/installer-signup"
              className="text-coral hover:text-coral-dark font-medium"
            >
              try a different email
            </Link>
            .
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
          Already confirmed?{" "}
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
