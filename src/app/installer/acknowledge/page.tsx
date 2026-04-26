// Landing page the installer sees after clicking the magic link in
// their booking-notification email. The /api/installer-leads/acknowledge
// endpoint redirects here with ?state=ok|invalid|expired|error.

import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AcknowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const state = params.state ?? "invalid";

  let title: string;
  let body: string;
  let tone: "ok" | "warn" | "error";
  switch (state) {
    case "ok":
      title = "You're all set — they know you've got it";
      body =
        "Thanks for picking this lead up. The homeowner has been told you'll be in touch within a couple of working days. The original email has their contact details — just hit Reply to get the conversation going.";
      tone = "ok";
      break;
    case "invalid":
      title = "Hmm, this link isn't quite right";
      body =
        "The booking link looks broken or has been tampered with. If you got this from a Propertoasty email, try opening it from the original message. Still stuck? Just reply to that email and we'll sort it.";
      tone = "warn";
      break;
    case "expired":
      title = "This link has expired";
      body =
        "The acknowledge link is no longer valid. The booking is still in our system — reply to the original email to get in touch with the homeowner directly.";
      tone = "warn";
      break;
    case "error":
    default:
      title = "Something went wrong on our end";
      body =
        "We couldn't process that acknowledge click. The booking is safe — reply to the original email and we'll make sure it's marked as picked up.";
      tone = "error";
      break;
  }

  const accentColour =
    tone === "ok" ? "bg-emerald-100 text-emerald-700" :
    tone === "warn" ? "bg-amber-100 text-amber-800" :
    "bg-red-100 text-red-700";

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-deep to-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[var(--border)] shadow-sm p-6 sm:p-8 text-center">
        <span
          className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 text-xl font-bold ${accentColour}`}
        >
          {tone === "ok" ? "✓" : tone === "warn" ? "?" : "!"}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {body}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Back to Propertoasty
        </Link>
      </div>
    </main>
  );
}
