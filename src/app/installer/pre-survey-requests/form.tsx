"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertCircle, Wallet, Plus, X } from "lucide-react";

interface Props {
  balance: number;
  costPerSend: number;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export function PreSurveyForm({ balance, costPerSend }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  // Meeting capture — does the installer already have a site visit
  // booked? If yes, the homeowner's report hides the Book tab and
  // surfaces a banner with the date/time. If no, it shows the
  // focused single-installer booking card.
  const [meetingBooked, setMeetingBooked] = useState<"yes" | "no">("no");
  const [meetingAt, setMeetingAt] = useState(""); // local-input "YYYY-MM-DDTHH:mm"
  // Batch 2 — installer-chosen tech scope. Defaults to HP + Solar
  // (matches the previous hardcoded capture behaviour). Battery off
  // by default — most installers don't sell battery and it's an
  // add-on to solar anyway.
  const [wantsHp, setWantsHp] = useState(true);
  const [wantsSolar, setWantsSolar] = useState(true);
  const [wantsBattery, setWantsBattery] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const insufficient = balance < costPerSend;
  // Scope CHECK enforced server-side (migration 060). Mirror in the
  // form so the disabled submit button gives the installer instant
  // feedback rather than a 400 after press.
  const scopeUnset = !wantsHp && !wantsSolar;

  // Reset form state on close. Called from every close-path so the
  // next open starts clean — avoids running this in an effect (which
  // the new react-hooks/set-state-in-effect rule disallows).
  const closeModal = () => {
    setOpen(false);
    setState({ kind: "idle" });
  };

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficient) {
      setState({
        kind: "error",
        message: `You need at least ${costPerSend} credit. Top up from /installer/credits.`,
      });
      return;
    }
    if (!name.trim() || !email.trim()) {
      setState({ kind: "error", message: "Name + email needed." });
      return;
    }
    if (meetingBooked === "yes" && !meetingAt) {
      setState({
        kind: "error",
        message: "Pick the meeting date + time.",
      });
      return;
    }
    if (scopeUnset) {
      setState({
        kind: "error",
        message: "Pick at least one of Heat pump or Solar.",
      });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/installer/pre-survey-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact_name: name.trim(),
          contact_email: email.trim(),
          contact_postcode: postcode.trim() || undefined,
          meeting_status: meetingBooked === "yes" ? "booked" : "not_booked",
          // Convert the local datetime input ("YYYY-MM-DDTHH:mm") into
          // a full ISO 8601 string. Browser interprets the value as
          // local time; new Date(...).toISOString() converts to UTC.
          meeting_at:
            meetingBooked === "yes" && meetingAt
              ? new Date(meetingAt).toISOString()
              : null,
          // Batch 2 — installer-chosen scope. Wizard focus + the
          // resulting installer_lead's wants_* flags are derived
          // from these. Battery without solar is rejected
          // server-side (CHECK constraint), so we force-uncheck
          // battery if solar is unchecked at submit-time.
          wants_heat_pump: wantsHp,
          wants_solar: wantsSolar,
          wants_battery: wantsSolar && wantsBattery,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          kind: "error",
          message: j.error ?? "Send failed — try again",
        });
        return;
      }
      // Reset + close + refresh the server tree so the new row
      // appears in the list below.
      setName("");
      setEmail("");
      setPostcode("");
      setMeetingBooked("no");
      setMeetingAt("");
      setWantsHp(true);
      setWantsSolar(true);
      setWantsBattery(false);
      setState({ kind: "idle" });
      closeModal();
      router.replace("/installer/pre-survey-requests?sent=1");
      router.refresh();
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  return (
    <>
      {/* Trigger row — collapsed by default so the list dominates. */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Send a new request
        </button>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            insufficient
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-white text-slate-700 border border-slate-200"
          }`}
        >
          <Wallet className="w-3 h-3" />
          {balance} credit{balance === 1 ? "" : "s"}
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalForm
              onClose={closeModal}
              balance={balance}
              costPerSend={costPerSend}
              insufficient={insufficient}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              postcode={postcode}
              setPostcode={setPostcode}
              meetingBooked={meetingBooked}
              setMeetingBooked={setMeetingBooked}
              meetingAt={meetingAt}
              setMeetingAt={setMeetingAt}
              wantsHp={wantsHp}
              setWantsHp={setWantsHp}
              wantsSolar={wantsSolar}
              setWantsSolar={setWantsSolar}
              wantsBattery={wantsBattery}
              setWantsBattery={setWantsBattery}
              scopeUnset={scopeUnset}
              state={state}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal body ──────────────────────────────────────────────────

function ModalForm(props: {
  onClose: () => void;
  balance: number;
  costPerSend: number;
  insufficient: boolean;
  name: string;
  setName: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  postcode: string;
  setPostcode: (s: string) => void;
  meetingBooked: "yes" | "no";
  setMeetingBooked: (v: "yes" | "no") => void;
  meetingAt: string;
  setMeetingAt: (s: string) => void;
  wantsHp: boolean;
  setWantsHp: (v: boolean) => void;
  wantsSolar: boolean;
  setWantsSolar: (v: boolean) => void;
  wantsBattery: boolean;
  setWantsBattery: (v: boolean) => void;
  scopeUnset: boolean;
  state: SubmitState;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const {
    onClose,
    balance,
    costPerSend,
    insufficient,
    name,
    setName,
    email,
    setEmail,
    postcode,
    setPostcode,
    meetingBooked,
    setMeetingBooked,
    meetingAt,
    setMeetingAt,
    wantsHp,
    setWantsHp,
    wantsSolar,
    setWantsSolar,
    wantsBattery,
    setWantsBattery,
    scopeUnset,
    state,
    onSubmit,
  } = props;
  return (
    <form
      onSubmit={onSubmit}
      className="p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-navy">
            Send a customer their personalised check link
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            They&rsquo;ll get an email from{" "}
            <span className="font-medium">your</span> company name with
            a 5-minute check link. The completed report lands in your
            leads inbox.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-end">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            insufficient
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <Wallet className="w-3 h-3" />
          {balance} credit{balance === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Customer name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sam Patel"
            maxLength={120}
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Customer email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sam@example.com"
            maxLength={254}
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Postcode <span className="text-slate-400 font-normal normal-case">(optional)</span>
        </span>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          maxLength={10}
          className="w-full sm:w-48 h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 uppercase focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          We pre-fill the customer&rsquo;s wizard with their postcode so
          they spend less time hunting for their address.
        </p>
      </label>

      {/* Scope — what the installer wants the customer assessed for.
          Drives both the homeowner wizard's `focus` (so a heat-pump-
          only installer's customer doesn't get asked solar questions)
          and the installer_lead's wants_* flags on completion.
          Battery is conditional on solar — battery without solar
          isn't a /check product (CHECK constraint enforces). */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          What do you want assessed?
        </legend>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={wantsHp}
              onChange={(e) => setWantsHp(e.target.checked)}
              className="w-4 h-4 text-coral focus:ring-coral border-slate-300 rounded"
            />
            <span className="text-slate-700">Heat pump</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={wantsSolar}
              onChange={(e) => {
                const v = e.target.checked;
                setWantsSolar(v);
                if (!v) setWantsBattery(false);
              }}
              className="w-4 h-4 text-coral focus:ring-coral border-slate-300 rounded"
            />
            <span className="text-slate-700">Solar</span>
          </label>
          <label
            className={`inline-flex items-center gap-2 text-sm ${
              wantsSolar ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
          >
            <input
              type="checkbox"
              checked={wantsBattery}
              onChange={(e) => setWantsBattery(e.target.checked)}
              disabled={!wantsSolar}
              className="w-4 h-4 text-coral focus:ring-coral border-slate-300 rounded"
            />
            <span className="text-slate-700">Battery</span>
          </label>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          We&rsquo;ll tailor the customer&rsquo;s check to just these
          products — fewer questions, focused report. Battery is only
          assessed alongside solar.
        </p>
        {scopeUnset && (
          <p className="text-[10px] text-red-700 mt-1.5 font-semibold">
            Pick at least one of Heat pump or Solar.
          </p>
        )}
      </fieldset>

      {/* Meeting capture — drives the homeowner report's Book-tab
          rendering. "Yes, booked" hides the Book tab + shows a
          banner with the date/time; "Not yet" shows the focused
          single-installer booking card (default). */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Site visit booked already?
        </legend>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="meeting_booked"
              checked={meetingBooked === "no"}
              onChange={() => setMeetingBooked("no")}
              className="w-4 h-4 text-coral focus:ring-coral border-slate-300"
            />
            <span className="text-slate-700">Not yet</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="meeting_booked"
              checked={meetingBooked === "yes"}
              onChange={() => setMeetingBooked("yes")}
              className="w-4 h-4 text-coral focus:ring-coral border-slate-300"
            />
            <span className="text-slate-700">Yes, already booked</span>
          </label>
        </div>
        {meetingBooked === "yes" && (
          <div className="mt-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Meeting date + time
              </span>
              <input
                type="datetime-local"
                value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)}
                className="h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                required
              />
            </label>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              We&rsquo;ll show this on the customer&rsquo;s report and hide
              the &ldquo;book a site visit&rdquo; tab — they&rsquo;ll know the
              visit&rsquo;s already arranged with you.
            </p>
          </div>
        )}
      </fieldset>

      {state.kind === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-red-900">{state.message}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <p className="text-xs text-slate-500">
          Cost: <strong className="text-navy">{costPerSend} credit</strong>{" "}
          per send. Resends after 72h cost another credit.
        </p>
        <button
          type="submit"
          disabled={
            state.kind === "submitting" || insufficient || scopeUnset
          }
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state.kind === "submitting" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send the check link
        </button>
      </div>
    </form>
  );
}
