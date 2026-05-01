// "Got it — we'll be in touch" landing after a successful request
// submission. No account-confirmation step here; that comes after
// admin approval (via the F2 claim flow).

import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function RequestPendingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ?? null;

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
            Request received
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Thanks for the details. We&rsquo;ve sent a confirmation to{" "}
            <strong className="text-navy">
              {email ?? "the email you used"}
            </strong>{" "}
            and one of us will review your request within a working day.
          </p>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-left text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-navy text-[13px] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-coral" />
              What happens next
            </p>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                We&rsquo;ll cross-check your MCS certification and
                Companies House details.
              </li>
              <li>
                If we need anything else (proof of certification,
                BUS reference) we&rsquo;ll reply directly.
              </li>
              <li>
                Once approved, you&rsquo;ll get a link to set a password
                and start receiving leads.
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Need to chase or change anything? Just reply to the
            confirmation email.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
          Already approved?{" "}
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
