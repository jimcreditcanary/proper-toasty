"use client";

// Three-stage client island for the questions step:
//   "answering" — 6 textareas + Submit
//   "drafting"  — spinner while Claude generates (~10-20s)
//   "reviewing" — markdown editor for the draft, Publish button
//
// State is purely local to this component; persisted on every
// transition via the API routes. If the installer refreshes mid-
// flow, the page component re-hydrates from the persisted answers
// + draft (see page.tsx).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Pencil,
} from "lucide-react";

interface Props {
  companyName: string;
  questions: string[];
  initialAnswers: string[];
  initialDraft: string | null;
  alreadyPublished: boolean;
}

type Stage = "answering" | "drafting" | "reviewing" | "publishing" | "done";

const MIN_ANSWER_LENGTH = 50;

export function QuestionsAndDraftFlow({
  companyName,
  questions,
  initialAnswers,
  initialDraft,
  alreadyPublished,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(initialAnswers);
  const [draft, setDraft] = useState<string | null>(initialDraft);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftExcerpt, setDraftExcerpt] = useState<string>("");
  const [draftSlug, setDraftSlug] = useState<string>("");
  const [stage, setStage] = useState<Stage>(
    alreadyPublished ? "done" : initialDraft ? "reviewing" : "answering",
  );
  const [error, setError] = useState<string | null>(null);

  const substantiveCount = answers.filter(
    (a) => a.trim().length >= MIN_ANSWER_LENGTH,
  ).length;
  const canSubmit = substantiveCount >= 3;

  async function onSubmitAnswers() {
    setError(null);
    if (!canSubmit) return;
    setStage("drafting");
    try {
      const res = await fetch("/api/installer/onboarding/blog/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            title: string;
            slug: string;
            excerpt: string;
            markdown: string;
          }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Drafting failed");
      }
      setDraft(json.markdown);
      setDraftTitle(json.title);
      setDraftExcerpt(json.excerpt);
      setDraftSlug(json.slug);
      setStage("reviewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed");
      setStage("answering");
    }
  }

  async function onRedraft() {
    setError(null);
    setStage("drafting");
    try {
      const res = await fetch("/api/installer/onboarding/blog/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, force_redraft: true }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            title: string;
            slug: string;
            excerpt: string;
            markdown: string;
          }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Re-draft failed");
      }
      setDraft(json.markdown);
      setDraftTitle(json.title);
      setDraftExcerpt(json.excerpt);
      setDraftSlug(json.slug);
      setStage("reviewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-draft failed");
      setStage("reviewing");
    }
  }

  async function onPublish() {
    if (!draft) return;
    setError(null);
    setStage("publishing");
    try {
      const res = await fetch("/api/installer/onboarding/blog/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim(),
          slug: draftSlug.trim(),
          excerpt: draftExcerpt.trim(),
          markdown: draft.trim(),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; slug: string; creditsGranted: number }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Publish failed");
      }
      setStage("done");
      setTimeout(() => {
        router.push("/installer/onboarding");
        router.refresh();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setStage("reviewing");
    }
  }

  // ── Stage: done ──
  if (stage === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 sm:p-8 text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </span>
        <h2 className="text-lg font-semibold text-navy">
          Post published, credits granted
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Taking you back to onboarding…
        </p>
      </div>
    );
  }

  // ── Stage: drafting ──
  if (stage === "drafting") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-coral mb-3" />
        <h2 className="text-sm font-semibold text-navy">
          Claude is drafting your post
        </h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          This takes 10-20 seconds. The draft uses your answers as
          load-bearing content — you&rsquo;ll review + edit before
          anything goes live.
        </p>
      </div>
    );
  }

  // ── Stage: reviewing ──
  if (stage === "reviewing" || stage === "publishing") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-coral/30 bg-coral-pale/30 p-4 text-sm leading-relaxed">
          <p className="text-navy">
            <strong>Draft ready.</strong> Review + edit anything that
            doesn&rsquo;t sound like you. Click Publish when you&rsquo;re
            happy — the post goes live at{" "}
            <code className="text-coral-dark text-xs">/blog/{draftSlug || "your-slug"}</code>{" "}
            under {companyName}&rsquo;s byline.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Title
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Slug (URL)
            </label>
            <input
              type="text"
              value={draftSlug}
              onChange={(e) =>
                setDraftSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-"),
                )
              }
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Excerpt (blog index)
            </label>
            <input
              type="text"
              value={draftExcerpt}
              maxLength={200}
              onChange={(e) => setDraftExcerpt(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Body (markdown)
            </label>
            <textarea
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
              rows={20}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm font-mono text-slate-900 leading-relaxed"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={stage === "publishing"}
            onClick={onPublish}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 text-white font-semibold text-sm transition-colors"
          >
            {stage === "publishing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Publish + claim credits
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onRedraft}
            disabled={stage === "publishing"}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium disabled:opacity-60 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Re-draft from scratch
          </button>
          <button
            type="button"
            onClick={() => setStage("answering")}
            disabled={stage === "publishing"}
            className="inline-flex items-center h-11 px-4 text-xs text-slate-500 hover:text-slate-700"
          >
            Edit answers instead
          </button>
        </div>
      </div>
    );
  }

  // ── Stage: answering ──
  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const answer = answers[i] ?? "";
        const tooShort = answer.trim().length < MIN_ANSWER_LENGTH;
        return (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-coral mb-1.5">
              Question {i + 1} of {questions.length}
            </p>
            <h3 className="text-sm font-semibold text-navy leading-relaxed">
              {q}
            </h3>
            <textarea
              value={answer}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              rows={4}
              placeholder="Speak normally. Specifics + numbers + opinions are gold here."
              className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {tooShort
                ? `Aim for at least a sentence (${answer.trim().length}/${MIN_ANSWER_LENGTH})`
                : "Looks good"}
            </p>
          </div>
        );
      })}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
        <strong className="text-navy">{substantiveCount} of 6 answered.</strong>{" "}
        You need at least 3 substantive answers to draft a post. More answered
        = better draft.
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmitAnswers}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        Submit + draft my post
      </button>

      <p className="text-center text-xs text-slate-500">
        <Link
          href="/installer/onboarding"
          className="hover:text-navy underline"
        >
          Save + come back later
        </Link>
      </p>
    </div>
  );
}
