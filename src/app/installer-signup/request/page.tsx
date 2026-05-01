// /installer-signup/request — F3 entry point.
//
// Reached when a user searches /installer-signup, finds nothing, and
// clicks "Can't find your company? Request to be added →".
//
// The form is a single-page interactive client island:
//   1. Companies House number (top of form)
//   2. Lookup button → prefills company name + address + incorporation
//      date in fields below
//   3. Contact + capability + MCS fields
//   4. Submit → POST /api/installer-signup/request → /pending
//
// Sole traders without a CH number can skip step 1 and fill name +
// address manually. The form makes that path obvious.

import Link from "next/link";
import { Logo } from "@/components/logo";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export default function InstallerSignupRequestPage() {
  return (
    <main className="min-h-screen bg-cream-deep px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo size="md" variant="light" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
            Request to join the directory
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Tell us about your company and we&rsquo;ll check you out.
            Most requests get a response within a working day.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <RequestForm />
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
          Already MCS-listed?{" "}
          <Link
            href="/installer-signup"
            className="text-coral hover:text-coral-dark font-medium"
          >
            Search the directory instead
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
