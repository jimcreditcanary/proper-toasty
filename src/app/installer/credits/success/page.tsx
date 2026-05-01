// /installer/credits/success — landing page Stripe sends the user
// back to after a successful checkout.
//
// The webhook is the source of truth for crediting the account.
// There's a small race between Stripe's redirect (browser-side) and
// the webhook delivery (server-side); we side-step it by polling
// until the audit row appears, then surfacing the new balance.

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { SuccessPoller } from "./success-poller";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CreditsSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id ?? null;

  return (
    <main className="min-h-screen bg-cream-deep px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-block mb-6">
          <Logo size="md" variant="light" />
        </Link>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="mx-auto mb-5 flex w-14 h-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
            Payment received
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Thanks — your credits are landing in your account now. We&rsquo;ll
            update this page as soon as Stripe confirms.
          </p>

          <SuccessPoller sessionId={sessionId} />

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Receipt + invoice from Stripe will arrive in your email.
          </p>
        </div>
      </div>
    </main>
  );
}
