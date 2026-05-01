// Single source of truth for installer credit pack pricing.
//
// Used by:
//   - /api/installer/credits/checkout — pricing for the Stripe
//     Checkout `price_data` payload
//   - /installer/credits page — pricing tiles
//   - The webhook — to look up `pack_credits` + `price_pence` when
//     persisting the audit row, defending against checkout-side
//     metadata tampering
//
// We use inline `price_data` rather than pre-created Stripe Price
// IDs so prices live in code (= reviewable, version-controlled, no
// env-var-per-pack sprawl). To change a price, edit this file +
// redeploy.

export interface CreditPack {
  /** Stable identifier passed through Stripe metadata so the webhook
   *  can look the pack back up. Keep these short and immutable; if
   *  you change the meaning of an id, ship a new one and retire the
   *  old. */
  id: "starter" | "growth" | "scale" | "volume";
  /** What the customer sees on the tile. */
  label: string;
  /** Optional subtitle / value-prop line. */
  tagline: string;
  /** Number of credits granted on a successful checkout. */
  credits: number;
  /** Price in pence (GBP). 9500 = £95.00. */
  pricePence: number;
  /** Display: cost per credit in pounds, rounded to 2dp. */
  perCreditGbp: number;
  /** Marks the pack we surface as "most popular" on the tile. */
  highlight?: boolean;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  {
    id: "starter",
    label: "Starter",
    tagline: "Try the platform — six accepted leads.",
    credits: 30,
    pricePence: 9500,
    perCreditGbp: 3.17,
  },
  {
    id: "growth",
    label: "Growth",
    tagline: "Most popular — 20 accepted leads.",
    credits: 100,
    pricePence: 19500,
    perCreditGbp: 1.95,
    highlight: true,
  },
  {
    id: "scale",
    label: "Scale",
    tagline: "Best per-lead value — 50 accepted leads.",
    credits: 250,
    pricePence: 39500,
    perCreditGbp: 1.58,
  },
  {
    id: "volume",
    label: "Volume",
    tagline: "Top-tier rate — 200 accepted leads.",
    credits: 1000,
    pricePence: 99500,
    perCreditGbp: 1.0,
  },
] as const;

export function findPack(id: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null;
}

export function findPackByCredits(credits: number): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.credits === credits) ?? null;
}

// Format pence as an inclusive-VAT GBP string for UI surfaces.
// We don't apply VAT separately — prices are stated VAT-inclusive.
export function formatGbp(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  });
}
