export function Logo({ className = "h-7" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon className="h-full w-auto" />
      <span className="font-bold text-lg leading-none tracking-tight" style={{ color: "var(--wap-primary)" }}>
        whoamipaying.co.uk
      </span>
    </div>
  );
}

export function LogoIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WhoAmIPaying logo"
    >
      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="var(--wap-primary, #0F172A)" />
      {/* £ symbol */}
      <text
        x="10"
        y="30"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="var(--wap-secondary, #14B8A6)"
      >
        £
      </text>
      {/* ? symbol overlapping */}
      <text
        x="20"
        y="32"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="28"
        fill="var(--wap-secondary, #14B8A6)"
      >
        ?
      </text>
    </svg>
  );
}
