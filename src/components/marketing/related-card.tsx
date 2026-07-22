// Related-card tile used at the bottom of money pages (/heatpump,
// /solar, /replace-my-boiler) to point at deep guides / comparisons
// / installer directories. Kept in one place so the visual + hover
// behaviour stays consistent across those surfaces.

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface RelatedCardProps {
  /** Absolute path to link to (starts with /). */
  href: string;
  /** Short category label rendered as an uppercase eyebrow. */
  eyebrow: string;
  /** Card title — the destination page's H1 or an editorialised
   *  question that reflects it. */
  title: string;
  /** One-sentence explanation of what the reader gets on click. */
  body: string;
}

export function RelatedCard({
  href,
  eyebrow,
  title,
  body,
}: RelatedCardProps): React.ReactElement {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--border)] bg-white p-6 hover:border-coral hover:shadow-sm transition-all"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-coral mb-2">
        {eyebrow}
      </p>
      <h3 className="text-base font-semibold text-navy leading-snug group-hover:text-coral transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed">
        {body}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-coral">
        Read more
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}
