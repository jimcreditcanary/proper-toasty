const SIZES = {
  sm: { mark: 32, text: "text-base", gap: "gap-2" },
  md: { mark: 44, text: "text-xl", gap: "gap-2.5" },
  lg: { mark: 56, text: "text-2xl", gap: "gap-3" },
  xl: { mark: 72, text: "text-3xl", gap: "gap-3.5" },
} as const;

type LogoSize = keyof typeof SIZES;
type LogoVariant = "dark" | "light" | "pill";

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

  const inner = (
    <div className={`flex items-center ${s.gap}`}>
      <LogoIcon size={size} />
      <div className="flex flex-col">
        <span
          className={`font-semibold ${s.text} leading-none tracking-[-0.02em] ${wordColor}`}
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
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

  if (variant === "pill") {
    return (
      <div
        className={`inline-flex items-center bg-coral rounded-full px-4 py-2 ${className}`}
      >
        <div className={`flex items-center ${s.gap}`}>
          <LogoIcon size={size} pill />
          <span
            className={`font-semibold ${s.text} leading-none tracking-[-0.02em] text-white`}
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Propertoasty
          </span>
        </div>
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function LogoIcon({
  size = "md",
  pill = false,
  className = "",
}: {
  size?: LogoSize;
  pill?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const markPx = s.mark;

  return (
    <svg
      width={markPx}
      height={markPx}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Propertoasty"
    >
      {/* Soft rounded square — forest green on light, white on pill */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        fill={pill ? "rgba(255,255,255,0.14)" : "#2C5E4A"}
      />

      {/* Stylised house + leaf mark */}
      {/* Leaf curl (suggests greener living) */}
      <path
        d="M18 40 C 18 28, 28 22, 40 22 C 40 34, 32 42, 22 44 Z"
        fill={pill ? "#FAF7F2" : "#FAF7F2"}
        opacity="0.18"
      />
      {/* House silhouette */}
      <path
        d="M20 46 L20 32 L32 22 L44 32 L44 46 Z"
        fill="none"
        stroke={pill ? "#FAF7F2" : "#FAF7F2"}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Chimney of warmth — small terracotta stroke */}
      <rect
        x="37"
        y="26"
        width="4"
        height="5"
        rx="1"
        fill="#D9813C"
      />
      {/* Window as a warm dot */}
      <circle cx="32" cy="40" r="2.5" fill="#E8B647" />
    </svg>
  );
}
