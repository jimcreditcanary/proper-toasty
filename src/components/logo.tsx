const SIZES = {
  sm: { mark: 39, text: "text-[1.625rem]", gap: "gap-2.5" }, // 26px
  md: { mark: 55, text: "text-[1.95rem]", gap: "gap-3" },    // 31px
  lg: { mark: 70, text: "text-[2.44rem]", gap: "gap-3.5" },  // 39px
  xl: { mark: 88, text: "text-[2.93rem]", gap: "gap-4" },    // 47px
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

// "Toasty" gets the warm gradient + a heavier weight so the word glows and
// leans forward in the wordmark — visually answering the question the word
// asks: if the home is toasty, the letters should glow like embers.
const TOASTY_GRADIENT_STYLE = {
  backgroundImage:
    "linear-gradient(135deg, #A43B2E 0%, #D9813C 35%, #E8B647 70%, #F8D97A 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  fontWeight: 800,
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
          className={`${s.text} leading-none ${wordColor} whitespace-nowrap`}
          style={WORDMARK_STYLE}
          aria-label="Proper Toasty"
        >
          <span>Proper&nbsp;</span>
          <span style={TOASTY_GRADIENT_STYLE}>Toasty</span>
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
 * A small cluster of stylised leaves that read as flames — one central
 * tall "flame-leaf" flanked by two smaller ones, each tip tapered like a
 * flame tongue. The gradient runs from autumnal russet at the base
 * (where the fuel sits) to a bright toasty yellow at the tips.
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
        <linearGradient id={gradId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#A43B2E" />
          <stop offset="35%" stopColor="#D9813C" />
          <stop offset="70%" stopColor="#E8B647" />
          <stop offset="100%" stopColor="#F8D97A" />
        </linearGradient>
      </defs>

      {/* Left leaf-flame — shortest, tilts outward. */}
      <path
        d="M12 42
           C 8 34, 9 25, 14 18
           C 17 22, 18 28, 17 35
           C 16 39, 14 41, 12 42 Z"
        fill={`url(#${gradId})`}
      />

      {/* Right leaf-flame — medium height, mirrors the left with asymmetry. */}
      <path
        d="M36 42
           C 40 33, 38 24, 33 16
           C 31 21, 30 28, 31 34
           C 32 38, 34 41, 36 42 Z"
        fill={`url(#${gradId})`}
      />

      {/* Centre leaf-flame — tallest, rises between the other two. */}
      <path
        d="M24 44
           C 18 35, 18 22, 23 8
           C 25 11, 28 20, 29 28
           C 30 35, 28 40, 24 44 Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}
