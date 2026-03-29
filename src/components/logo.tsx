export function Logo({ className = "h-6" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className="h-full w-auto" />
      <span className="font-bold text-lg leading-none tracking-tight">
        WhoAmIPaying
      </span>
    </div>
  );
}

export function LogoIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WhoAmIPaying logo"
    >
      {/* Shield outline */}
      <path
        d="M14 1L2 6v10c0 8.5 5.1 14.3 12 16 6.9-1.7 12-7.5 12-16V6L14 1z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M14 1L2 6v10c0 8.5 5.1 14.3 12 16 6.9-1.7 12-7.5 12-16V6L14 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Checkmark */}
      <path
        d="M9 16l4 4 7-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
