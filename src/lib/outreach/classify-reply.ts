// Classify an inbound outreach reply using Claude. Single short call
// per reply; returns one of five intents. Falls back to 'unknown'
// when the API is unavailable or returns garbage.
//
// Cost: ~$0.0001 per call at current Sonnet pricing (a few hundred
// tokens in, ~50 tokens out). Negligible.

import Anthropic from "@anthropic-ai/sdk";

export type ReplyIntent =
  | "unsubscribe"
  | "out_of_office"
  | "interested"
  | "question"
  | "complaint"
  | "unknown";

interface ClassifyInput {
  /** Trimmed plain-text body of the reply. We strip the quoted-
   *  original section before passing so the model judges intent
   *  on the reply itself, not the email it's replying to. */
  text: string;
  subject: string | null;
}

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You classify B2B installer replies to a cold outreach email.

Output exactly one of these intent codes — no other text:
- unsubscribe   — they want to be removed / opt out / stop receiving
- out_of_office — autoresponder ("I'm away until...", "OOO")
- interested    — they're asking how to sign up, want a call, expressing positive interest
- question      — neutral question about the offer or company
- complaint     — angry, abusive, threatening legal action, or accusing of spam
- unknown       — none of the above clearly applies

Pick the BEST single fit. If the reply contains a strong opt-out signal alongside other content, classify as unsubscribe. If they're complaining AND threatening legal action, classify as complaint.`;

/**
 * Strip quoted original-message text. Heuristic — handles the
 * common reply patterns (Outlook's "From: ... Sent: ...", Gmail's
 * "> wrote:" pattern, lines starting with ">").
 */
export function stripQuotedReply(text: string): string {
  // Cut at the first occurrence of any quote-start marker.
  const markers = [
    /^From: .+$/im,
    /^On .+ wrote:$/im,
    /^>+ .+/m,
    /^-+\s*Original Message\s*-+$/im,
  ];
  let cutAt = text.length;
  for (const re of markers) {
    const m = re.exec(text);
    if (m && m.index < cutAt) cutAt = m.index;
  }
  return text.slice(0, cutAt).trim();
}

export async function classifyReply(
  input: ClassifyInput,
): Promise<{ intent: ReplyIntent; confidence: "high" | "low" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[outreach/classify-reply] ANTHROPIC_API_KEY missing");
    return { intent: "unknown", confidence: "low" };
  }
  const trimmed = stripQuotedReply(input.text).slice(0, 4000);
  if (trimmed.length < 3) {
    return { intent: "unknown", confidence: "low" };
  }

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 20,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Subject: ${input.subject ?? "(none)"}\n\nReply body:\n${trimmed}`,
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { intent: "unknown", confidence: "low" };
    }
    const raw = textBlock.text.trim().toLowerCase();
    const valid: ReplyIntent[] = [
      "unsubscribe",
      "out_of_office",
      "interested",
      "question",
      "complaint",
      "unknown",
    ];
    const match = valid.find((v) => raw === v || raw.startsWith(v));
    return {
      intent: match ?? "unknown",
      confidence: match ? "high" : "low",
    };
  } catch (e) {
    console.warn("[outreach/classify-reply] claude call failed", {
      err: e instanceof Error ? e.message : String(e),
    });
    return { intent: "unknown", confidence: "low" };
  }
}
