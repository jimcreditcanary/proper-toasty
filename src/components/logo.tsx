const SIZES = {
  sm: { mark: 30, text: "text-base", gap: "gap-2" },
  md: { mark: 42, text: "text-xl", gap: "gap-2.5" },
  lg: { mark: 54, text: "text-2xl", gap: "gap-3" },
  xl: { mark: 68, text: "text-3xl", gap: "gap-3.5" },
} as const;

type LogoSize = keyof typeof SIZES;
type LogoVariant = "dark" | "light" | "pill";

const WORDMARK_STYLE = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
  fontWeight: 600,
  fontVariationSettings: '"SOFT" 100, "WONK" 0',
  fontOpticalSizing: "auto" as const,
  letterSpacing: "-0.02em",
};

export function Logo({
  size = "md",
  variant = "dark",
  showTagline = false,
  className = "",
}: {
  size?: LogoSize;
  variant?: LogoVariant;
  showTagline?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const wordColor = variant === "light" ? "text-navy" : "text-white";
  const tagColor = variant === "light" ? "text-[var(--muted-brand)]" : "text-[var(--muted-light)]";

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <LogoIcon size={size} />
      <div className="flex flex-col">
        <span
          className={`${s.text} leading-none ${wordColor}`}
          style={WORDMARK_STYLE}
        >
          Propertoasty
        </span>
        {showTagline && (
          <span
            className={`text-[11px] font-light mt-1 ${tagColor}`}
            style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
          >
            a warmer home, made simple
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Single-leaf mark, filled with a "toasty" gradient — terracotta through
 * amber to a warm peach — to suggest the warmth of a well-heated home
 * without literally drawing toast. Minimal vein for definition.
 */
export function LogoIcon({
  size = "md",
  className = "",
}: {
  size?: LogoSize;
  pill?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const markPx = s.mark;
  const gradId = `toasty-${size}`;

  return (
    <svg
      width={markPx}
      height={markPx}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Propertoasty"
    >
      <defs>
        <linearGradient id={gradId} x1="12%" y1="15%" x2="85%" y2="88%">
          <stop offset="0%" stopColor="#C4533E" />
          <stop offset="45%" stopColor="#D9813C" />
          <stop offset="80%" stopColor="#E8B647" />
          <stop offset="100%" stopColor="#F4CC6E" />
        </linearGradient>
      </defs>

      {/* Leaf silhouette — asymmetric teardrop, tilted like the 🍃 emoji */}
      <path
        d="M10 38 C 10 22, 20 10, 38 10 C 40 26, 32 38, 14 42 L10 42 Z"
        fill={`url(#${gradId})`}
      />

      {/* Midrib vein, subtle */}
      <path
        d="M12 40 Q 24 28, 36 12"
        stroke="#FAF7F2"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}
