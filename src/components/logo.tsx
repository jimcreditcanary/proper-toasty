const SIZES = {
  sm: { mark: 32, text: "text-base", gap: "gap-2" },
  md: { mark: 48, text: "text-xl", gap: "gap-2.5" },
  lg: { mark: 60, text: "text-2xl", gap: "gap-3" },
  xl: { mark: 80, text: "text-3xl", gap: "gap-3.5" },
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
          className={`font-[var(--font-heading)] font-bold ${s.text} leading-none tracking-[-0.03em] ${wordColor}`}
          style={{ fontFamily: "var(--font-heading), system-ui, sans-serif" }}
        >
          whoamipaying<span className="text-coral">?</span>
        </span>
        {showTagline && (
          <span
            className={`text-[11px] font-light mt-0.5 ${tagColor}`}
            style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
          >
            verify before you pay
          </span>
        )}
      </div>
    </div>
  );

  if (variant === "pill") {
    return (
      <div
        className={`inline-flex items-center bg-coral rounded-[100px] px-4 py-2 ${className}`}
      >
        <div className={`flex items-center ${s.gap}`}>
          <LogoIcon size={size} pill />
          <div className="flex flex-col">
            <span
              className={`font-bold ${s.text} leading-none tracking-[-0.03em] text-white`}
              style={{ fontFamily: "var(--font-heading), system-ui, sans-serif" }}
            >
              whoamipaying<span className="text-white/70">?</span>
            </span>
            {showTagline && (
              <span
                className="text-[11px] font-light mt-0.5 text-white/70"
                style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
              >
                verify before you pay
              </span>
            )}
          </div>
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
  const radius = Math.round(markPx * 0.3);

  return (
    <svg
      width={markPx}
      height={markPx}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WhoAmIPaying logo mark"
      style={
        pill
          ? undefined
          : { filter: "drop-shadow(0 8px 24px rgba(255,92,53,0.4))" }
      }
    >
      {/* Coral rounded square */}
      <rect
        width="80"
        height="80"
        rx={radius}
        fill={pill ? "transparent" : "#FF5C35"}
      />

      {/* Person head */}
      <circle cx="40" cy="24" r="7" fill="white" />

      {/* Shoulders arc */}
      <path
        d="M24 46 C24 36, 56 36, 56 46"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Magnifying glass lens */}
      <circle
        cx="40"
        cy="38"
        r="18"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
      />

      {/* Handle — extending bottom-right at 45deg */}
      <line
        x1="53"
        y1="51"
        x2="66"
        y2="64"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Yellow dot at handle tip */}
      <circle cx="66" cy="64" r="4" fill="#FFCC00" />
    </svg>
  );
}
